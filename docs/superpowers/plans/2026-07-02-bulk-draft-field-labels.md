# Bulk Draft Field Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add visible, localized labels and an unmistakable USD price field to AI bulk listing drafts.

**Architecture:** Extract the editable field group from the large sell page into a focused `BulkDraftFields` component. The parent retains draft state and passes a patch callback, so publishing behavior remains unchanged.

**Tech Stack:** Next.js 15, React, TypeScript, Tailwind CSS, Vitest, Testing Library

---

### Task 1: Add the labeled field component

**Files:**
- Create: `app/components/BulkDraftFields.tsx`
- Create: `app/components/BulkDraftFields.test.tsx`

- [ ] **Step 1: Write a failing component test**

Render a draft and assert that localized item name, description, price, quantity, and category labels are associated with their controls. Assert that `$` is visible and changing price emits `{ price: 25 }`.

- [ ] **Step 2: Run the focused test**

Run: `npx vitest run app/components/BulkDraftFields.test.tsx`

Expected: FAIL because `BulkDraftFields` does not exist.

- [ ] **Step 3: Implement the component**

Create labeled name and description controls, then a responsive price, quantity, and category grid. Place an `aria-hidden` dollar prefix inside the price control and add `inputMode="decimal"`; use `inputMode="numeric"` for quantity.

- [ ] **Step 4: Run the focused test**

Run: `npx vitest run app/components/BulkDraftFields.test.tsx`

Expected: PASS.

### Task 2: Integrate and verify

**Files:**
- Modify: `app/sell/page.tsx`

- [ ] **Step 1: Replace the inline controls**

Import `BulkDraftFields` and pass the current draft, disabled state, category list, and `updateBulkDraft` callback.

- [ ] **Step 2: Run complete verification**

Run: `npm test -- --run`

Expected: all tests pass.

Run: `npx tsc --noEmit`

Expected: exit code 0.

- [ ] **Step 3: Verify responsive UI**

Use Playwright at 375px and 1280px widths. Confirm visible labels, `$` prefix, no horizontal overflow, and unchanged draft editing.
