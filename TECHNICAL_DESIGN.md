# Leader Board Technical Design

## 1. Summary

Leader Board will be implemented as a full-stack Next.js application for comparing offline video model outputs. The MVP uses SQLite for relational data and server-side local file storage for uploaded media, deployed on a VM with persistent disk.

The architecture must keep storage and relational data behind adapter layers so the MVP can later move uploaded files to cloud object storage with minimal product-layer changes.

## 2. Technology Stack

- Framework: Next.js App Router
- Language: TypeScript
- Styling: Tailwind CSS
- Database: SQLite
- Database access: Drizzle ORM
- Validation: Zod
- File storage: local filesystem through a `StorageAdapter`
- Runtime: Node.js
- Deployment: VM, preferably Dockerized, with persistent disk

## 3. Deployment Model

The MVP runs as a long-lived Node process on a VM.

Recommended production layout:

```text
/opt/leader-board/
  app/
    .next/
    package.json
  data/
    leader-board.sqlite
  uploads/
    test-case-assets/
    model-outputs/
```

Runtime configuration:

```text
DATABASE_URL=file:/opt/leader-board/data/leader-board.sqlite
UPLOAD_ROOT=/opt/leader-board/uploads
MAX_UPLOAD_BYTES=52428800
STORAGE_PROVIDER=local
```

Deployment requirements:

- Persistent disk for `/opt/leader-board/data`.
- Persistent disk for `/opt/leader-board/uploads`.
- Reverse proxy such as Nginx or Caddy in front of the Node app.
- HTTPS termination at the reverse proxy.
- Process manager such as Docker Compose, systemd, or PM2.
- Regular backups for both SQLite database and uploaded files.

This app should not be deployed as a stateless serverless app for MVP because SQLite and local uploads require persistent disk.

## 4. High-Level Architecture

```text
Browser
  -> Next.js routes and React components
  -> Route handlers / server actions
  -> Service layer
  -> Repository layer
  -> SQLite

Uploaded media
  -> Upload route handler
  -> StorageAdapter
  -> Local filesystem
  -> SQLite stores storage references
```

Key principles:

- UI components do not call SQLite directly.
- Route handlers validate input and call services.
- Services coordinate business rules.
- Repositories own database reads/writes.
- Storage adapter owns file reads/writes/deletes.
- Product flows should not depend on local filesystem paths.

## 5. Application Routes

Recommended user-facing pages:

```text
/compare
/admin
/providers
```

Recommended default:

```text
/ -> redirect to /compare
```

Recommended API routes:

```text
GET    /api/providers
POST   /api/providers
DELETE /api/providers/:id
GET    /api/models
POST   /api/models
DELETE /api/models/:id

GET    /api/categories
POST   /api/categories
DELETE /api/categories/:id

GET    /api/test-cases
POST   /api/test-cases
DELETE /api/test-cases/:id
POST   /api/test-cases/:id/assets

GET    /api/model-outputs
POST   /api/model-outputs
DELETE /api/model-outputs/:id

GET    /api/files/:path*
```

Route handler guidance:

- Use route handlers for uploads and media streaming.
- Server actions are acceptable for small form mutations, but upload flows should use route handlers.
- File-serving routes must validate that the requested storage key belongs to a known database record before streaming the file. Because storage keys can contain path separators, implement this as a catch-all route.

## 6. Frontend Structure

Suggested source layout:

```text
src/
  app/
    page.tsx
    compare/
      page.tsx
    admin/
      page.tsx
    providers/
      page.tsx
    api/
      ...
  components/
    layout/
    compare/
    admin/
    providers/
    ui/
  lib/
    db/
    repositories/
    services/
    storage/
    validation/
    scoring/
```

UI expectations:

- Match the Open Design `leader-board` prototype: dark dashboard, left sidebar, compact data tables, filter chips, side-by-side video grid.
- Compare is the primary screen.
- Admin Workspace manages categories, test cases, and output uploads.
- Providers manages provider/model/version records.

## 7. Storage Adapter

The MVP uses local filesystem storage, but all file access must go through this interface.

