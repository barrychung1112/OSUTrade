# Account Display Name And Seller Return Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add self-service display-name changes and stable Marketplace returns from seller profiles.

**Architecture:** A protected profile API owns validation, uniqueness, and both public-profile and Supabase Auth metadata updates. Header owns the compact account dialog and refreshes its NextAuth display token after the canonical API response. Marketplace and seller pages carry a validated internal return URL.

**Tech Stack:** Next.js App Router, NextAuth JWT sessions, Supabase Admin API, Vitest, React Testing Library.

---

### Task 1: Display-name contract and protected API

**Files:**
- Create: `app/lib/displayName.ts`
- Create: `app/lib/displayName.test.ts`
- Create: `app/api/account/display-name/route.ts`
- Create: `app/api/account/display-name/route.test.ts`

- [ ] Write failing validation and route tests for a valid name, duplicate name,
  invalid name, and current-user-only update.
- [ ] Run the targeted tests and verify the new imports fail before implementation.
- [ ] Implement shared validation and `PATCH` route with active-account checks,
  case-insensitive duplicate lookup excluding the current id, public profile
  update, and Supabase Auth metadata update.
- [ ] Re-run the targeted tests and commit `feat: add display name update API`.

### Task 2: Account-menu editing and session refresh

**Files:**
- Modify: `app/components/Header.tsx`
- Modify: `app/components/Header.test.tsx`
- Modify: `app/i18n.tsx`
- Modify: `auth.ts`

- [ ] Write failing Header tests for the seller-profile link and successful name edit.
- [ ] Run the Header test to verify the controls do not exist yet.
- [ ] Add localized labels, dialog state, API submission, and `useSession().update`.
  Handle JWT update triggers using the API-returned display name.
- [ ] Re-run Header tests and commit `feat: add account display name controls`.

### Task 3: Preserve Marketplace state through seller profiles

**Files:**
- Create: `app/lib/sellerProfileReturn.ts`
- Create: `app/lib/sellerProfileReturn.test.ts`
- Modify: `app/components/ProductCard.tsx`
- Modify: `app/components/ProductCard.test.tsx`
- Modify: `app/overview/MarketplaceClient.tsx`
- Modify: `app/sellers/[sellerId]/page.tsx`
- Modify: `app/sellers/[sellerId]/SellerProfileClient.tsx`
- Modify: `app/sellers/[sellerId]/SellerProfileClient.test.tsx`

- [ ] Write failing tests proving that a Marketplace seller link keeps
  `/overview?page=2&favorites=1` and that unsafe return targets are rejected.
- [ ] Run the focused tests to verify failure.
- [ ] Add a narrowly scoped return URL helper, propagate valid return URLs into
  seller links, and use the resolved back URL in the seller page.
- [ ] Re-run focused tests and commit `fix: preserve marketplace state from seller profiles`.

### Task 4: Verification

**Files:**
- No production-code changes expected.

- [ ] Run `npm test -- --run` and `npm run build`.
- [ ] Start the app with local environment variables and use Playwright to
  inspect Header account controls and a mobile seller-return link.
- [ ] Run `git diff --check` before preparing a PR.
