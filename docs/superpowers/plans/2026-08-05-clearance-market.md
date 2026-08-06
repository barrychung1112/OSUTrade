# Clearance Market Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reversible free and $1 clearance pricing while preserving original prices, percentage discounts, and the existing request workflow.

**Architecture:** Supabase remains authoritative by generating `effective_price` from `clearance_price` first and the existing discount expression second. Shared pricing helpers expose clearance metadata to all API and UI surfaces. Seller mutations validate allowed values and reuse the active-request lock, while Marketplace filtering remains server-side and paginated.

**Tech Stack:** Next.js 15 App Router, TypeScript, React 19, Supabase/PostgreSQL, Vitest, Playwright.

---

### Task 1: Database contract

**Files:**
- Create: `supabase/product-clearance.sql`
- Modify: `supabase/mvp-schema.sql`
- Modify: `supabase/mvp-schema.test.ts`

- [ ] Add a failing schema test requiring nullable `clearance_price`, the `NULL/0/1` constraint, and clearance-first `effective_price` generation.
- [ ] Run `npm test -- supabase/mvp-schema.test.ts` and verify it fails.
- [ ] Add the idempotent migration and mirror it in the full schema.
- [ ] Run the schema test and verify it passes.

### Task 2: Shared pricing contract

**Files:**
- Modify: `app/lib/productDiscount.ts`
- Modify: `app/lib/productDiscount.test.ts`

- [ ] Add failing tests for normal, discounted, free-clearance, $1-clearance, and application fallback pricing.
- [ ] Run `npm test -- app/lib/productDiscount.test.ts` and verify failure.
- [ ] Add `parseClearancePrice` and return `clearancePrice`, `isClearance`, and clearance-aware `isDiscounted` from `getProductPricing`.
- [ ] Run the focused test and verify it passes.

### Task 3: Seller API validation and locking

**Files:**
- Modify: `app/lib/sellerProductUpdate.ts`
- Modify: `app/lib/sellerProductUpdate.test.ts`
- Modify: `app/lib/productEditLock.ts`
- Modify: `app/api/seller/products/route.ts`

- [ ] Add failing validation tests for `null`, `0`, `1`, invalid clearance prices, and sold-product changes.
- [ ] Extend seller edit input with `clearancePrice` and map it to `clearance_price`.
- [ ] Treat clearance changes as price edits in the existing active-request lock.
- [ ] Include clearance metadata in seller API responses and keep notification price comparisons based on effective prices.
- [ ] Run seller update and edit-lock tests.

### Task 4: Public products and filtering

**Files:**
- Modify: `app/api/products/route.ts`
- Modify: `app/api/products/[id]/route.ts`
- Modify: `app/lib/products.tsx`
- Modify: `app/lib/demoProducts.ts`
- Add or modify focused API/helper tests beside these modules.

- [ ] Add failing tests for clearance response fields and `clearance=true` filtering.
- [ ] Map clearance fields through list/detail APIs.
- [ ] Add the server-side clearance filter without changing pagination, search, category, or sorting.
- [ ] Keep demo fallback behavior contract-compatible.
- [ ] Run focused tests.

### Task 5: Seller controls

**Files:**
- Modify: `app/seller/page.tsx`
- Modify: `app/i18n.tsx`
- Modify: `app/globals.css`

- [ ] Add localized free, $1, cancel, active, success, invalid, and locked labels.
- [ ] Add a compact clearance control to each editable product using existing button and menu styles.
- [ ] Preserve percentage discount state while clearance is active.
- [ ] Disable clearance changes for sold products or products with active requests and show the reason.
- [ ] Verify keyboard focus, disabled states, and mobile layout.

### Task 6: Marketplace, product detail, cart, and requests

**Files:**
- Modify: `app/overview/page.tsx`
- Modify: `app/product/[id]/page.tsx`
- Modify: `app/cart/page.tsx`
- Modify: `app/components/ProductListCard.tsx`
- Modify: `app/i18n.tsx`
- Modify: `app/globals.css`
- Modify relevant component/helper tests.

- [ ] Add a clearance filter that composes with existing Marketplace controls.
- [ ] Render original price, free/$1 effective price, and a clearance badge consistently on cards and product detail.
- [ ] Audit price formatting and totals so numeric zero is never treated as missing.
- [ ] Confirm request creation stores zero in `price_at_request` and price-change warnings remain correct.
- [ ] Add localized empty and badge states in all three languages.

### Task 7: Verification and release

**Files:**
- Modify only if verification exposes defects.

- [ ] Run focused Vitest suites.
- [ ] Run the full `npm test -- --run` suite.
- [ ] Run `npm run build`.
- [ ] Start the local app and use Playwright at desktop and mobile widths for seller controls, Marketplace clearance filtering, product detail, cart zero totals, and active-request locking.
- [ ] Run `git diff --check` and inspect the final diff for unrelated changes or secrets.
- [ ] Commit implementation, push `codex/clearance-market`, open a PR, request Copilot review, address actionable feedback, rerun verification, and merge only after checks pass.
