# Leader Board PRD

## 1. Overview

Leader Board is a web application for comparing video generation outputs from different model providers and models. The application lets an operator manage providers, models, benchmark categories, test cases, and offline-generated model output videos. Users can then compare selected providers/models across selected benchmark categories from a main Compare page.

The first version should follow the existing Open Design `leader-board` prototype: a compact dark dashboard with left navigation, a Compare workspace as the primary screen, an Admin Workspace for benchmark data entry, and a Providers section for model registry management.

## 2. Goals

- Provide a centralized benchmark workspace for video model evaluation.
- Let users manage model providers and models before uploading outputs.
- Let users create reusable test cases containing text prompts and optional reference assets.
- Let users upload offline model output videos and associate each output with exactly one model and one test case.
- Let users compare model outputs side by side by provider/model and test category.
- Show score dimensions and ranking tables that make model performance easy to scan.

## 3. Non-Goals for MVP

- Running video generation jobs inside the app.
- Calling provider APIs to generate outputs.
- Automatic AI-based scoring.
- Multi-user permissions, review workflows, or approval states.
- Public publishing, sharing outside local/team deployment, or SEO pages.
- Complex dataset versioning.
- Dataset export.
- Reviewer notes or evaluator comment workflows.

## 4. Target Users

- Benchmark operators who create test cases, upload model outputs, and enter evaluation scores.
- Product or research users who compare generated outputs across providers/models.
- Engineering users who need a simple internal tool to organize benchmark data before building deeper automation.

## 5. Product Structure

The app should have three main navigation areas:

1. Compare
2. Admin Workspace
3. Providers

The sidebar should show the product name `Leader Board`, the subtitle `video eval console`, and summary metrics:

- Test cases count
- Model outputs count
- Provider models count

The top bar should include global search for prompts, test cases, outputs, and models, plus quick actions such as copying a share link and creating a new test case.

## 6. Core Concepts

### 6.1 Provider

A provider is the company or platform that owns one or more video generation models.

Required fields:

- Provider name

Example:

- Provider A
- Provider B

### 6.2 Model

A model belongs to a provider and is the unit users compare.

Required fields:

- Provider
- Model name
- Version

Behavior:

- Every saved provider/model record is immediately active.
- The app should not expose provider/model status in MVP.
- Saved models are selectable when uploading model outputs.
- Saved models appear as filters on the Compare page.
- A model can be deleted only if it has no uploaded outputs.
- A provider can be deleted only if it has no models.

### 6.3 Category

A category groups test cases by benchmark intent.

Required fields:

- Category name
- Category description

Initial categories from the prototype:

- Image reference
- Video reference
- Audio driven
- Prompt only

Behavior:

- Categories are managed records, not free-text values.
- Test-case creation must select from existing categories.
- Compare page filters should use categories.
- A category can be deleted only if it has no test cases.

### 6.4 Test Case

A test case defines the input scenario to evaluate.

Required fields:

- Test case title
- Category
- Text prompt
- Description

Optional input assets:

- Images
- Audio files
- Videos

Behavior:

- A test case can contain one or more reference assets.
- Reference files are stored in server-side local file storage.
- File writes and reads must go through a storage adapter so the app can switch to cloud object storage later.
- The system stores provider-neutral storage references and file metadata in SQLite, not file bytes.
- Reference assets should record filename, asset type, size, MIME type, storage provider, storage key, and access path or URL.
- Each uploaded file must be 50MB or smaller.
- Test cases appear in the Compare page case list.
- Test cases become selectable when uploading model output videos.
- A test case can be deleted from Admin.
- Deleting a test case also deletes its reference asset records, associated model output records, and stored files.

### 6.5 Model Output

A model output is an offline-generated video produced by a selected model for a selected test case.

Required fields:

- Test case
- Provider/model
- Output video file
- Prompt match score
- Reference adherence score
- Motion stability score
- Audio alignment score

Computed fields:

- Overall score

Behavior:

- Each uploaded output belongs to exactly one test case and one model.
- Output videos are uploaded after generation; the app does not generate the video.
- Output videos are stored in server-side local file storage.
- File writes and reads must go through the same storage adapter used for test case reference assets.
- The system stores output video storage provider, storage key, access path or URL, and file metadata in SQLite, not file bytes.
- Scores are manually entered on the output record for MVP.
- Overall score is computed as the simple average of the score dimensions on the same 0-10 scale.
- Score dimensions are fixed for MVP: prompt match, reference, motion, and audio sync.
- Output records feed the Compare page video grid and ranking table.
- A model output can be deleted from Admin.
- Deleting a model output also deletes its stored video file.

## 7. Compare Page Requirements

The Compare page is the primary user experience.

### 7.1 Filters

Users must be able to filter by:

- One or more providers/models
- One or more test categories

Prototype behavior:

- Provider filters are displayed as chips.
- Models are grouped under providers in the data model.
- Category filters are displayed as chips.
- If a provider/model is deselected, its outputs are hidden from the video grid and ranking table.
- If one or more categories are selected, the case list should show test cases in those categories.