```ts
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
  open(storageKey: string): Promise<ReadableStream>;
  delete(storageKey: string): Promise<void>;
}
```

Local implementation:

- Stores files under `UPLOAD_ROOT`.
- Generates storage keys that do not expose absolute filesystem paths.
- Returns app access paths such as `/api/files/test-case-assets/...`.
- Enforces 50MB file limit before saving.
- Validates allowed file types by MIME type and extension.

Future object-store implementation:

- Stores files in S3/R2/GCS or equivalent.
- Keeps the same adapter interface.
- May return signed URLs or application proxy URLs as `accessPath`.
- Requires a migration that copies local files to object storage and updates stored references.

## 8. Data Adapter and Repositories

SQLite is the MVP database. The app should use repositories rather than raw SQL in route handlers.

Recommended repositories:

```text
ProviderRepository
ModelRepository
CategoryRepository
TestCaseRepository
TestCaseAssetRepository
ModelOutputRepository
```

Repository responsibilities:

- Encapsulate SQL/Drizzle queries.
- Return typed domain objects.
- Enforce database-level uniqueness where appropriate.
- Enforce guarded deletion rules for provider/model records.
- Keep route handlers and UI services independent from the concrete database implementation.

Provider/model deletion rules:

- `deleteModel(modelId)` must check `model_outputs` before deleting.
- A model with one or more uploaded outputs cannot be deleted.
- `deleteProvider(providerId)` must check `models` before deleting.
- A provider with one or more models cannot be deleted.
- The UI should show disabled/explanatory states for records that cannot be deleted.

Admin deletion rules:

- `deleteCategory(categoryId)` must check `test_cases` before deleting.
- A category with one or more test cases cannot be deleted.
- `deleteTestCase(testCaseId)` deletes the test case and cascades related asset/output rows through foreign keys.
- `deleteTestCase(testCaseId)` must return storage keys for related reference assets and model output videos so the storage adapter can remove files after DB deletion.
- `deleteModelOutput(outputId)` deletes one output row and returns the video storage key for storage cleanup.
- If storage cleanup fails after DB deletion, log the error and continue surfacing the operation result; a future maintenance task can reconcile orphaned files.

## 9. Database Schema

### providers

```text
id TEXT PRIMARY KEY
name TEXT NOT NULL UNIQUE
created_at INTEGER NOT NULL
updated_at INTEGER NOT NULL
```

### models

```text
id TEXT PRIMARY KEY
provider_id TEXT NOT NULL REFERENCES providers(id)
name TEXT NOT NULL
version TEXT NOT NULL
created_at INTEGER NOT NULL
updated_at INTEGER NOT NULL
UNIQUE(provider_id, name, version)
```

### categories

```text
id TEXT PRIMARY KEY
name TEXT NOT NULL UNIQUE
description TEXT NOT NULL
created_at INTEGER NOT NULL
updated_at INTEGER NOT NULL
```

### test_cases

```text
id TEXT PRIMARY KEY
title TEXT NOT NULL
category_id TEXT NOT NULL REFERENCES categories(id)
prompt TEXT NOT NULL
description TEXT NOT NULL
created_at INTEGER NOT NULL
updated_at INTEGER NOT NULL
```

### test_case_assets

```text
id TEXT PRIMARY KEY
test_case_id TEXT NOT NULL REFERENCES test_cases(id)
asset_type TEXT NOT NULL
filename TEXT NOT NULL
mime_type TEXT NOT NULL
size_bytes INTEGER NOT NULL
storage_provider TEXT NOT NULL
storage_key TEXT NOT NULL UNIQUE
access_path TEXT NOT NULL
created_at INTEGER NOT NULL
```

### model_outputs

```text
id TEXT PRIMARY KEY
test_case_id TEXT NOT NULL REFERENCES test_cases(id)
model_id TEXT NOT NULL REFERENCES models(id)
video_filename TEXT NOT NULL
video_mime_type TEXT NOT NULL
video_size_bytes INTEGER NOT NULL
video_storage_provider TEXT NOT NULL
video_storage_key TEXT NOT NULL UNIQUE
video_access_path TEXT NOT NULL
score_prompt_match REAL NOT NULL
score_reference REAL NOT NULL
score_motion REAL NOT NULL
score_audio_sync REAL NOT NULL
score_overall REAL NOT NULL
created_at INTEGER NOT NULL
updated_at INTEGER NOT NULL
```

