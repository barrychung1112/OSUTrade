# Enforce Account Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deny banned and blocklisted accounts across login and every private OSUTrade API.

**Architecture:** A shared server-only guard reads the NextAuth session, verifies the authoritative Supabase Auth user, and checks the existing `disposable_email_domains` blocklist. Private APIs use the guard rather than trusting a stale JWT.

**Tech Stack:** Next.js route handlers, NextAuth v5, Supabase Auth admin API, Vitest.

---

### Task 1: Account-access guard

**Files:**
- Create: `utils/auth/requireActiveUser.ts`
- Test: `utils/auth/requireActiveUser.test.ts`

- [ ] **Step 1: Write failing tests** for no session (401), a future `banned_until` (403), a blocklisted email (403), and an expired `banned_until` (allowed).
- [ ] **Step 2: Run** `npx vitest run utils/auth/requireActiveUser.test.ts` and confirm missing-module failure.
- [ ] **Step 3: Implement** `requireActiveUser()` to call `auth()`, `admin.auth.admin.getUserById()`, and `checkDisposableEmail()`, returning the session only for an active permitted user.
- [ ] **Step 4: Run** `npx vitest run utils/auth/requireActiveUser.test.ts` and confirm all cases pass.

### Task 2: Guard private APIs

**Files:**
- Modify: every `app/api/**/route.ts` handler that currently calls `auth()`
- Test: `app/api/products/route.test.ts`, `app/api/products/images/route.test.ts`

- [ ] **Step 1: Write failing route tests** asserting banned requests to `POST /api/products` and `POST /api/products/images` return 403 before database or storage writes.
- [ ] **Step 2: Run** the two route tests and confirm they fail because handlers still trust `auth()` directly.
- [ ] **Step 3: Replace** each direct API `auth()` check with `requireActiveUser()` and map typed access errors to their status and message.
- [ ] **Step 4: Run** the two route tests and confirm they pass.

### Task 3: Blocklist-aware login

**Files:**
- Modify: `utils/auth/passwordLogin.ts`, `utils/auth/googleProfile.ts`
- Test: `utils/auth/passwordLogin.test.ts`, `utils/auth/googleProfile.test.ts`

- [ ] **Step 1: Write failing tests** proving password login and a previously created Google account with a blocklisted domain are rejected.
- [ ] **Step 2: Run** the authentication tests and confirm the new assertions fail.
- [ ] **Step 3: Check** the existing blocklist before password authentication and before returning any Google account, including an existing account.
- [ ] **Step 4: Run** the authentication tests and confirm they pass.

### Task 4: Full verification

**Files:**
- Modify: none

- [ ] **Step 1: Run** `npm test -- --exclude '**/.worktrees/**' --exclude '**/node_modules/**'`.
- [ ] **Step 2: Run** `npm run build`.
- [ ] **Step 3: Inspect** `git diff --check` and `git status --short`.
- [ ] **Step 4: Commit** the tested implementation with `git commit -m "fix: enforce banned and blocklisted account access"`.
