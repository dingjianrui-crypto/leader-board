import { createId } from "@/lib/ids";
import type { SaveFileInput } from "./types";

export function safeStorageFilename(filename: string) {
  const extension = filename.split(".").pop();
  const base = filename
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base || "file"}-${createId("file")}${extension ? `.${extension}` : ""}`;
}

export function createStorageKey(input: SaveFileInput) {
  const scopeRoot =
    input.scope === "test-case-asset" ? "test-case-assets" : "model-outputs";
  return `${scopeRoot}/${input.ownerId}/${safeStorageFilename(input.file.name)}`;
}
