import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { createModelOutput, listModelOutputs } from "@/lib/repositories/leaderboard";
import { computeOverallScore } from "@/lib/scoring";
import { storage } from "@/lib/storage";
import { modelOutputInputSchema, outputVideoExtensions, validateUpload } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function GET() {
  return NextResponse.json(await listModelOutputs());
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const input = modelOutputInputSchema.parse({
      testCaseId: getString(formData, "testCaseId"),
      modelId: getString(formData, "modelId"),
      scorePromptMatch: getString(formData, "scorePromptMatch"),
      scoreReference: getString(formData, "scoreReference"),
      scoreMotion: getString(formData, "scoreMotion"),
      scoreAudioSync: getString(formData, "scoreAudioSync"),
    });
    const file = formData.get("video");
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Output video is required.");
    }
    validateUpload(file, outputVideoExtensions);

    const stored = await storage.save({
      scope: "model-output",
      ownerId: `${input.testCaseId}-${input.modelId}`,
      file,
    });

    try {
      const id = await createModelOutput({
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
      const accept = request.headers.get("accept") ?? "";
      if (accept.includes("text/html")) {
        return NextResponse.redirect(new URL(`/compare?case=${input.testCaseId}`, request.url), 303);
      }
      return NextResponse.json({ id }, { status: 201 });
    } catch (error) {
      await storage.delete(stored.storageKey);
      throw error;
    }
  } catch (error) {
    return jsonError(error);
  }
}
