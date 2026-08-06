# Automatic One-Dollar Clearance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Include every product with an effective $1 price in the Marketplace clearance filter without changing its explicit clearance presentation.

**Architecture:** A focused query helper applies one server-side OR condition: explicit `clearance_price` or `effective_price = 1`. Demo filtering mirrors the same discovery rule. Existing `isClearance` presentation remains based only on `clearance_price`.

**Tech Stack:** Next.js 15, TypeScript, Supabase PostgREST, Vitest, Playwright.

---

### Task 1: Query rule

**Files:**
- Create: `app/lib/productClearance.ts`
- Create: `app/lib/productClearance.test.ts`
- Modify: `app/api/products/route.ts`

- [ ] Write a failing test asserting the query uses `clearance_price.not.is.null,effective_price.eq.1`.
- [ ] Implement the query helper and use it in the products API.
- [ ] Run the focused test.

### Task 2: Demo parity

**Files:**
- Modify: `app/lib/demoProducts.ts`
- Create: `app/lib/demoProducts.test.ts`

- [ ] Write a failing test proving an ordinary effective-price `$1` product appears in clearance results.
- [ ] Update Demo filtering while leaving `isClearance` unchanged.
- [ ] Run focused tests.

### Task 3: Verification and release

**Files:**
- Modify only if verification exposes a defect.

- [ ] Run the complete Vitest suite and production build.
- [ ] Use Playwright to confirm the clearance filter remains usable on desktop and mobile.
- [ ] Push the isolated branch, create a PR, complete automated review, address findings, and merge after checks pass.
