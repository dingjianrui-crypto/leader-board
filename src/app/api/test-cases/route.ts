import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import {
  createTestCase,
  createTestCaseAsset,
  listTestCases,
} from "@/lib/repositories/leaderboard";
import { storage } from "@/lib/storage";
import {
  getAssetType,
  referenceExtensions,
  testCaseInputSchema,
  validateUpload,
} from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await listTestCases());
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      return await createFromMultipart(request);
    }

    const input = testCaseInputSchema.parse(await request.json());
    const id = await createTestCase(input);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

async function createFromMultipart(request: NextRequest) {
  const formData = await request.formData();
  const input = testCaseInputSchema.parse({
    title: getString(formData, "title"),
    categoryId: getString(formData, "categoryId"),
    prompt: getString(formData, "prompt"),
    description: getString(formData, "description"),
  });

  const testCaseId = await createTestCase(input);

  try {
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
  } catch (error) {
    // Keep the behavior simple for MVP: leave the test case record for correction,
    // but fail the request so the user sees the upload problem.
    throw error;
  }

  return NextResponse.redirect(new URL(`/compare?case=${testCaseId}`, request.url), 303);
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
