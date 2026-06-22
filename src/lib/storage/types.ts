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

export type OpenFileOptions = {
  range?: {
    start: number;
    end: number;
  };
};

export interface StorageAdapter {
  save(input: SaveFileInput): Promise<StoredFileRef>;
  open(storageKey: string, options?: OpenFileOptions): Promise<{
    stream: ReadableStream;
    sizeBytes: number;
    contentLength: number;
  }>;
  delete(storageKey: string): Promise<void>;
}
