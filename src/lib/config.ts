import path from "node:path";

export const APP_ROOT = process.cwd();

export const DATABASE_URL =
  process.env.DATABASE_URL ?? `file:${path.join(APP_ROOT, "data", "leader-board.sqlite")}`;

export const UPLOAD_ROOT =
  process.env.UPLOAD_ROOT ?? path.join(APP_ROOT, "uploads");

export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? 50 * 1024 * 1024);

export const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER ?? "local";

export const TOS_ACCESS_KEY_ID = process.env.TOS_ACCESS_KEY_ID;
export const TOS_ACCESS_KEY_SECRET = process.env.TOS_ACCESS_KEY_SECRET;
export const TOS_BUCKET = process.env.TOS_BUCKET;
export const TOS_ENDPOINT = process.env.TOS_ENDPOINT;
export const TOS_REGION = process.env.TOS_REGION;
export const TOS_STS_TOKEN = process.env.TOS_STS_TOKEN;
export const TOS_PUBLIC_BASE_URL = process.env.TOS_PUBLIC_BASE_URL;
