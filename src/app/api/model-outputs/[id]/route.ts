import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { deleteModelOutput, updateModelOutput } from "@/lib/repositories/leaderboard";
import { getStorageAdapter, storage } from "@/lib/storage";
import { modelOutputInputSchema, outputVideoExtensions, validateUpload } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const storageKey = await deleteModelOutput(id);
    const storageAdapter = await storage;
    await storageAdapter.delete(storageKey);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const input = modelOutputInputSchema.parse({
      testCaseId: getString(formData, "testCaseId"),
      modelId: getString(formData, "modelId"),
      gsbValue: getString(formData, "gsbValue"),
      userComments: getString(formData, "userComments"),
    });

    const file = formData.get("video");
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

    if (file instanceof File && file.size > 0) {
      validateUpload(file, outputVideoExtensions);
      stored = await storageAdapter.save({
        scope: "model-output",
        ownerId: `${input.testCaseId}-${input.modelId}`,
        file,
      });
    }

    try {
      const oldFile = await updateModelOutput({
        id,
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

    return NextResponse.json({ id });
  } catch (error) {
    return jsonError(error);
  }
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