Product requirement:

- MVP should support multi-select for providers/models.
- The provider/model filter must be hierarchical: provider first, then one or more models under each provider.
- A provider may contain multiple models.
- Users must be able to compare specific models from the same provider.
- MVP should support multi-select for categories.
- The comparison should update without requiring a separate Run comparison action.

### 7.2 Test Case List

The Compare page should show a selectable list of test cases.

Each test case item should display:

- Test case title
- Category
- Reference asset count
- Uploaded output count

Selecting a test case updates:

- Prompt/details card
- Reference asset list
- Video output grid
- Score/ranking table

### 7.3 Test Case Detail

The selected test case detail should show:

- Category
- Title
- Text prompt
- Reference asset chips

Reference asset chips should identify asset type where useful, such as image, audio, video, or prompt.

### 7.4 Video Output Grid

The selected test case should show model outputs side by side.

Each output card should show:

- Provider
- Model
- Output video preview/player
- Overall score

Behavior:

- Cards should be filtered by selected provider/model.
- Empty states should explain when no output exists for the selected filters.
- Video playback controls should be available for review.

### 7.5 Score and Ranking Table

The Compare page should show a score/ranking table below the video grid.

Columns:

- Rank
- Provider
- Model
- Overall
- Prompt match
- Reference
- Motion
- Audio sync

Behavior:

- The table should only include visible/filtered outputs.
- Users can sort by overall score.
- Overall score should remain on a 0-10 scale.
- The Compare page should not include a Run comparison button.

## 8. Admin Workspace Requirements

The Admin Workspace manages categories, test cases, and model outputs.

### 8.1 Category Management

Users can create and view benchmark categories.

Form fields:

- Category name
- Category description

Table columns:

- Category
- Description
- Test case count

Validation:

- Category name is required.
- Category names should be unique.
- Category deletion is blocked when the category still has test cases.

### 8.2 Test Case Creation

Users can create test cases after categories exist.

Form fields:

- Test case title
- Category
- Text prompt
- Description
- Reference assets

Supported reference asset types:

- Images: `png`, `jpg`, `jpeg`, `webp`
- Videos: `mp4`, `mov`, `webm`
- Audio: `wav`, `mp3`, `m4a`

Table columns:

- Test case
- Category
- Reference assets
- Outputs
- Status

Status in Admin can be simple:

- Ready
- Needs outputs

Validation:

- Title is required.
- Category is required.
- Text prompt is required.
- Uploaded files must match allowed types.
- Deleting a test case removes its uploaded reference assets and associated model outputs.

### 8.3 Model Output Upload

Users can upload offline output videos and attach scores.

Form fields:

- Test case
- Model
- Output video file
- Prompt match score
- Reference score
- Motion score
- Audio sync score

Supported output video types:

- `mp4`
- `mov`
- `webm`

Score validation:

- Each score is required.
- Each score must be between 0 and 10.
- Decimal scores should support one decimal place.

Output table columns:

- Output ID
- Test case
- Model
- Video file
- Overall
- Prompt match
- Reference
- Motion
- Audio sync

Deletion:

- Users can delete a model output.
- Deleting a model output removes the output record and its stored video file.

## 9. Providers Requirements

The Providers section manages provider/model records.

Form fields:

- Provider
- Model
- Version

Table columns:

- Provider
- Model
- Version
- Uploaded outputs

Behavior:

- Saving a provider/model record makes it immediately available for output uploads and comparison filters.
- Duplicate provider/model/version combinations should be prevented.
- Provider/model records do not need a status field in MVP.
- The Providers page should expose delete actions for eligible records.
- Delete model is allowed only when the model has zero uploaded outputs.
- Delete provider is allowed only when the provider has zero models.
- In-use records should show a disabled state or explanatory label instead of a destructive action.

## 10. Search Requirements

Global search should help users find:

- Test cases
- Text prompts
- Model outputs
- Providers
- Models

MVP behavior:

- Search can filter visible tables/lists in the current view.
- Search should be case-insensitive.

Future behavior:

- Search across all sections and deep-link into matching records.

## 11. Storage, Deployment, and Auth

### 11.1 File Storage

All uploaded files are stored in server-side local file storage.

The implementation must use a storage adapter layer. Product and database logic should call the adapter rather than directly depending on local filesystem APIs. This keeps the MVP simple while allowing a future switch to cloud object storage.

Required storage adapter capabilities:

- Save uploaded file bytes and return a stored-file reference.
- Resolve a stored-file reference into a stream or response for playback/download.
- Delete a stored file when its owning record is deleted.
- Validate file size and allowed MIME/file types.

Stored-file reference fields:

- `storage_provider`, such as `local` for MVP and `object_store` in a future version.
- `storage_key`, a provider-neutral key such as `test-case-assets/{test_case_id}/{asset_id}/{filename}`.
- `access_path`, a local application route or future object URL used by the app to load the file.

