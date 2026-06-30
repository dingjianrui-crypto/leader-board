"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  categoryInputSchema,
  getAssetType,
  modelInputSchema,
  modelOutputInputSchema,
  outputVideoExtensions,
  providerInputSchema,
  referenceExtensions,
  testCaseInputSchema,
  validateUpload,
} from "@/lib/validation";
import {
  createCategory,
  createModel,
  createModelOutput,
  createProvider,
  createTestCase,
  createTestCaseAsset,
  deleteCategory,
  deleteModel,
  deleteModelOutput,
  deleteProvider,
  deleteTestCase,
  updateModelOutput,
  updateTestCase,
} from "@/lib/repositories/leaderboard";
import { getStorageAdapter, storage } from "@/lib/storage";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getFiles(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is File => value instanceof File && value.size > 0);
}

function revalidateLeaderboardViews() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/compare");
}

export async function createProviderAction(formData: FormData) {
  const input = providerInputSchema.parse({
    name: getString(formData, "name"),
  });
  await createProvider(input);
  revalidatePath("/providers");
}

export async function createModelAction(formData: FormData) {
  const input = modelInputSchema.parse({
    providerId: getString(formData, "providerId"),
    name: getString(formData, "name"),
    version: getString(formData, "version"),
  });
  await createModel(input);
  revalidatePath("/providers");
  revalidateLeaderboardViews();
}

export async function deleteProviderAction(formData: FormData) {
  await deleteProvider(getString(formData, "providerId"));
  revalidatePath("/providers");
  revalidateLeaderboardViews();
}

export async function deleteModelAction(formData: FormData) {
  await deleteModel(getString(formData, "modelId"));
  revalidatePath("/providers");
  revalidateLeaderboardViews();
}

export async function createCategoryAction(formData: FormData) {
  const input = categoryInputSchema.parse({
    name: getString(formData, "name"),
    description: getString(formData, "description"),
  });
  await createCategory(input);
  revalidateLeaderboardViews();
}

export async function deleteCategoryAction(formData: FormData) {
  await deleteCategory(getString(formData, "categoryId"));
  revalidateLeaderboardViews();
}

export async function createTestCaseAction(formData: FormData) {
  const input = testCaseInputSchema.parse({
    title: getString(formData, "title"),
    categoryId: getString(formData, "categoryId"),
    prompt: getString(formData, "prompt"),
    description: getString(formData, "description"),
  });
  const testCaseId = await createTestCase(input);
  const storageAdapter = await storage;

  for (const file of getFiles(formData, "assets")) {
    validateUpload(file, referenceExtensions);
    const stored = await storageAdapter.save({
      scope: "test-case-asset",
      ownerId: testCaseId,
      file,
    });
    try {
      await createTestCaseAsset({
        testCaseId,
        assetType: getAssetType(file.name),
        filename: stored.filename,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        storageProvider: stored.storageProvider,
        storageKey: stored.storageKey,
        accessPath: stored.accessPath,
      });
    } catch (error) {
      await storageAdapter.delete(stored.storageKey);
      throw error;
    }
  }

  revalidateLeaderboardViews();
  redirect("/admin");
}

export async function deleteTestCaseAction(formData: FormData) {
  const storageKeys = await deleteTestCase(getString(formData, "testCaseId"));
  const storageAdapter = await storage;
  await Promise.all(storageKeys.map((storageKey) => storageAdapter.delete(storageKey)));
  revalidateLeaderboardViews();
}

