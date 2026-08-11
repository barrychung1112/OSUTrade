# Public Product Image Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-enable responsive Vercel image delivery for public product images while controlling repeat transformations through caching.

**Architecture:** Existing public `next/image` components continue using a centralized bypass policy. The policy returns false for Supabase product images, and Next.js configuration sets a long minimum cache TTL.

**Tech Stack:** Next.js Image, TypeScript, Vitest, Vercel Image Optimization

---

### Task 1: Restore the public image policy

**Files:**
- Modify: `app/lib/productImageOptimization.test.ts`
- Modify: `app/lib/productImageOptimization.ts`

- [ ] Change the Supabase test to require optimization and verify it fails.
- [ ] Disable the emergency bypass and verify the focused test passes.

### Task 2: Configure cache behavior

**Files:**
- Modify: `next.config.js`

- [ ] Set `minimumCacheTTL` to 2,592,000 seconds (30 days).
- [ ] Run all tests, production build, and `git diff --check`.

### Task 3: Review and release

**Files:**
- No additional source files expected.

- [ ] Push one independent PR and request automated code review.
- [ ] Verify Vercel Preview checks and optimized image responses.
- [ ] Merge only after all checks and review findings are clear.
