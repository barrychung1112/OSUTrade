# Locale-Aware AI Drafts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate AI listing drafts in the request locale and guarantee platform-specific languages for cross-post previews.

**Architecture:** Add a shared draft-locale contract to the AI draft parser and request payload. Keep one editable language per draft, then use the existing product-create translation pipeline at publish time. Cross-post preview remains one batched AI call but rejects incomplete localization instead of returning same-language fallback copy.

**Tech Stack:** Next.js 15, React, TypeScript, OpenAI Responses API, Vitest, Testing Library

---

### Task 1: Add the draft locale contract

**Files:**
- Modify: `app/lib/aiProductDrafts.ts`
- Modify: `app/lib/aiProductDrafts.test.ts`

- [ ] **Step 1: Write failing locale tests**

Add tests asserting that `parseAiDraftLocale("en" | "zh" | "zhCn")` succeeds, unsupported values return `null`, and parsed drafts retain the supplied locale.

- [ ] **Step 2: Verify the tests fail**

Run: `npx vitest run app/lib/aiProductDrafts.test.ts`

Expected: FAIL because the locale parser and draft locale field do not exist.

- [ ] **Step 3: Implement the locale contract**

Add:

```ts
export type AiDraftLocale = "en" | "zh" | "zhCn";

export function parseAiDraftLocale(value: unknown): AiDraftLocale | null {
  return value === "en" || value === "zh" || value === "zhCn" ? value : null;
}
```

Add `locale: AiDraftLocale` to `AiProductDraft` and accept a locale argument when normalizing AI output and fallback drafts.

- [ ] **Step 4: Verify the focused tests pass**

Run: `npx vitest run app/lib/aiProductDrafts.test.ts`

Expected: PASS.

### Task 2: Send and enforce the request locale

**Files:**
- Modify: `app/lib/bulkDraftRequest.ts`
- Modify: `app/lib/bulkDraftRequest.test.ts`
- Modify: `app/api/products/bulk-drafts/route.ts`
- Modify: `app/api/products/bulk-drafts/route.test.ts`

- [ ] **Step 1: Write failing request and route tests**

Assert that `createBulkDraftPayload(images, "zh")` includes `locale: "zh"`, each supported locale creates the expected OpenAI language instruction, and an unsupported locale returns HTTP 400 before the storage client or OpenAI is called.

- [ ] **Step 2: Verify the tests fail**

Run: `npx vitest run app/lib/bulkDraftRequest.test.ts app/api/products/bulk-drafts/route.test.ts`

Expected: FAIL because locale is not in the payload or route.

- [ ] **Step 3: Implement locale-aware generation**

Update `sendBulkDraftRequest(images, locale, fetcher)` and validate `body.locale` with `parseAiDraftLocale`. Map locales to explicit prompt instructions:

```ts
const draftLanguageInstructions = {
  en: "Write every draft name and description in English.",
  zh: "Write every draft name and description in Traditional Chinese.",
  zhCn: "Write every draft name and description in Simplified Chinese.",
};
```

Pass the validated locale into draft normalization so every returned draft records it.

- [ ] **Step 4: Verify focused tests pass**

Run: `npx vitest run app/lib/bulkDraftRequest.test.ts app/api/products/bulk-drafts/route.test.ts`

Expected: PASS.

### Task 3: Keep and display the draft language

**Files:**
- Modify: `app/sell/page.tsx`
- Modify: `app/components/BulkDraftFields.tsx`
- Modify: `app/components/BulkDraftFields.test.tsx`
- Modify: `app/i18n.tsx`

- [ ] **Step 1: Write a failing component test**

Render a Traditional Chinese draft and assert that a persistent language badge is visible while its editable values remain unchanged.

- [ ] **Step 2: Verify the test fails**

Run: `npx vitest run app/components/BulkDraftFields.test.tsx`

Expected: FAIL because no draft-language badge exists.

- [ ] **Step 3: Connect the active locale**

Read `locale` from `useI18n()`, pass it to `sendBulkDraftRequest`, and display a localized badge from `draft.locale`. Do not react to later global locale changes by mutating existing draft values.

- [ ] **Step 4: Verify the component test passes**

Run: `npx vitest run app/components/BulkDraftFields.test.tsx`

Expected: PASS.

### Task 4: Reject incorrect-language cross-post fallback

**Files:**
- Modify: `app/lib/crossPostPreview.ts`
- Modify: `app/lib/crossPostPreview.test.ts`
- Modify: `app/api/products/cross-post-preview/route.ts`
- Modify: `app/api/products/cross-post-preview/route.test.ts`

- [ ] **Step 1: Write failing translation-contract tests**

Change the incomplete-localization test to expect a `CrossPostTranslationError`. Add a route test asserting the error becomes HTTP 502 with code `CROSS_POST_TRANSLATION_FAILED`.

- [ ] **Step 2: Verify the tests fail**

Run: `npx vitest run app/lib/crossPostPreview.test.ts app/api/products/cross-post-preview/route.test.ts`

Expected: FAIL because invalid localization currently returns fallback copy.

- [ ] **Step 3: Implement explicit translation failure**

Export `CrossPostTranslationError`, throw it when OpenAI is unavailable, returns a non-success status, times out, or produces incomplete localized items/platform headings, and map it to the safe 502 response in the route.

- [ ] **Step 4: Verify the focused tests pass**

Run: `npx vitest run app/lib/crossPostPreview.test.ts app/api/products/cross-post-preview/route.test.ts`

Expected: PASS.

### Task 5: Complete verification and integration

**Files:**
- Verify all modified files above.

- [ ] **Step 1: Run the full test suite**

Run: `npm test -- --run`

Expected: all tests pass.

- [ ] **Step 2: Run TypeScript and production build checks**

Run: `npx tsc --noEmit`

Expected: exit code 0.

Run: `npx next build --debug`

Expected: exit code 0 in the external verification checkout or Vercel preview.

- [ ] **Step 3: Run responsive UI verification**

Use Playwright at 375px and 1280px. Confirm the language badge is visible, fields do not overflow, and changing the global language does not replace draft field values.

- [ ] **Step 4: Commit and open one PR**

Commit the implementation, push `codex/locale-aware-ai-drafts`, open a PR against `master`, request Codex review, address actionable feedback, and merge only after Vercel succeeds.
