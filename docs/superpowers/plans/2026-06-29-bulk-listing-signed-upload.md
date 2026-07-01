# Bulk Listing Signed Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upload listing photos directly to Supabase Storage and send only trusted object paths through OSUTrade's AI draft API.

**Architecture:** Add an authenticated signing route that issues short-lived Supabase upload tokens for server-generated owner paths. A client upload helper sends files directly to Storage; the AI route validates owner paths, derives public URLs, and calls OpenAI with URL image inputs. Manual and bulk publishing reuse the uploaded URLs.

**Tech Stack:** Next.js App Router, React 19, Supabase Storage, OpenAI Responses API, TypeScript, Vitest.

---

## File Map

- Create `app/lib/productImageUploads.ts`: shared file metadata validation, signed-upload types, direct client upload orchestration, and safe API error parsing.
- Create `app/lib/productImageUploads.test.ts`: TDD coverage for validation, direct uploads, partial failures, and cleanup path selection.
- Create `app/api/products/images/sign/route.ts`: authenticated signed-upload token issuance.
- Create `app/api/products/images/sign/route.test.ts`: route-level validation and owner-path coverage.
- Modify `app/api/products/images/route.ts`: authenticated owner-scoped cleanup endpoint.
- Modify `supabase/mvp-schema.sql`: enforce Storage-level MIME and 5 MB limits for signed uploads.
- Modify `app/api/products/bulk-drafts/route.ts`: accept JSON paths, derive trusted public URLs, and expose actionable provider failures.
- Create `app/api/products/bulk-drafts/route.test.ts`: JSON contract, path ownership, and OpenAI URL input coverage.
- Modify `app/lib/bulkDraftRequest.ts`: build stable JSON payloads and filter uncommitted cleanup paths.
- Modify `app/lib/bulkDraftRequest.test.ts`: prevent multipart regression and protect committed images.
- Modify `app/sell/page.tsx`: use direct uploads in manual and AI modes, reuse URLs on publish, and surface HTTP status when a platform returns non-JSON.

### Task 1: Direct Upload Domain Helper

**Files:**
- Create: `app/lib/productImageUploads.ts`
- Test: `app/lib/productImageUploads.test.ts`

- [ ] Write failing tests for 1-10 file validation, accepted MIME types, 5 MB limit, signing response parsing, sequential `uploadToSignedUrl`, and an error naming the failed image.
- [ ] Run `npm.cmd test -- app/lib/productImageUploads.test.ts --run` and confirm the module is missing.
- [ ] Implement `validateProductImageFiles`, `requestSignedProductImageUploads`, `uploadProductImagesDirect`, and `readApiError` with dependency injection for the Storage uploader.
- [ ] Re-run the targeted test and confirm it passes.
- [ ] Commit `test/feat: add direct product image upload helper`.

### Task 2: Signed Upload And Cleanup APIs

**Files:**
- Create: `app/api/products/images/sign/route.ts`
- Create: `app/api/products/images/sign/route.test.ts`
- Modify: `app/api/products/images/route.ts`
- Modify: `supabase/mvp-schema.sql`

- [ ] Write failing route tests for authentication, invalid metadata, server-generated `<user-id>/<uuid>.<ext>` paths, and rejection of cleanup paths outside the current user prefix.
- [ ] Run the targeted route tests and confirm they fail.
- [ ] Implement signed token issuance through `createAdminClient().storage.from("product-images").createSignedUploadUrl(path)`.
- [ ] Add `DELETE /api/products/images` accepting `{ paths }`, validating ownership, and calling Storage `remove`.
- [ ] Configure the `product-images` bucket with `file_size_limit = 5242880` and JPG/PNG/WebP MIME restrictions so signed uploads cannot bypass client metadata checks.
- [ ] Re-run targeted tests and confirm they pass.
- [ ] Commit `feat: issue signed product image uploads`.

### Task 3: JSON-Only AI Draft API

**Files:**
- Modify: `app/api/products/bulk-drafts/route.ts`
- Create: `app/api/products/bulk-drafts/route.test.ts`
- Modify: `app/lib/bulkDraftRequest.ts`
- Modify: `app/lib/bulkDraftRequest.test.ts`

- [ ] Write failing tests proving the route accepts `{ imagePaths }`, rejects foreign paths, and sends public HTTPS URLs rather than Base64 data to OpenAI.
- [ ] Add a failing test for OpenAI non-2xx responses returning a safe 502 response and logging status/request ID.
- [ ] Replace `request.formData()` and `File` conversion with JSON parsing, owner validation, and `getPublicUrl` URL generation.
- [ ] Keep strict Structured Outputs and stale-response tracking unchanged.
- [ ] Re-run targeted tests and commit `fix: send storage URLs to bulk listing AI`.

### Task 4: Sell Page Integration

**Files:**
- Modify: `app/sell/page.tsx`
- Modify: `app/lib/bulkDraftRequest.ts`
- Modify: `app/lib/bulkDraftRequest.test.ts`

- [ ] Add failing helper tests for JSON path payloads and cleanup that excludes committed product image paths.
- [ ] Upload manual images directly before creating a product.
- [ ] Upload AI images once before draft generation, send only paths to `/api/products/bulk-drafts`, and reuse public URLs during publishing.
- [ ] Track committed paths after successful product creation and clean only uncommitted paths on explicit clear or photo replacement.
- [ ] Use `readApiError` so non-JSON 413/5xx responses include HTTP status instead of only `Could not generate AI drafts.`
- [ ] Re-run targeted tests and commit `fix: integrate signed uploads into sell flow`.

### Task 5: Verification

**Files:**
- Verify all modified files.

- [ ] Run `npm.cmd test -- --run` and require all tests to pass.
- [ ] Run `npx.cmd tsc --noEmit` and require zero errors.
- [ ] Run `$env:NEXT_TELEMETRY_DISABLED='1'; npx.cmd next build --debug` and require a successful production build.
- [ ] Run `git diff --check` and require no whitespace errors.
- [ ] Run a Playwright browser/network smoke test confirming image bytes go to Supabase Storage and `/api/products/bulk-drafts` receives JSON only.
- [ ] Commit any verification-only fixes separately, then request code review before merge.
