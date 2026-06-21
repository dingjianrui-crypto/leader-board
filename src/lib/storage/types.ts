export type StorageProvider = "local" | "object_store";

export type StoredFileRef = {
  storageProvider: StorageProvider;
  storageKey: string;
  accessPath: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
};

export type SaveFileInput = {
  scope: "test-case-asset" | "model-output";
  ownerId: string;
  file: File;
};

export interface StorageAdapter {
  save(input: SaveFileInput): Promise<StoredFileRef>;
  open(storageKey: string): Promise<{
    stream: ReadableStream;
    sizeBytes: number;
  }>;
  delete(storageKey: string): Promise<void>;
}
