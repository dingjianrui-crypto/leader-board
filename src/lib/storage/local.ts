import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { UPLOAD_ROOT } from "@/lib/config";
import { createStorageKey } from "./keys";
import { nodeReadableToWebStream } from "./streams";
import type { SaveFileInput, StorageAdapter, StoredFileRef } from "./types";

function toDiskPath(storageKey: string) {
  const normalized = path.normalize(storageKey);
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
    throw new Error("Invalid storage key");
  }
  return path.join(UPLOAD_ROOT, normalized);
}

export class LocalStorageAdapter implements StorageAdapter {
  async save(input: SaveFileInput): Promise<StoredFileRef> {
    const storageKey = createStorageKey(input);
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

  async open(storageKey: string, options?: { range?: { start: number; end: number } }) {
    const diskPath = toDiskPath(storageKey);
    const stat = await fs.stat(diskPath);
    const stream = createReadStream(diskPath, options?.range);
    return {
      stream: nodeReadableToWebStream(stream),
      sizeBytes: stat.size,
      contentLength: options?.range
        ? options.range.end - options.range.start + 1
        : stat.size,
    };
  }

  async delete(storageKey: string) {
    await fs.rm(toDiskPath(storageKey), { force: true });
  }
}
