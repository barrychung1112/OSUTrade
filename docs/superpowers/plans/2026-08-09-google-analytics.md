# Google Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record GA4 traffic for OSUTrade production deployments using measurement ID `G-EE1HLRT49M` without tracking local or Preview traffic.

**Architecture:** A pure analytics configuration module owns the public measurement ID and deployment-environment decision. The App Router root layout conditionally renders Next.js scripts after hydration, so analytics cannot block the site or affect application behavior.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Vitest, `next/script`

---

### Task 1: Production analytics policy

**Files:**
- Create: `app/lib/googleAnalytics.test.ts`
- Create: `app/lib/googleAnalytics.ts`

- [ ] **Step 1: Write the failing policy tests**

Create tests asserting that `shouldEnableGoogleAnalytics("production")` returns `true`, while `preview`, `development`, and `undefined` return `false`, and that the measurement ID equals `G-EE1HLRT49M`.

- [ ] **Step 2: Run the focused test and verify RED**

Run `npm test -- app/lib/googleAnalytics.test.ts` and expect failure because `app/lib/googleAnalytics.ts` does not exist.

- [ ] **Step 3: Add the minimal analytics policy**

Export `GA_MEASUREMENT_ID` and a `shouldEnableGoogleAnalytics(vercelEnvironment)` function that returns true only for `production`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run `npm test -- app/lib/googleAnalytics.test.ts` and expect all policy tests to pass.

### Task 2: Root layout integration

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Integrate the scripts**

Import `Script` from `next/script` and the analytics policy. When enabled, render the external `gtag.js` script and an inline initialization script with `strategy="afterInteractive"`.

- [ ] **Step 2: Verify the complete change**

Run `npm test`, `npm run build`, and `git diff --check`. Expect zero test failures, a successful production build, and no whitespace errors.

- [ ] **Step 3: Commit the implementation**

Commit the test and implementation as `feat: add production Google Analytics tracking`.

### Task 3: Review and release

**Files:**
- No additional source files expected.

- [ ] **Step 1: Review the branch diff against the approved design**

Confirm the tag is production-only, contains no secret, uses `afterInteractive`, and does not collect custom user data.

- [ ] **Step 2: Push and open a PR**

Push `codex/google-analytics`, create a ready PR, request Copilot review, and address actionable feedback.

- [ ] **Step 3: Merge and verify production**

Merge only after required checks pass. Confirm the deployed HTML references `googletagmanager.com/gtag/js?id=G-EE1HLRT49M` and the inline configuration uses the same ID.
