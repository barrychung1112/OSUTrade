# Product Discounts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add safe preset seller discounts with database-generated effective prices.

**Architecture:** PostgreSQL owns effective-price calculation. Shared TypeScript mapping keeps buyer APIs on effective prices and seller editing on original prices, while the existing request snapshot and notification mechanisms remain authoritative.

**Tech Stack:** Next.js, TypeScript, Supabase/PostgreSQL, React, Vitest

---

### Task 1: Price contract and schema
- [ ] Add failing tests for allowed discounts and effective-price mapping.
- [ ] Add `discount_percent` and generated `effective_price` schema columns.
- [ ] Implement the shared discount helper and pass focused tests.

### Task 2: API integration
- [ ] Update product serializers and creation defaults.
- [ ] Update seller editing to validate discounts and compare effective prices for notifications.
- [ ] Confirm request creation snapshots the effective price.

### Task 3: Seller and buyer UI
- [ ] Add seller preset discount controls and preview.
- [ ] Display sale pricing on cards and product details.
- [ ] Add English, Traditional Chinese, and Simplified Chinese copy.

### Task 4: Verification and delivery
- [ ] Run focused and full tests, TypeScript, build, and diff checks.
- [ ] Commit, push, create a PR, review, and merge after checks pass.

