# Disposable Email Domain Blocklist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reject new email/password and first-time Google registrations that use active disposable email domains stored in Supabase.

**Architecture:** A service-role-only Supabase table stores normalized domains. A shared server utility extracts domain suffixes, queries active matches, and fails open with structured logging. Existing signup and Google profile flows call the utility before creating an account, while existing users bypass the check.

**Tech Stack:** Next.js 15, TypeScript, Supabase Auth/Postgres, Vitest

---

### Task 1: Add The Supabase Blocklist Schema

**Files:**
- Modify: `supabase/mvp-schema.sql`
- Modify: `supabase/mvp-schema.test.ts`

- [ ] Add failing schema assertions for `disposable_email_domains`, its normalized-domain constraint, RLS, and the `hutdot.com` seed.
- [ ] Run `npm test -- supabase/mvp-schema.test.ts --run` and confirm the new assertions fail.
- [ ] Add the table, constraint, RLS configuration, index, and idempotent seed to `mvp-schema.sql`.
- [ ] Re-run the focused schema test and confirm it passes.
- [ ] Commit with `feat: add disposable email domain schema`.

### Task 2: Implement Fail-Open Domain Matching

**Files:**
- Create: `utils/auth/disposableEmail.ts`
- Create: `utils/auth/disposableEmail.test.ts`

- [ ] Add tests for exact matches, case normalization, subdomain suffixes, unrelated domains, and lookup failures.
- [ ] Run `npm test -- utils/auth/disposableEmail.test.ts --run` and confirm the module is missing.
- [ ] Implement `checkDisposableEmail(email, admin)` returning `{ blocked: boolean }`, querying active candidate domains with the supplied admin client.
- [ ] Log one structured `console.error` and return `{ blocked: false }` when the query fails.
- [ ] Re-run the focused test and confirm all cases pass.
- [ ] Commit with `feat: detect disposable email domains`.

### Task 3: Protect Email And Password Signup

**Files:**
- Modify: `app/api/auth/signup/route.ts`
- Create: `app/api/auth/signup/route.test.ts`

- [ ] Add route tests proving a blocked address returns HTTP 400 with `DISPOSABLE_EMAIL_NOT_ALLOWED` before username lookup or Auth signup, while an allowed address follows the existing flow.
- [ ] Run `npm test -- app/api/auth/signup/route.test.ts --run` and confirm the blocked case fails.
- [ ] Call the shared checker immediately after existing email validation and return the stable error payload when blocked.
- [ ] Re-run the focused route test and confirm it passes.
- [ ] Commit with `feat: block disposable email signup`.

### Task 4: Protect First-Time Google Registration

**Files:**
- Modify: `utils/auth/googleProfile.ts`
- Modify: `utils/auth/googleProfile.test.ts`

- [ ] Add tests proving an existing public user bypasses the blocklist, while a new blocked Google profile is rejected before `auth.admin.createUser`.
- [ ] Run `npm test -- utils/auth/googleProfile.test.ts --run` and confirm the first-time blocked case fails.
- [ ] Invoke the shared checker only after the existing-user lookup returns no profile and throw a stable `DISPOSABLE_EMAIL_NOT_ALLOWED` error on a match.
- [ ] Re-run the focused Google profile tests and confirm they pass.
- [ ] Commit with `feat: block disposable Google registration`.

### Task 5: Localize Registration Guidance

**Files:**
- Modify: `app/i18n.tsx`
- Modify: `app/components/SignUpModal.tsx`
- Add or modify the closest existing component test if available.

- [ ] Add English, Traditional Chinese, and Simplified Chinese translations for permanent-email guidance.
- [ ] Map `DISPOSABLE_EMAIL_NOT_ALLOWED` to the localized message while retaining the API message fallback for other errors.
- [ ] Run the focused UI test or TypeScript build check and confirm the mapping works in all three dictionaries.
- [ ] Commit with `feat: explain disposable email restriction`.

### Task 6: Verify And Prepare Release

**Files:**
- Review all files changed in Tasks 1-5.

- [ ] Run `npm test -- --run` and require all test files to pass.
- [ ] Run `npm run build` and require a successful production build.
- [ ] Run `git diff --check` and inspect the final diff for credentials or unrelated changes.
- [ ] Provide the exact production SQL extracted from `supabase/mvp-schema.sql` for manual execution before deployment.
- [ ] Push the branch, open a PR, request code review, wait for checks, and merge only after approval.
