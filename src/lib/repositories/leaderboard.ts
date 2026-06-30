import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { TOS_BUCKET, TOS_ENDPOINT, TOS_PUBLIC_BASE_URL } from "@/lib/config";
import { db } from "@/lib/db";
import {
  categories,
  modelOutputs,
  models,
  providers,
  testCaseAssets,
  testCases,
} from "@/lib/db/schema";
import { createId } from "@/lib/ids";
import { publicTosObjectUrl } from "@/lib/storage/urls";

const now = () => new Date();
const goodGsbValues = new Set(["best", "samebest"]);
const badGsbValues = new Set(["worst", "sameworst"]);

function publicAccessPath(file: {
  storageProvider?: string;
  storageKey: string;
  accessPath: string;
}) {
  if (file.storageProvider !== "object_store" || !TOS_BUCKET || !TOS_ENDPOINT) {
    return file.accessPath;
  }

  return publicTosObjectUrl({
    bucket: TOS_BUCKET,
    endpoint: TOS_ENDPOINT,
    storageKey: file.storageKey,
    publicBaseUrl: TOS_PUBLIC_BASE_URL,
  });
}

export async function listProvidersWithModels() {
  return db.query.providers.findMany({
    orderBy: providers.name,
    with: {
      models: {
        orderBy: [models.name, models.version],
        with: {
          outputs: true,
        },
      },
    },
  });
}

export async function createProvider(input: { name: string }) {
  const id = createId("provider");
  await db.insert(providers).values({
    id,
    name: input.name,
    createdAt: now(),
    updatedAt: now(),
  });
  return id;
}

export async function deleteProvider(providerId: string) {
  const [modelCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(models)
    .where(eq(models.providerId, providerId));

  if (modelCount.count > 0) {
    throw new Error("Cannot delete provider while it still has models.");
  }

  await db.delete(providers).where(eq(providers.id, providerId));
}

export async function createModel(input: {
  providerId: string;
  name: string;
  version: string;
}) {
  const id = createId("model");
  await db.insert(models).values({
    id,
    providerId: input.providerId,
    name: input.name,
    version: input.version,
    createdAt: now(),
    updatedAt: now(),
  });
  return id;
}

export async function deleteModel(modelId: string) {
  const [outputCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(modelOutputs)
    .where(eq(modelOutputs.modelId, modelId));

  if (outputCount.count > 0) {
    throw new Error("Cannot delete model while it has uploaded outputs.");
  }

  await db.delete(models).where(eq(models.id, modelId));
}

export async function listCategories() {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      description: categories.description,
      testCaseCount: sql<number>`count(distinct ${testCases.id})`,
      goodOutputCount: sql<number>`sum(case when ${modelOutputs.gsbValue} in ('best', 'samebest') then 1 else 0 end)`,
      badOutputCount: sql<number>`sum(case when ${modelOutputs.gsbValue} in ('worst', 'sameworst') then 1 else 0 end)`,
    })
    .from(categories)
    .leftJoin(testCases, eq(testCases.categoryId, categories.id))
    .leftJoin(modelOutputs, eq(modelOutputs.testCaseId, testCases.id))
    .groupBy(categories.id)
    .orderBy(categories.name);
}

export async function createCategory(input: { name: string; description: string }) {
  const id = createId("category");
  await db.insert(categories).values({
    id,
    name: input.name,
    description: input.description,
    createdAt: now(),
    updatedAt: now(),
  });
  return id;
}

