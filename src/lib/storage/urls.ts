export function encodeStorageKey(storageKey: string) {
  return storageKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

export function publicTosObjectUrl(input: {
  bucket: string;
  endpoint: string;
  storageKey: string;
  publicBaseUrl?: string;
}) {
  const encodedKey = encodeStorageKey(input.storageKey);

  if (input.publicBaseUrl) {
    return `${input.publicBaseUrl.replace(/\/+$/, "")}/${encodedKey}`;
  }

  const normalizedEndpoint = input.endpoint.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return `https://${input.bucket}.${normalizedEndpoint}/${encodedKey}`;
}
