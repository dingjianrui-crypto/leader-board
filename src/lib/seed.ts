import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, modelOutputs, models, providers, testCaseAssets, testCases } from "@/lib/db/schema";

const now = () => new Date();

export async function ensureSeedData() {
  const existing = await db.query.providers.findFirst();
  if (existing) return;

  await db.insert(providers).values([
    { id: "provider_a", name: "Provider A", createdAt: now(), updatedAt: now() },
    { id: "provider_b", name: "Provider B", createdAt: now(), updatedAt: now() },
    { id: "provider_c", name: "Provider C", createdAt: now(), updatedAt: now() },
    { id: "provider_d", name: "Provider D", createdAt: now(), updatedAt: now() },
  ]);

  await db.insert(models).values([
    { id: "model_a_1", providerId: "provider_a", name: "Model A-1", version: "2026.05", createdAt: now(), updatedAt: now() },
    { id: "model_a_2", providerId: "provider_a", name: "Model A-2", version: "2026.06", createdAt: now(), updatedAt: now() },
    { id: "model_b_2", providerId: "provider_b", name: "Model B-2", version: "2026.04", createdAt: now(), updatedAt: now() },
    { id: "model_c_1", providerId: "provider_c", name: "Model C-1", version: "2026.03", createdAt: now(), updatedAt: now() },
    { id: "model_d_1", providerId: "provider_d", name: "Model D-1", version: "2026.02", createdAt: now(), updatedAt: now() },
  ]);

  await db.insert(categories).values([
    {
      id: "category_image",
      name: "Image reference",
      description: "Measures how well outputs preserve visual identity, composition, and referenced objects from still images.",
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: "category_video",
      name: "Video reference",
      description: "Evaluates temporal consistency, subject motion, and transformation from supplied source clips.",
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: "category_audio",
      name: "Audio driven",
      description: "Checks whether motion, timing, and scene energy align to the provided audio track.",
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: "category_prompt",
      name: "Prompt only",
      description: "Text-only generation tests where the model must infer scene structure, movement, and continuity from the prompt alone.",
      createdAt: now(),
      updatedAt: now(),
    },
  ]);

  await db.insert(testCases).values([
    {
      id: "case_studio_dolly",
      title: "Studio dolly shot with product reveal",
      categoryId: "category_image",
      prompt: "A controlled studio dolly shot moving past a reflective product plinth, ending on a clean reveal with soft rim light and no camera shake.",
      description: "Checks camera stability, physical consistency of reflections, and whether the final frame preserves the product silhouette from the reference image.",
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: "case_walk_cycle",
      title: "Character walk cycle from source clip",
      categoryId: "category_video",
      prompt: "Use the source clip to preserve stride timing and body proportions while generating a clean side-angle walk cycle through a bright indoor corridor.",
      description: "Checks source-video consistency, character proportions, and motion continuity.",
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: "case_city_flythrough",
      title: "Music-synced city flythrough",
      categoryId: "category_audio",
      prompt: "Generate a night city flythrough where building light pulses follow the supplied beat track while camera movement stays smooth and forward-facing.",
      description: "Checks whether motion rhythm and visual energy follow the supplied beat track.",
      createdAt: now(),
      updatedAt: now(),
    },
  ]);

  await db.insert(testCaseAssets).values([
    asset("asset_front", "case_studio_dolly", "image", "reference-front.png"),
    asset("asset_lighting", "case_studio_dolly", "image", "lighting-board.png"),
    asset("asset_walk", "case_walk_cycle", "video", "source-walk.mp4"),
    asset("asset_beat", "case_city_flythrough", "audio", "beat-track.wav"),
  ]);

  await db.insert(modelOutputs).values([
    output("output_a", "case_studio_dolly", "model_a_1", "provider-a-dolly.mp4", 9.4, 9.0, 8.8, 9.2),
    output("output_b", "case_studio_dolly", "model_b_2", "provider-b-dolly.mp4", 8.8, 8.4, 8.7, 8.5),
    output("output_c", "case_studio_dolly", "model_c_1", "provider-c-dolly.mp4", 8.1, 7.6, 8.2, 7.8),
    output("output_d", "case_studio_dolly", "model_d_1", "provider-d-dolly.mp4", 7.6, 7.2, 7.4, 7.0),
  ]);
}

function asset(id: string, testCaseId: string, assetType: string, filename: string) {
  return {
    id,
    testCaseId,
    assetType,
    filename,
    mimeType: assetType === "image" ? "image/png" : assetType === "audio" ? "audio/wav" : "video/mp4",
    sizeBytes: 0,
    storageProvider: "local",
    storageKey: `seed/${filename}`,
    accessPath: "#",
    createdAt: now(),
  };
}

function output(
  id: string,
  testCaseId: string,
  modelId: string,
  filename: string,
  prompt: number,
  reference: number,
  motion: number,
  audio: number,
) {
  const overall = Math.round(((prompt + reference + motion + audio) / 4) * 10) / 10;
  return {
    id,
    testCaseId,
    modelId,
    videoFilename: filename,
    videoMimeType: "video/mp4",
    videoSizeBytes: 0,
    videoStorageProvider: "local",
    videoStorageKey: `seed/${filename}`,
    videoAccessPath: "#",
    scorePromptMatch: prompt,
    scoreReference: reference,
    scoreMotion: motion,
    scoreAudioSync: audio,
    scoreOverall: overall,
    createdAt: now(),
    updatedAt: now(),
  };
}

export async function clearSeedData() {
  await db.delete(modelOutputs).where(eq(modelOutputs.videoStorageProvider, "local"));
  await db.delete(testCaseAssets).where(eq(testCaseAssets.storageProvider, "local"));
}