export async function deleteCategory(categoryId: string) {
  const [testCaseCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(testCases)
    .where(eq(testCases.categoryId, categoryId));

  if (testCaseCount.count > 0) {
    throw new Error("Cannot delete category while it still has test cases.");
  }

  await db.delete(categories).where(eq(categories.id, categoryId));
}

export async function listTestCases(filters?: { categoryIds?: string[] }) {
  const where =
    filters?.categoryIds?.length ? inArray(testCases.categoryId, filters.categoryIds) : undefined;

  const rows = await db.query.testCases.findMany({
    where,
    orderBy: desc(testCases.createdAt),
    with: {
      category: true,
      assets: true,
      outputs: true,
    },
  });

  return rows.map((testCase) => ({
    ...testCase,
    assets: testCase.assets.map((asset) => ({
      ...asset,
      accessPath: publicAccessPath(asset),
    })),
  }));
}

export async function createTestCase(input: {
  title: string;
  categoryId: string;
  prompt: string;
  description: string;
}) {
  const id = createId("case");
  await db.insert(testCases).values({
    id,
    title: input.title,
    categoryId: input.categoryId,
    prompt: input.prompt,
    description: input.description,
    createdAt: now(),
    updatedAt: now(),
  });
  return id;
}

export async function updateTestCase(input: {
  id: string;
  title: string;
  categoryId: string;
  prompt: string;
  description: string;
}) {
  await db
    .update(testCases)
    .set({
      title: input.title,
      categoryId: input.categoryId,
      prompt: input.prompt,
      description: input.description,
      updatedAt: now(),
    })
    .where(eq(testCases.id, input.id));
}

export async function createTestCaseAsset(input: {
  testCaseId: string;
  assetType: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageProvider: string;
  storageKey: string;
  accessPath: string;
}) {
  const id = createId("asset");
  await db.insert(testCaseAssets).values({
    id,
    ...input,
    createdAt: now(),
  });
  return id;
}

export async function deleteTestCase(testCaseId: string) {
  const assetKeys = await db
    .select({ storageKey: testCaseAssets.storageKey })
    .from(testCaseAssets)
    .where(eq(testCaseAssets.testCaseId, testCaseId));
  const outputKeys = await db
    .select({ storageKey: modelOutputs.videoStorageKey })
    .from(modelOutputs)
    .where(eq(modelOutputs.testCaseId, testCaseId));

  await db.delete(testCases).where(eq(testCases.id, testCaseId));

  return [...assetKeys, ...outputKeys].map((item) => item.storageKey);
}

export async function createModelOutput(input: {
  testCaseId: string;
  modelId: string;
  videoFilename: string;
  videoMimeType: string;
  videoSizeBytes: number;
  videoStorageProvider: string;
  videoStorageKey: string;
  videoAccessPath: string;
  gsbValue: string;
  userComments: string;
}) {
  const id = createId("output");
  await db.insert(modelOutputs).values({
    id,
    ...input,
    createdAt: now(),
    updatedAt: now(),
  });
  return id;
}

export async function updateModelOutput(input: {
  id: string;
  testCaseId: string;
  modelId: string;
  gsbValue: string;
  userComments: string;
  videoFile?: {
    videoFilename: string;
    videoMimeType: string;
    videoSizeBytes: number;
    videoStorageProvider: string;
    videoStorageKey: string;
    videoAccessPath: string;
  };
}) {
  const [existing] = await db
    .select({
      storageProvider: modelOutputs.videoStorageProvider,
      storageKey: modelOutputs.videoStorageKey,
    })
    .from(modelOutputs)
    .where(eq(modelOutputs.id, input.id))
    .limit(1);

  if (!existing) {
    throw new Error("Model output was not found.");
  }

  await db
    .update(modelOutputs)
    .set({
      testCaseId: input.testCaseId,
      modelId: input.modelId,
      gsbValue: input.gsbValue,
      userComments: input.userComments,
      ...(input.videoFile ?? {}),
      updatedAt: now(),
    })
    .where(eq(modelOutputs.id, input.id));

  return input.videoFile ? existing : null;
}

export async function deleteModelOutput(outputId: string) {
  const [output] = await db
    .select({ storageKey: modelOutputs.videoStorageKey })
    .from(modelOutputs)
    .where(eq(modelOutputs.id, outputId))
    .limit(1);

  if (!output) {
    throw new Error("Model output was not found.");
  }

  await db.delete(modelOutputs).where(eq(modelOutputs.id, outputId));
  return output.storageKey;
}

export async function listModelOutputs(filters?: {
  testCaseId?: string;
  modelIds?: string[];
}) {
  const clauses = [];
  if (filters?.testCaseId) clauses.push(eq(modelOutputs.testCaseId, filters.testCaseId));
  if (filters?.modelIds?.length) clauses.push(inArray(modelOutputs.modelId, filters.modelIds));

  const rows = await db.query.modelOutputs.findMany({
    where: clauses.length ? and(...clauses) : undefined,
    orderBy: [
      sql`case ${modelOutputs.gsbValue}
        when 'best' then 1
        when 'samebest' then 2
        when 'normal' then 3
        when 'samenormal' then 4
        when 'sameworst' then 5
        when 'worst' then 6
        else 7
      end`,
      desc(modelOutputs.createdAt),
    ],
    with: {
      model: {
        with: {
          provider: true,
        },
      },
      testCase: {
        with: {
          category: true,
          assets: true,
        },
      },
    },
  });

  return rows.map((output) => ({
    ...output,
    videoAccessPath: publicAccessPath({
      storageProvider: output.videoStorageProvider,
      storageKey: output.videoStorageKey,
      accessPath: output.videoAccessPath,
    }),
    testCase: {
      ...output.testCase,
      assets: output.testCase.assets.map((asset) => ({
        ...asset,
        accessPath: publicAccessPath(asset),
      })),
    },
  }));
}

export async function findFileRecord(storageKey: string) {
  const [asset] = await db
    .select({
      storageProvider: testCaseAssets.storageProvider,
      storageKey: testCaseAssets.storageKey,
      accessPath: testCaseAssets.accessPath,
      mimeType: testCaseAssets.mimeType,
      filename: testCaseAssets.filename,
      sizeBytes: testCaseAssets.sizeBytes,
    })
    .from(testCaseAssets)
    .where(eq(testCaseAssets.storageKey, storageKey))
    .limit(1);

  if (asset) return asset;

  const [output] = await db
    .select({
      storageProvider: modelOutputs.videoStorageProvider,
      storageKey: modelOutputs.videoStorageKey,
      accessPath: modelOutputs.videoAccessPath,
      mimeType: modelOutputs.videoMimeType,
      filename: modelOutputs.videoFilename,
      sizeBytes: modelOutputs.videoSizeBytes,
    })
    .from(modelOutputs)
    .where(eq(modelOutputs.videoStorageKey, storageKey))
    .limit(1);

  return output ?? null;
}

export async function getSummaryCounts() {
  const [testCaseCount] = await db.select({ count: sql<number>`count(*)` }).from(testCases);
  const [outputCount] = await db.select({ count: sql<number>`count(*)` }).from(modelOutputs);
  const [modelCount] = await db.select({ count: sql<number>`count(*)` }).from(models);

  return {
    testCases: testCaseCount.count,
    modelOutputs: outputCount.count,
    providerModels: modelCount.count,
  };
}

export function summarizeGsbValue(gsbValue: string) {
  if (goodGsbValues.has(gsbValue)) return "Good";
  if (badGsbValues.has(gsbValue)) return "Bad";
  return "Normal";
}

export async function getGsbMatrix() {
  const [categoryRows, providerRows, outputRows] = await Promise.all([
    listCategories(),
    listProvidersWithModels(),
    listModelOutputs(),
  ]);

  const modelRows = providerRows.flatMap((provider) =>
    provider.models.map((model) => ({
      id: model.id,
      name: model.name,
      version: model.version,
      providerName: provider.name,
    })),
  );

  const cells = new Map<
    string,
    {
      good: number;
      bad: number;
      total: number;
    }
  >();

  for (const output of outputRows) {
    const categoryId = output.testCase.categoryId;
    const key = `${output.modelId}:${categoryId}`;
    const cell = cells.get(key) ?? { good: 0, bad: 0, total: 0 };
    cell.total += 1;
    if (goodGsbValues.has(output.gsbValue)) cell.good += 1;
    if (badGsbValues.has(output.gsbValue)) cell.bad += 1;
    cells.set(key, cell);
  }

  return {
    categories: categoryRows.map((category) => ({
      id: category.id,
      name: category.name,
    })),
    models: modelRows.map((model) => ({
      ...model,
      cells: Object.fromEntries(
        categoryRows.map((category) => {
          const counts = cells.get(`${model.id}:${category.id}`);
          return [
            category.id,
            counts
              ? {
                  ...counts,
                  value: counts.total === 0 ? null : (counts.good - counts.bad) / counts.total,
                }
              : {
                  good: 0,
                  bad: 0,
                  total: 0,
                  value: null,
                },
          ];
        }),
      ),
    })),
  };
}
