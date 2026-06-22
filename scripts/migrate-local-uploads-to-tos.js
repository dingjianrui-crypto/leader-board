#!/usr/bin/env node

const fs = require("node:fs/promises");
const path = require("node:path");
const Database = require("better-sqlite3");
const { loadEnvConfig } = require("@next/env");
const { ACLType, TosClient } = require("@volcengine/tos-sdk");

loadEnvConfig(process.cwd());

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function resolvePath(value) {
  return path.isAbsolute(value) ? value : path.join(process.cwd(), value);
}

function sqlitePathFromDatabaseUrl(databaseUrl) {
  const value = databaseUrl.startsWith("file:") ? databaseUrl.slice("file:".length) : databaseUrl;
  return resolvePath(value);
}

function encodeStorageKey(storageKey) {
  return storageKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function publicTosObjectUrl({ bucket, endpoint, storageKey, publicBaseUrl }) {
  const encodedKey = encodeStorageKey(storageKey);
  if (publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/+$/, "")}/${encodedKey}`;
  }

  const normalizedEndpoint = endpoint.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return `https://${bucket}.${normalizedEndpoint}/${encodedKey}`;
}

async function uploadObject(client, row, config) {
  const diskPath = path.join(config.uploadRoot, row.storageKey);
  let body;

  try {
    body = await fs.readFile(diskPath);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }

  await client.putObject({
    bucket: config.bucket,
    key: row.storageKey,
    body,
    contentLength: body.length,
    contentType: row.mimeType || "application/octet-stream",
    contentDisposition: `inline; filename="${row.filename.replaceAll('"', "")}"`,
    acl: ACLType.ACLPublicRead,
  });

  return publicTosObjectUrl({
    bucket: config.bucket,
    endpoint: config.endpoint,
    storageKey: row.storageKey,
    publicBaseUrl: config.publicBaseUrl,
  });
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./data/leader-board.sqlite";
  const uploadRoot = resolvePath(process.env.UPLOAD_ROOT ?? "./uploads");
  const endpoint = requireEnv("TOS_ENDPOINT");

  if (endpoint.includes("tosvectors")) {
    throw new Error("TOS_ENDPOINT must be a standard TOS object endpoint, not a TOS Vector endpoint.");
  }

  const config = {
    uploadRoot,
    bucket: requireEnv("TOS_BUCKET"),
    endpoint,
    publicBaseUrl: process.env.TOS_PUBLIC_BASE_URL,
  };

  const client = new TosClient({
    accessKeyId: requireEnv("TOS_ACCESS_KEY_ID"),
    accessKeySecret: requireEnv("TOS_ACCESS_KEY_SECRET"),
    bucket: config.bucket,
    endpoint: config.endpoint,
    region: requireEnv("TOS_REGION"),
    stsToken: process.env.TOS_STS_TOKEN,
  });

  const db = new Database(sqlitePathFromDatabaseUrl(databaseUrl));
  db.pragma("busy_timeout = 5000");
  db.pragma("foreign_keys = ON");

  const assets = db
    .prepare(
      `
      select
        'asset' as kind,
        id,
        filename,
        mime_type as mimeType,
        storage_key as storageKey
      from test_case_assets
      where storage_provider = 'local'
        and (
          mime_type like 'image/%'
          or mime_type like 'video/%'
          or mime_type like 'audio/%'
          or asset_type in ('image', 'video', 'audio')
        )
      `,
    )
    .all();

  const outputs = db
    .prepare(
      `
      select
        'output' as kind,
        id,
        video_filename as filename,
        video_mime_type as mimeType,
        video_storage_key as storageKey
      from model_outputs
      where video_storage_provider = 'local'
        and video_mime_type like 'video/%'
      `,
    )
    .all();

  const rows = [...assets, ...outputs];

  if (rows.length === 0) {
    console.log("No local media rows need migration.");
    return;
  }

  const updateAsset = db.prepare(
    "update test_case_assets set storage_provider = 'object_store', access_path = ? where id = ?",
  );
  const updateOutput = db.prepare(
    "update model_outputs set video_storage_provider = 'object_store', video_access_path = ?, updated_at = ? where id = ?",
  );

  for (const [index, row] of rows.entries()) {
    const accessPath = await uploadObject(client, row, config);

    if (!accessPath) {
      console.log(`[${index + 1}/${rows.length}] skipped missing file: ${row.storageKey}`);
      continue;
    }

    if (row.kind === "asset") {
      updateAsset.run(accessPath, row.id);
    } else {
      updateOutput.run(accessPath, Date.now(), row.id);
    }

    console.log(`[${index + 1}/${rows.length}] migrated ${row.kind}: ${row.storageKey}`);
  }

  console.log(`Migrated ${rows.length} local media row(s) to TOS object storage.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
