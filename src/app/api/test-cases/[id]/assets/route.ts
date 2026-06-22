import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { createTestCaseAsset } from "@/lib/repositories/leaderboard";
import { storage } from "@/lib/storage";
import { getAssetType, referenceExtensions, validateUpload } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const files = formData
      .getAll("assets")
      .filter((value): value is File => value instanceof File && value.size > 0);

    const storageAdapter = await storage;
    const assetIds = [];
    for (const file of files) {
      validateUpload(file, referenceExtensions);
      const stored = await storageAdapter.save({
        scope: "test-case-asset",
        ownerId: id,
        file,
      });
      try {
        assetIds.push(
          await createTestCaseAsset({
            testCaseId: id,
            assetType: getAssetType(file.name),
            filename: stored.filename,
            mimeType: stored.mimeType,
            sizeBytes: stored.sizeBytes,
            storageProvider: stored.storageProvider,
            storageKey: stored.storageKey,
            accessPath: stored.accessPath,
          }),
        );
      } catch (error) {
        await storageAdapter.delete(stored.storageKey);
        throw error;
      }
    }

    return NextResponse.json({ ids: assetIds }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
