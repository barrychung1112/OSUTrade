# Restore Accepted Request Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore inventory and listing editability when a seller closes an accepted request that did not result in a completed trade.

**Architecture:** A pure transition helper validates and calculates the inventory restoration. The seller request API applies guarded writes with compensation, while the seller dashboard exposes the action and the notification module tells the buyer what changed.

**Tech Stack:** Next.js App Router, TypeScript, Supabase, React, Vitest

---

### Task 1: Model the restoration transition

**Files:**
- Create: `app/lib/sellerRequestCancellation.ts`
- Create: `app/lib/sellerRequestCancellation.test.ts`

- [ ] Write failing tests for accepted requests, partial remaining inventory, and invalid request/product states.
- [ ] Run the focused test and verify it fails because the helper is missing.
- [ ] Implement the minimal transition helper returning restored quantity and `available` status.
- [ ] Run the focused test and verify it passes.

### Task 2: Apply the guarded API transition

**Files:**
- Modify: `app/api/seller/requests/route.ts`
- Create: `app/api/seller/requests/route.test.ts`

- [ ] Write a failing route test that cancels an accepted request and restores its quantity.
- [ ] Add the guarded `accepted` to `cancelled` transition and product restoration.
- [ ] Compensate by restoring request status to `accepted` when the product update fails.
- [ ] Verify the focused route tests pass.

### Task 3: Add notification and seller action

**Files:**
- Modify: `app/lib/notifications.ts`
- Modify: `app/lib/notifications.test.ts`
- Modify: `app/seller/page.tsx`
- Modify: `app/i18n.tsx`

- [ ] Write failing notification tests for a seller-closed accepted trade.
- [ ] Add buyer-facing notification copy and dispatch it after restoration.
- [ ] Add the seller action with an undo-style icon and localized labels in English, Traditional Chinese, and Simplified Chinese.
- [ ] Reload seller requests and products after the action succeeds.

### Task 4: Verify and release

**Files:**
- No additional source files expected.

- [ ] Run focused tests, the full suite, production build, and `git diff --check`.
- [ ] Review the complete diff against the approved design.
- [ ] Commit, push, open one PR, request Copilot review, and merge only after checks pass.
