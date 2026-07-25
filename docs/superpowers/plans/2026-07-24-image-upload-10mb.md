# 10 MB Product Image Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise the product image size limit from 5 MB to 10 MB across validation, UI guidance, and Supabase Storage.

**Architecture:** Keep the current upload flow and change the shared boundary consistently at the API, copy, and storage layers. Add boundary-focused tests before changing production behavior.

**Tech Stack:** Next.js, TypeScript, Vitest, Supabase Storage

---

### Task 1: Add failing 10 MB boundary tests

**Files:**
- Modify: `app/api/products/images/route.test.ts`
- Modify: `supabase/mvp-schema.test.ts`

- [ ] Add a test proving a 10 MB image is accepted and a file one byte larger is rejected.
- [ ] Change the schema contract expectation from `5242880` to `10485760`.
- [ ] Run the focused tests and confirm they fail against the 5 MB implementation.

### Task 2: Apply the 10 MB limit consistently

**Files:**
- Modify: `app/api/products/images/route.ts`
- Modify: `app/i18n.tsx`
- Modify: `supabase/mvp-schema.sql`

- [ ] Change the API byte limit and error message to 10 MB.
- [ ] Update English, Traditional Chinese, and Simplified Chinese guidance.
- [ ] Change the bucket size limit to `10485760`.
- [ ] Run the focused tests and confirm they pass.

### Task 3: Verify and deliver

- [ ] Run the full test suite.
- [ ] Run `npx.cmd tsc --noEmit`.
- [ ] Run `npm.cmd run build`.
- [ ] Commit, push, open a PR, review, and merge after checks pass.

