import fs from "node:fs/promises";
import path from "node:path";
import { UPLOAD_ROOT } from "@/lib/config";
import { createId } from "@/lib/ids";
import type { SaveFileInput, StorageAdapter, StoredFileRef } from "./types";

function safeName(filename: string) {
  const extension = filename.split(".").pop();
  const base = filename
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base || "file"}-${createId("file")}${extension ? `.${extension}` : ""}`;
}

function toDiskPath(storageKey: string) {
  const normalized = path.normalize(storageKey);
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
    throw new Error("Invalid storage key");
  }
  return path.join(UPLOAD_ROOT, normalized);
}

export class LocalStorageAdapter implements StorageAdapter {
  async save(input: SaveFileInput): Promise<StoredFileRef> {
    const scopeRoot =
      input.scope === "test-case-asset" ? "test-case-assets" : "model-outputs";
    const filename = safeName(input.file.name);
    const storageKey = `${scopeRoot}/${input.ownerId}/${filename}`;
    const diskPath = toDiskPath(storageKey);

    await fs.mkdir(path.dirname(diskPath), { recursive: true });
    const bytes = Buffer.from(await input.file.arrayBuffer());
    await fs.writeFile(diskPath, bytes);

    return {
      storageProvider: "local",
      storageKey,
      accessPath: `/api/files/${storageKey}`,
      filename: input.file.name,
      mimeType: input.file.type || "application/octet-stream",
      sizeBytes: input.file.size,
    };
  }

  async open(storageKey: string) {
    const diskPath = toDiskPath(storageKey);
    const file = await fs.open(diskPath, "r");
    const stat = await file.stat();
    return {
      stream: file.readableWebStream() as ReadableStream,
      sizeBytes: stat.size,
    };
  }

  async delete(storageKey: string) {
    await fs.rm(toDiskPath(storageKey), { force: true });
  }
}
