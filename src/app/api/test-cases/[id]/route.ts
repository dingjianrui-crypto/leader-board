import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { createTestCaseAsset, deleteTestCase, updateTestCase } from "@/lib/repositories/leaderboard";
import { storage } from "@/lib/storage";
import { getAssetType, referenceExtensions, testCaseInputSchema, validateUpload } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const storageKeys = await deleteTestCase(id);
    const storageAdapter = await storage;
    await Promise.all(storageKeys.map((storageKey) => storageAdapter.delete(storageKey)));
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
    const contentType = request.headers.get("content-type") ?? "";

    if (!contentType.includes("multipart/form-data")) {
      const input = testCaseInputSchema.parse(await request.json());
      await updateTestCase({ id, ...input });
      return NextResponse.json({ id });
    }

    const formData = await request.formData();
    const input = testCaseInputSchema.parse({
      title: getString(formData, "title"),
      categoryId: getString(formData, "categoryId"),
      prompt: getString(formData, "prompt"),
      description: getString(formData, "description"),
    });
    await updateTestCase({ id, ...input });

    const storageAdapter = await storage;
    const assetIds = [];
    for (const file of getFiles(formData, "assets")) {
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

    return NextResponse.json({ id, assetIds });
  } catch (error) {
    return jsonError(error);
  }
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getFiles(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is File => value instanceof File && value.size > 0);
}
