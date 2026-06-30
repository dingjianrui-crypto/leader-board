import { NextRequest, NextResponse } from "next/server";
import { jsonError, redirectSeeOther } from "@/lib/http";
import { createModelOutput, listModelOutputs } from "@/lib/repositories/leaderboard";
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
      gsbValue: getString(formData, "gsbValue"),
      userComments: getString(formData, "userComments"),
    });
    const file = formData.get("video");
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Output video is required.");
    }
    validateUpload(file, outputVideoExtensions);

    const storageAdapter = await storage;
    const stored = await storageAdapter.save({
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
        gsbValue: input.gsbValue,
        userComments: input.userComments,
      });
      const accept = request.headers.get("accept") ?? "";
      if (accept.includes("text/html")) {
        return redirectSeeOther("/admin");
      }
      return NextResponse.json({ id }, { status: 201 });
    } catch (error) {
      await storageAdapter.delete(stored.storageKey);
      throw error;
    }
  } catch (error) {
    return jsonError(error);
  }
}
