import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { DATABASE_URL } from "@/lib/config";
import * as schema from "./schema";

const sqlitePath = DATABASE_URL.startsWith("file:")
  ? DATABASE_URL.slice("file:".length)
  : DATABASE_URL;

fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });

const client = new Database(sqlitePath);
client.pragma("busy_timeout = 5000");
client.pragma("foreign_keys = ON");

export const db = drizzle(client, { schema });
