import path from "node:path";

export const APP_ROOT = process.cwd();

export const DATABASE_URL =
  process.env.DATABASE_URL ?? `file:${path.join(APP_ROOT, "data", "leader-board.sqlite")}`;

export const UPLOAD_ROOT =
  process.env.UPLOAD_ROOT ?? path.join(APP_ROOT, "uploads");

export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? 50 * 1024 * 1024);

export const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER ?? "local";
