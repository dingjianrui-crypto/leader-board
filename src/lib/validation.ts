import { z } from "zod";
import { MAX_UPLOAD_BYTES } from "@/lib/config";

export const providerInputSchema = z.object({
  name: z.string().trim().min(1, "Provider name is required"),
});

export const modelInputSchema = z.object({
  providerId: z.string().min(1, "Provider is required"),
  name: z.string().trim().min(1, "Model name is required"),
  version: z.string().trim().min(1, "Version is required"),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
  description: z.string().trim().min(1, "Category description is required"),
});

export const testCaseInputSchema = z.object({
  title: z.string().trim().min(1, "Test case title is required"),
  categoryId: z.string().min(1, "Category is required"),
  prompt: z.string().trim().min(1, "Prompt is required"),
  description: z.string().trim().min(1, "Description is required"),
});

export const gsbValues = ["best", "samebest", "normal", "samenormal", "worst", "sameworst"] as const;

export const modelOutputInputSchema = z.object({
  testCaseId: z.string().min(1, "Test case is required"),
  modelId: z.string().min(1, "Model is required"),
  gsbValue: z.enum(gsbValues),
  userComments: z.string().trim().max(1000, "Comments must be 1000 characters or fewer").default(""),
});

export const referenceExtensions = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "mp4",
  "mov",
  "webm",
  "wav",
  "mp3",
  "m4a",
]);

export const outputVideoExtensions = new Set(["mp4", "mov", "webm"]);

export function getExtension(filename: string) {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

export function getAssetType(filename: string) {
  const extension = getExtension(filename);
  if (["png", "jpg", "jpeg", "webp"].includes(extension)) return "image";
  if (["mp4", "mov", "webm"].includes(extension)) return "video";
  if (["wav", "mp3", "m4a"].includes(extension)) return "audio";
  return "file";
}

export function validateUpload(file: File, allowedExtensions: Set<string>) {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Each uploaded file must be 50MB or smaller.");
  }

  const extension = getExtension(file.name);
  if (!allowedExtensions.has(extension)) {
    throw new Error(`Unsupported file type: .${extension || "unknown"}`);
  }
}