export async function createModelOutputAction(formData: FormData) {
  const input = modelOutputInputSchema.parse({
    testCaseId: getString(formData, "testCaseId"),
    modelId: getString(formData, "modelId"),
    gsbValue: getString(formData, "gsbValue"),
    userComments: getString(formData, "userComments"),
  });
  const [file] = getFiles(formData, "video");
  if (!file) {
    throw new Error("Output video is required.");
  }
  validateUpload(file, outputVideoExtensions);

  const ownerId = `${input.testCaseId}-${input.modelId}`;
  const storageAdapter = await storage;
  const stored = await storageAdapter.save({
    scope: "model-output",
    ownerId,
    file,
  });

  try {
    await createModelOutput({
      testCaseId: input.testCaseId,
      modelId: input.modelId,
      videoFilename: stored.filename,
      videoMimeType: stored.mimeType,
      videoSizeBytes: stored.sizeBytes,
      videoStorageProvider: stored.storageProvider,
      videoStorageKey: stored.storageKey,
      videoAccessPath: stored.accessPath,
      gsbValue: input.gsbValue,
      userComments: input.userComments,
    });
  } catch (error) {
    await storageAdapter.delete(stored.storageKey);
    throw error;
  }

  revalidateLeaderboardViews();
  redirect("/admin");
}

export async function deleteModelOutputAction(formData: FormData) {
  const storageKey = await deleteModelOutput(getString(formData, "outputId"));
  const storageAdapter = await storage;
  await storageAdapter.delete(storageKey);
  revalidateLeaderboardViews();
  revalidatePath("/providers");
}

export async function updateTestCaseAction(formData: FormData) {
  const id = getString(formData, "testCaseId");
  const input = testCaseInputSchema.parse({
    title: getString(formData, "title"),
    categoryId: getString(formData, "categoryId"),
    prompt: getString(formData, "prompt"),
    description: getString(formData, "description"),
  });

  await updateTestCase({ id, ...input });

  const storageAdapter = await storage;
  for (const file of getFiles(formData, "assets")) {
    validateUpload(file, referenceExtensions);
    const stored = await storageAdapter.save({
      scope: "test-case-asset",
      ownerId: id,
      file,
    });
    try {
      await createTestCaseAsset({
        testCaseId: id,
        assetType: getAssetType(file.name),
        filename: stored.filename,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        storageProvider: stored.storageProvider,
        storageKey: stored.storageKey,
        accessPath: stored.accessPath,
      });
    } catch (error) {
      await storageAdapter.delete(stored.storageKey);
      throw error;
    }
  }

  revalidateLeaderboardViews();
  redirect("/admin");
}

export async function updateModelOutputAction(formData: FormData) {
  const outputId = getString(formData, "outputId");
  const input = modelOutputInputSchema.parse({
    testCaseId: getString(formData, "testCaseId"),
    modelId: getString(formData, "modelId"),
    gsbValue: getString(formData, "gsbValue"),
    userComments: getString(formData, "userComments"),
  });

  const [file] = getFiles(formData, "video");
  const storageAdapter = await storage;
  let stored:
    | {
        filename: string;
        mimeType: string;
        sizeBytes: number;
        storageProvider: string;
        storageKey: string;
        accessPath: string;
      }
    | undefined;

  if (file) {
    validateUpload(file, outputVideoExtensions);
    stored = await storageAdapter.save({
      scope: "model-output",
      ownerId: `${input.testCaseId}-${input.modelId}`,
      file,
    });
  }

  try {
    const oldFile = await updateModelOutput({
      id: outputId,
      testCaseId: input.testCaseId,
      modelId: input.modelId,
      gsbValue: input.gsbValue,
      userComments: input.userComments,
      videoFile: stored
        ? {
            videoFilename: stored.filename,
            videoMimeType: stored.mimeType,
            videoSizeBytes: stored.sizeBytes,
            videoStorageProvider: stored.storageProvider,
            videoStorageKey: stored.storageKey,
            videoAccessPath: stored.accessPath,
          }
        : undefined,
    });

    if (oldFile) {
      const oldStorageAdapter = await getStorageAdapter(oldFile.storageProvider);
      await oldStorageAdapter.delete(oldFile.storageKey);
    }
  } catch (error) {
    if (stored) {
      await storageAdapter.delete(stored.storageKey);
    }
    throw error;
  }

  revalidateLeaderboardViews();
  revalidatePath("/providers");
  redirect("/admin");
}
