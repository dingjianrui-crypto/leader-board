import { STORAGE_PROVIDER } from "@/lib/config";
import { LocalStorageAdapter } from "./local";
import type { StorageAdapter, StorageProvider } from "./types";

async function createTosStorageAdapter() {
  const { TosStorageAdapter } = await import("./tos");
  return new TosStorageAdapter();
}

export async function createStorageAdapter(): Promise<StorageAdapter> {
  if (STORAGE_PROVIDER === "local") {
    return new LocalStorageAdapter();
  }

  if (STORAGE_PROVIDER === "object_store") {
    return createTosStorageAdapter();
  }

  throw new Error(`Unsupported STORAGE_PROVIDER: ${STORAGE_PROVIDER}`);
}

export const storage: Promise<StorageAdapter> = createStorageAdapter();

const adapters: Partial<Record<StorageProvider, StorageAdapter | Promise<StorageAdapter>>> = {
  local: new LocalStorageAdapter(),
  object_store: STORAGE_PROVIDER === "object_store" ? storage : undefined,
};

export async function getStorageAdapter(provider: string): Promise<StorageAdapter> {
  if (provider === "local") {
    return adapters.local ?? new LocalStorageAdapter();
  }

  if (provider === "object_store") {
    adapters.object_store ??= createTosStorageAdapter();
    return adapters.object_store;
  }

  throw new Error(`Unsupported storage provider: ${provider}`);
}