Files include:

- Test case reference images
- Test case reference audio files
- Test case reference videos
- Model output videos

The application stores file metadata in SQLite:

- Storage provider
- Storage key
- Access path or URL
- Filename
- MIME type
- File size
- Asset type
- Related test case or model output ID

Upload limit:

- Each uploaded file must be 50MB or smaller.

Recommended local storage structure:

- `uploads/test-case-assets/{test_case_id}/...`
- `uploads/model-outputs/{model_output_id}/...`

The application should serve uploaded files through application routes rather than exposing arbitrary filesystem paths directly.

Future object storage migration:

- Replace the local storage adapter implementation with an object-store adapter.
- Keep product flows, upload forms, comparison views, and relational records unchanged.
- Existing local records can be migrated by copying files to object storage and updating `storage_provider`, `storage_key`, and `access_path`.

### 11.2 Relational Data

SQLite stores relational metadata for providers, models, categories, test cases, test case assets, and model outputs.

Relational data access should also be isolated behind a data repository/adapter layer so handlers and UI-facing services do not embed raw SQL throughout the application.

### 11.3 Deployment

The MVP will be deployed on a VM.

Because uploaded files are stored locally, the VM deployment must use persistent disk storage that survives app restarts and redeploys.

### 11.4 Authentication

Authentication is not required for MVP.

The deployed MVP is assumed to be protected by deployment-level access controls if needed, such as private network, preview environment access, or reverse-proxy rules.

## 12. Data Model

### Provider

- `id`
- `name`
- `created_at`
- `updated_at`

### Model

- `id`
- `provider_id`
- `name`
- `version`
- `created_at`
- `updated_at`

### Category

- `id`
- `name`
- `description`
- `created_at`
- `updated_at`

### Test Case

- `id`
- `title`
- `category_id`
- `prompt`
- `description`
- `created_at`
- `updated_at`

### Test Case Asset

- `id`
- `test_case_id`
- `asset_type`
- `filename`
- `mime_type`
- `size_bytes`
- `storage_provider`
- `storage_key`
- `access_path`
- `created_at`

### Model Output

- `id`
- `test_case_id`
- `model_id`
- `video_filename`
- `video_mime_type`
- `video_size_bytes`
- `video_storage_provider`
- `video_storage_key`
- `video_access_path`
- `score_prompt_match`
- `score_reference`
- `score_motion`
- `score_audio_sync`
- `score_overall`
- `created_at`
- `updated_at`

## 13. MVP Acceptance Criteria

- Users can create providers and models.
- Users can create categories.
- Users can create test cases with text prompt and optional image/audio/video reference assets.
- Users can upload a model output video for a selected test case and model.
- Users can enter required 0-10 score dimensions for each uploaded output.
- Overall score is computed as the average of the entered dimension scores and displayed.
- Compare page can filter by multiple categories.
- Compare page supports hierarchical provider-to-model filtering, including selecting multiple models under a provider.
- Compare page can show selected test case details, model output videos, and ranking table.
- Ranking table can sort by overall score.
- Uploaded files are stored in server-side local file storage through a storage adapter, with storage references and metadata stored in SQLite.
- Each uploaded file is limited to 50MB.
- SQLite stores relational data for providers, models, categories, test cases, assets, and outputs.
- Relational data access is isolated behind a repository/data adapter layer.
- The storage adapter can be replaced later with a cloud object-store implementation without changing product workflows.
- MVP is deployable to a VM.
- VM deployment includes persistent disk storage for uploaded files and the SQLite database.
- MVP does not require application-level authentication.
- Sidebar summary counts update from stored data.
- The UI follows the Open Design `leader-board` direction: dark dashboard, compact data layout, left navigation, chips, tables, and side-by-side video comparison.

## 14. Resolved MVP Decisions

1. Scores are entered manually for MVP.
2. Overall score is the average of the different score dimensions.
3. Model filtering is hierarchical from provider to model because one provider may have multiple models.
4. Comparison allows multiple categories at the same time.
5. Uploaded audio, video, and image files are stored in server-side local file storage through a storage adapter; SQLite stores storage references and metadata.
6. MVP will be deployed on a VM.
7. Authentication is not required for MVP.
8. SQLite stores relational metadata.
9. Notes and reviewer workflows are not required for MVP.
10. Dataset export is not required for MVP.
11. Maximum upload size is 50MB per file.
12. Score dimensions stay fixed for MVP.
13. A data adapter layer is required so local file storage can be switched to cloud object storage later with minimal product-layer changes.

## 15. Remaining Open Questions

No open product questions remain for MVP. Implementation can proceed using the requirements above.

## 16. Recommended Implementation Order

- Build the SQLite repository layer and storage adapter first.
- Build Providers next, because model records are required for output uploads.
- Build Admin Workspace after Providers, including category, test case, and model output creation.
- Build Compare once the core records and stored-file references exist.
