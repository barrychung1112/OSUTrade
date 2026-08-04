# Seller Request Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move seller request management into a responsive fixed Request Center drawer.

**Architecture:** Extract request grouping into a pure helper and render the existing request rows inside a focused client-side dialog component owned by the seller page. Existing API calls and update callbacks remain unchanged.

**Tech Stack:** Next.js, React, TypeScript, Radix UI, Lucide, Vitest, Playwright CLI.

---

### Task 1: Request grouping contract

**Files:**
- Create: `app/lib/sellerRequestCenter.ts`
- Create: `app/lib/sellerRequestCenter.test.ts`

- [ ] Add a pure `groupSellerRequests` helper that returns pending, expired, and history arrays.
- [ ] Verify pending counts and grouping with Vitest.

### Task 2: Request Center interface

**Files:**
- Modify: `app/seller/page.tsx`
- Modify: `app/globals.css`
- Modify: `app/i18n.tsx`

- [ ] Replace the page request section with a fixed trigger and modal drawer.
- [ ] Connect the summary card, request actions, close interactions, body-scroll lock, and focus restoration.
- [ ] Add responsive desktop and mobile styles plus three-language copy.

### Task 3: Verification and release

**Files:**
- Test: `app/lib/sellerRequestCenter.test.ts`

- [ ] Run TypeScript, focused tests, the full test suite, and production build.
- [ ] Validate desktop/mobile interaction with Playwright and check console errors.
- [ ] Commit, open a PR, request Copilot review, and merge only after required checks pass.
