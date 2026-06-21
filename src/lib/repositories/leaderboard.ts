import { and, desc, eq, inArray, sql } from "drizzle-orm";
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

const now = () => new Date();

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
      testCaseCount: sql<number>`count(${testCases.id})`,
    })
    .from(categories)
    .leftJoin(testCases, eq(testCases.categoryId, categories.id))
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

  return db.query.testCases.findMany({
    where,
    orderBy: desc(testCases.createdAt),
    with: {
      category: true,
      assets: true,
      outputs: true,
    },
  });
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
  scorePromptMatch: number;
  scoreReference: number;
  scoreMotion: number;
  scoreAudioSync: number;
  scoreOverall: number;
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

  return db.query.modelOutputs.findMany({
    where: clauses.length ? and(...clauses) : undefined,
    orderBy: desc(modelOutputs.scoreOverall),
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
}

export async function findFileRecord(storageKey: string) {
  const [asset] = await db
    .select({
      storageKey: testCaseAssets.storageKey,
      accessPath: testCaseAssets.accessPath,
      mimeType: testCaseAssets.mimeType,
      filename: testCaseAssets.filename,
    })
    .from(testCaseAssets)
    .where(eq(testCaseAssets.storageKey, storageKey))
    .limit(1);

  if (asset) return asset;

  const [output] = await db
    .select({
      storageKey: modelOutputs.videoStorageKey,
      accessPath: modelOutputs.videoAccessPath,
      mimeType: modelOutputs.videoMimeType,
      filename: modelOutputs.videoFilename,
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
