# AI Bulk Listing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AI-assisted bulk listing mode that lets a seller upload multiple photos, review editable AI-generated item drafts, and publish approved drafts as regular products.

**Architecture:** Keep unconfirmed AI results out of the database. The new API returns draft JSON only; final publishing reuses the existing `/api/products/images` and `/api/products` endpoints so existing image, translation, contact, and product rules remain the source of truth.

**Tech Stack:** Next.js App Router, React client state, Radix UI, OpenAI Responses API, Vitest.

---

## File Map

- Create `app/lib/aiProductDrafts.ts`: shared types, category normalization, OpenAI response parsing, fallback draft creation, and image-to-draft conversion.
- Create `app/lib/aiProductDrafts.test.ts`: TDD coverage for parser normalization, fallback behavior, and strict draft limits.
- Create `app/api/products/bulk-drafts/route.ts`: authenticated API accepting up to 10 images and returning editable drafts without writing to Supabase.
- Modify `app/sell/page.tsx`: add manual/AI mode switch, batch upload, draft review cards, edit/delete controls, and publish selected drafts through existing APIs.
- Modify `app/i18n.tsx`: add English, Traditional Chinese, and Simplified Chinese copy for AI bulk listing.

## Tasks

### Task 1: Draft Parser

**Files:**
- Create: `app/lib/aiProductDrafts.ts`
- Test: `app/lib/aiProductDrafts.test.ts`

- [ ] Write tests for parsing OpenAI JSON into normalized drafts.
- [ ] Verify tests fail because the module does not exist.
- [ ] Implement draft types, `parseAiDraftResponse`, and `createFallbackDrafts`.
- [ ] Run `npm.cmd test -- app/lib/aiProductDrafts.test.ts --run`.

### Task 2: Draft API

**Files:**
- Create: `app/api/products/bulk-drafts/route.ts`
- Modify: `app/lib/aiProductDrafts.ts`

- [ ] Add API validation for login, image file count 1-10, file type JPG/PNG/WebP, and max 5 MB per file.
- [ ] Call OpenAI Responses API with image data URLs when `OPENAI_API_KEY` exists.
- [ ] Fall back to one draft per image when OpenAI is unavailable or returns unusable JSON.
- [ ] Return `{ drafts }` only; do not upload images or write products.

### Task 3: Sell Page AI Mode

**Files:**
- Modify: `app/sell/page.tsx`
- Modify: `app/i18n.tsx`

- [ ] Add a segmented mode switch: manual listing / AI bulk listing.
- [ ] Add batch upload UI capped at 10 images.
- [ ] Call `/api/products/bulk-drafts` and render editable draft cards.
- [ ] Allow edit, delete, select/unselect, and per-draft warnings.
- [ ] Publish selected drafts by uploading each draft image to `/api/products/images`, then posting product data to `/api/products`.
- [ ] Show clear progress, per-draft errors, and success summary.

### Task 4: Verification

**Files:**
- Existing validation only.

- [ ] Run `npx.cmd tsc --noEmit`.
- [ ] Run `npm.cmd test -- --run`.
- [ ] Run `git diff --check`.
- [ ] Run `NEXT_TELEMETRY_DISABLED=1 npx.cmd next build --debug`.
