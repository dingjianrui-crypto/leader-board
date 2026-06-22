import { Readable } from "node:stream";
import { ACLType, TosClient } from "@volcengine/tos-sdk";
import {
  TOS_ACCESS_KEY_ID,
  TOS_ACCESS_KEY_SECRET,
  TOS_BUCKET,
  TOS_ENDPOINT,
  TOS_PUBLIC_BASE_URL,
  TOS_REGION,
  TOS_STS_TOKEN,
} from "@/lib/config";
import { createStorageKey } from "./keys";
import { nodeReadableToWebStream } from "./streams";
import type { SaveFileInput, StorageAdapter, StoredFileRef } from "./types";
import { publicTosObjectUrl } from "./urls";

function requireConfig(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`${name} is required when STORAGE_PROVIDER=object_store.`);
  }
  return value;
}

function requireObjectEndpoint(value: string | undefined) {
  const endpoint = requireConfig("TOS_ENDPOINT", value);
  if (endpoint.includes("tosvectors")) {
    throw new Error(
      "TOS_ENDPOINT points to the TOS Vector service. Use a standard TOS object endpoint for uploaded files, for example tos-cn-beijing.volces.com.",
    );
  }
  return endpoint;
}

function createTosClient() {
  return new TosClient({
    accessKeyId: requireConfig("TOS_ACCESS_KEY_ID", TOS_ACCESS_KEY_ID),
    accessKeySecret: requireConfig("TOS_ACCESS_KEY_SECRET", TOS_ACCESS_KEY_SECRET),
    bucket: requireConfig("TOS_BUCKET", TOS_BUCKET),
    endpoint: requireObjectEndpoint(TOS_ENDPOINT),
    region: requireConfig("TOS_REGION", TOS_REGION),
    stsToken: TOS_STS_TOKEN,
  });
}

function toWebStream(content: NodeJS.ReadableStream | Buffer | Blob) {
  if (content instanceof Blob) {
    return content.stream();
  }

  if (Buffer.isBuffer(content)) {
    return nodeReadableToWebStream(Readable.from(content));
  }

  return nodeReadableToWebStream(content as Readable);
}

export class TosStorageAdapter implements StorageAdapter {
  private readonly client = createTosClient();
  private readonly bucket = requireConfig("TOS_BUCKET", TOS_BUCKET);
  private readonly endpoint = requireObjectEndpoint(TOS_ENDPOINT);

  async save(input: SaveFileInput): Promise<StoredFileRef> {
    const storageKey = createStorageKey(input);
    const bytes = Buffer.from(await input.file.arrayBuffer());
    const mimeType = input.file.type || "application/octet-stream";

    await this.client.putObject({
      bucket: this.bucket,
      key: storageKey,
      body: bytes,
      contentLength: bytes.length,
      contentType: mimeType,
      acl: ACLType.ACLPublicRead,
    });

    return {
      storageProvider: "object_store",
      storageKey,
      accessPath: publicTosObjectUrl({
        bucket: this.bucket,
        endpoint: this.endpoint,
        storageKey,
        publicBaseUrl: TOS_PUBLIC_BASE_URL,
      }),
      filename: input.file.name,
      mimeType,
      sizeBytes: input.file.size,
    };
  }

  async open(storageKey: string, options?: { range?: { start: number; end: number } }) {
    const head = await this.client.headObject({ bucket: this.bucket, key: storageKey });
    const sizeBytes = Number(head.data["content-length"]);
    const object = await this.client.getObjectV2({
      bucket: this.bucket,
      key: storageKey,
      ...(options?.range
        ? { rangeStart: options.range.start, rangeEnd: options.range.end }
        : {}),
    });

    return {
      stream: toWebStream(object.data.content),
      sizeBytes,
      contentLength: options?.range
        ? options.range.end - options.range.start + 1
        : sizeBytes,
    };
  }

  async delete(storageKey: string) {
    await this.client.deleteObject({ bucket: this.bucket, key: storageKey });
  }
}
