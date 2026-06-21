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
} from "@/lib/repositories/leaderboard";
import { storage } from "@/lib/storage";
import { computeOverallScore } from "@/lib/scoring";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getFiles(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is File => value instanceof File && value.size > 0);
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
  revalidatePath("/compare");
  revalidatePath("/admin");
}

export async function deleteProviderAction(formData: FormData) {
  await deleteProvider(getString(formData, "providerId"));
  revalidatePath("/providers");
  revalidatePath("/compare");
  revalidatePath("/admin");
}

export async function deleteModelAction(formData: FormData) {
  await deleteModel(getString(formData, "modelId"));
  revalidatePath("/providers");
  revalidatePath("/compare");
  revalidatePath("/admin");
}

export async function createCategoryAction(formData: FormData) {
  const input = categoryInputSchema.parse({
    name: getString(formData, "name"),
    description: getString(formData, "description"),
  });
  await createCategory(input);
  revalidatePath("/admin");
  revalidatePath("/compare");
}

export async function deleteCategoryAction(formData: FormData) {
  await deleteCategory(getString(formData, "categoryId"));
  revalidatePath("/admin");
  revalidatePath("/compare");
}

export async function createTestCaseAction(formData: FormData) {
  const input = testCaseInputSchema.parse({
    title: getString(formData, "title"),
    categoryId: getString(formData, "categoryId"),
    prompt: getString(formData, "prompt"),
    description: getString(formData, "description"),
  });
  const testCaseId = await createTestCase(input);

  for (const file of getFiles(formData, "assets")) {
    validateUpload(file, referenceExtensions);
    const stored = await storage.save({
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
      await storage.delete(stored.storageKey);
      throw error;
    }
  }

  revalidatePath("/admin");
  revalidatePath("/compare");
  redirect(`/compare?case=${testCaseId}`);
}

export async function deleteTestCaseAction(formData: FormData) {
  const storageKeys = await deleteTestCase(getString(formData, "testCaseId"));
  await Promise.all(storageKeys.map((storageKey) => storage.delete(storageKey)));
  revalidatePath("/admin");
  revalidatePath("/compare");
}

export async function createModelOutputAction(formData: FormData) {
  const input = modelOutputInputSchema.parse({
    testCaseId: getString(formData, "testCaseId"),
    modelId: getString(formData, "modelId"),
    scorePromptMatch: getString(formData, "scorePromptMatch"),
    scoreReference: getString(formData, "scoreReference"),
    scoreMotion: getString(formData, "scoreMotion"),
    scoreAudioSync: getString(formData, "scoreAudioSync"),
  });
  const [file] = getFiles(formData, "video");
  if (!file) {
    throw new Error("Output video is required.");
  }
  validateUpload(file, outputVideoExtensions);

  const ownerId = `${input.testCaseId}-${input.modelId}`;
  const stored = await storage.save({
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
      scorePromptMatch: input.scorePromptMatch,
      scoreReference: input.scoreReference,
      scoreMotion: input.scoreMotion,
      scoreAudioSync: input.scoreAudioSync,
      scoreOverall: computeOverallScore([
        input.scorePromptMatch,
        input.scoreReference,
        input.scoreMotion,
        input.scoreAudioSync,
      ]),
    });
  } catch (error) {
    await storage.delete(stored.storageKey);
    throw error;
  }

  revalidatePath("/admin");
  revalidatePath("/compare");
  redirect(`/compare?case=${input.testCaseId}`);
}

export async function deleteModelOutputAction(formData: FormData) {
  const storageKey = await deleteModelOutput(getString(formData, "outputId"));
  await storage.delete(storageKey);
  revalidatePath("/admin");
  revalidatePath("/compare");
  revalidatePath("/providers");
}