Recommended indexes:

```text
models(provider_id)
test_cases(category_id)
test_case_assets(test_case_id)
model_outputs(test_case_id)
model_outputs(model_id)
model_outputs(test_case_id, model_id)
```

## 10. Validation Rules

Upload validation:

- Max file size: 50MB per file.
- Reference image types: `png`, `jpg`, `jpeg`, `webp`.
- Reference video types: `mp4`, `mov`, `webm`.
- Reference audio types: `wav`, `mp3`, `m4a`.
- Output video types: `mp4`, `mov`, `webm`.

Score validation:

- `score_prompt_match`: required, 0-10.
- `score_reference`: required, 0-10.
- `score_motion`: required, 0-10.
- `score_audio_sync`: required, 0-10.
- `score_overall`: computed, not entered manually.

Overall score:

```text
(prompt_match + reference + motion + audio_sync) / 4
```

Store one decimal place for display consistency.

## 11. Compare Query Design

Compare page filters:

- Multiple categories.
- Hierarchical provider-to-model selection.
- Multiple models per provider.

Recommended query inputs:

```ts
type CompareFilters = {
  categoryIds: string[];
  modelIds: string[];
};
```

Compare response should include:

- Matching test cases.
- Assets for the selected test case.
- Model outputs for selected models.
- Provider/model labels.
- Score table rows ranked by overall score.

The Compare page should not trigger generation or scoring jobs. It only reads existing uploaded outputs and manually entered scores.

## 12. File Serving

Files should be served by an application route, not by exposing raw filesystem paths.

Required checks:

- The requested `storage_key` exists in `test_case_assets` or `model_outputs`.
- The stored file exists in the storage adapter.
- The response sets the correct `Content-Type`.
- Video responses should support range requests if practical, because browser video playback benefits from seeking.

## 13. Error Handling

User-facing validation errors:

- Duplicate provider/model/version.
- Missing required fields.
- Unsupported file type.
- Upload over 50MB.
- Score outside 0-10.
- Model output upload without test case or model.

Operational errors:

- Storage write failed.
- SQLite write failed after file upload.
- File missing from storage for a known record.

Implementation note:

- For upload plus DB insert, save file first, then insert DB record. If DB insert fails, delete the saved file through the storage adapter.

## 14. Backup and Operations

The VM should back up:

- SQLite database file.
- Upload root directory.

Recommended backup approach:

- Nightly SQLite backup using SQLite backup or safe copy while the app is stopped/locked.
- Nightly archive or sync of `uploads/`.
- Keep database and upload backups from the same time window to avoid broken file references.

## 15. Security Notes

Auth is not required for MVP, but deployment should still avoid unnecessary exposure.

Minimum safeguards:

- Run behind HTTPS.
- Restrict VM access with firewall rules.
- Validate uploads by type and size.
- Generate storage keys server-side.
- Never trust client-provided file paths.
- Do not expose absolute filesystem paths in responses.
- Consider basic reverse-proxy access control if the VM is reachable from the public internet.

## 16. Implementation Order

1. Create Next.js, TypeScript, and Tailwind project.
2. Add SQLite/Drizzle setup and migrations.
3. Implement repositories.
4. Implement local `StorageAdapter`.
5. Build provider/model management.
6. Build category and test case management.
7. Build reference asset upload.
8. Build model output upload with score validation.
9. Build Compare page with hierarchical provider/model filters and category filters.
10. Add file streaming route for video playback.
11. Add VM deployment packaging and backup notes.

## 17. Open Technical Decisions

No product-level questions remain. Technical choices that can be finalized during implementation:

- Docker Compose versus systemd for VM process management.
- Exact reverse proxy choice: Nginx or Caddy.
- Backup schedule and destination.
