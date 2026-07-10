# Wanted Request Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let logged-in users create wanted-item subscriptions and receive email when newly listed products match their query, category, and budget.

**Architecture:** Add `wanted_requests` and `wanted_request_matches` tables, a deterministic matching library, a wanted-request API, and a buyer-facing panel under `/requests`. Product creation calls the matcher after a product is inserted; matching/email failures are logged and do not block listing creation.

**Tech Stack:** Next.js App Router, NextAuth session auth, Supabase admin client, existing `sendEmail` helper, Vitest, Radix UI, Tailwind.

---

### Task 1: Matching and Email Domain Logic

**Files:**
- Create: `app/lib/wantedRequests.ts`
- Test: `app/lib/wantedRequests.test.ts`

- [ ] Write tests for keyword matching, category and budget filtering, duplicate match handling inputs, and email copy.
- [ ] Implement deterministic token matching across product name, translations, descriptions, and category.
- [ ] Implement notification email builder with product URL and wanted-query context.
- [ ] Run focused tests and commit.

### Task 2: Wanted Requests API

**Files:**
- Create: `app/api/wanted-requests/route.ts`
- Test: `app/api/wanted-requests/route.test.ts`

- [ ] Write tests for auth-required GET/POST/PATCH/DELETE.
- [ ] Validate `query`, optional `maxPrice`, category, description, email subscription, and status transitions.
- [ ] Return normalized wanted requests for the current user only.
- [ ] Run focused tests and commit.

### Task 3: Product Create Match Hook

**Files:**
- Modify: `app/api/products/route.ts`
- Modify: `app/api/products/route.test.ts`
- Test: `app/lib/wantedRequests.test.ts`

- [ ] Write tests proving product creation calls wanted matching after a new insert but not on idempotent retry.
- [ ] Query active subscribed wanted requests after product insert.
- [ ] Insert unique match rows and send email for each new match.
- [ ] Swallow/log notification errors so listing creation still succeeds.
- [ ] Run focused tests and commit.

### Task 4: Requests Page UI

**Files:**
- Create: `app/components/WantedRequestsPanel.tsx`
- Modify: `app/requests/page.tsx`
- Modify: `app/i18n.tsx`
- Test: `app/components/WantedRequestsPanel.test.tsx`

- [ ] Add a tab switch between trade requests and wanted items.
- [ ] Build a compact wanted-item form with query, max price, category, description, and email subscription.
- [ ] Render cards with active/paused/fulfilled states and action buttons.
- [ ] Add English, Traditional Chinese, and Simplified Chinese copy.
- [ ] Run component tests and commit.

### Task 5: Supabase Schema

**Files:**
- Modify: `supabase/mvp-schema.sql`

- [ ] Add `wanted_requests` table, indexes, RLS policies, and status check.
- [ ] Add `wanted_request_matches` table, unique `(wanted_request_id, product_id)`, indexes, RLS policies, and email tracking fields.
- [ ] Run TypeScript/tests/build and commit schema.
