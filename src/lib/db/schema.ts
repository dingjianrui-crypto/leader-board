import { relations, sql } from "drizzle-orm";
import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamp = (name: string) =>
  integer(name, { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch('subsec') * 1000)`);

export const providers = sqliteTable("providers", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const models = sqliteTable(
  "models",
  {
    id: text("id").primaryKey(),
    providerId: text("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    version: text("version").notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => ({
    providerModelVersionIdx: uniqueIndex("models_provider_name_version_idx").on(
      table.providerId,
      table.name,
      table.version,
    ),
  }),
);

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const testCases = sqliteTable("test_cases", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "restrict" }),
  prompt: text("prompt").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const testCaseAssets = sqliteTable("test_case_assets", {
  id: text("id").primaryKey(),
  testCaseId: text("test_case_id")
    .notNull()
    .references(() => testCases.id, { onDelete: "cascade" }),
  assetType: text("asset_type").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  storageProvider: text("storage_provider").notNull(),
  storageKey: text("storage_key").notNull().unique(),
  accessPath: text("access_path").notNull(),
  createdAt: timestamp("created_at"),
});

export const modelOutputs = sqliteTable("model_outputs", {
  id: text("id").primaryKey(),
  testCaseId: text("test_case_id")
    .notNull()
    .references(() => testCases.id, { onDelete: "cascade" }),
  modelId: text("model_id")
    .notNull()
    .references(() => models.id, { onDelete: "cascade" }),
  videoFilename: text("video_filename").notNull(),
  videoMimeType: text("video_mime_type").notNull(),
  videoSizeBytes: integer("video_size_bytes").notNull(),
  videoStorageProvider: text("video_storage_provider").notNull(),
  videoStorageKey: text("video_storage_key").notNull().unique(),
  videoAccessPath: text("video_access_path").notNull(),
  gsbValue: text("gsb_value").notNull().default("normal"),
  userComments: text("user_comments").notNull().default(""),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const providerRelations = relations(providers, ({ many }) => ({
  models: many(models),
}));

export const modelRelations = relations(models, ({ one, many }) => ({
  provider: one(providers, {
    fields: [models.providerId],
    references: [providers.id],
  }),
  outputs: many(modelOutputs),
}));

export const categoryRelations = relations(categories, ({ many }) => ({
  testCases: many(testCases),
}));

export const testCaseRelations = relations(testCases, ({ one, many }) => ({
  category: one(categories, {
    fields: [testCases.categoryId],
    references: [categories.id],
  }),
  assets: many(testCaseAssets),
  outputs: many(modelOutputs),
}));

export const testCaseAssetRelations = relations(testCaseAssets, ({ one }) => ({
  testCase: one(testCases, {
    fields: [testCaseAssets.testCaseId],
    references: [testCases.id],
  }),
}));

export const modelOutputRelations = relations(modelOutputs, ({ one }) => ({
  testCase: one(testCases, {
    fields: [modelOutputs.testCaseId],
    references: [testCases.id],
  }),
  model: one(models, {
    fields: [modelOutputs.modelId],
    references: [models.id],
  }),
}));
