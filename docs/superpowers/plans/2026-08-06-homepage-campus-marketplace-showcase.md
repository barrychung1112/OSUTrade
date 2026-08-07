# Homepage Campus Marketplace Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dark homepage banner with a bright, product-led campus marketplace hero and immediately visible recent and clearance inventory.

**Architecture:** Keep the existing homepage route, authentication gate, product API, and random-product selector. Refine `HomeHero` for the approved two-column layout and introduce one focused discovery component that independently loads recent and clearance inventory, preserving stable loading and failure states.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind/global CSS, Framer Motion, Lucide React, Vitest, Playwright.

---

### Task 1: Lock Product Discovery Queries

**Files:**
- Create: `app/lib/homeDiscoveryProducts.ts`
- Create: `app/lib/homeDiscoveryProducts.test.ts`

- [ ] **Step 1: Write failing tests for recent and clearance URLs**

```ts
import { describe, expect, test } from "vitest";
import {
  HOME_CLEARANCE_PRODUCTS_URL,
  HOME_RECENT_PRODUCTS_URL,
} from "./homeDiscoveryProducts";

describe("homepage discovery queries", () => {
  test("loads the latest available inventory", () => {
    expect(HOME_RECENT_PRODUCTS_URL).toBe("/api/products?limit=4&sort=desc");
  });

  test("loads clearance inventory independently", () => {
    expect(HOME_CLEARANCE_PRODUCTS_URL).toBe(
      "/api/products?limit=4&sort=asc&clearance=true"
    );
  });
});
```

- [ ] **Step 2: Run the focused test and verify missing-module failure**

Run: `npm test -- app/lib/homeDiscoveryProducts.test.ts`

Expected: FAIL because `homeDiscoveryProducts.ts` does not exist.

- [ ] **Step 3: Add the query constants**

```ts
export const HOME_RECENT_PRODUCTS_URL = "/api/products?limit=4&sort=desc";
export const HOME_CLEARANCE_PRODUCTS_URL =
  "/api/products?limit=4&sort=asc&clearance=true";
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm test -- app/lib/homeDiscoveryProducts.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the query contract**

```powershell
git add app/lib/homeDiscoveryProducts.ts app/lib/homeDiscoveryProducts.test.ts
git commit -m "test: define homepage discovery queries"
```

### Task 2: Add Localized Homepage Copy

**Files:**
- Modify: `app/i18n.tsx`

- [ ] **Step 1: Add equivalent keys to all three locale dictionaries**

Add keys for:

```ts
"home.showcaseEyebrow"
"home.showcaseTitle"
"home.showcaseBody"
"home.sellItem"
"home.freeToBrowse"
"home.campusPickup"
"home.directSellerContact"
"home.available"
"home.recentListings"
"home.recentListingsSubtitle"
"home.clearanceCorner"
"home.clearanceCornerSubtitle"
```

English must convey the approved copy. Traditional Chinese and Simplified Chinese must use natural localized equivalents rather than literal word-for-word translation.

- [ ] **Step 2: Run TypeScript and existing i18n coverage**

Run: `npm test -- app/i18n.test.tsx`

Expected: PASS if the file exists; otherwise run `npx tsc --noEmit` and expect zero errors.

- [ ] **Step 3: Commit localized copy**

```powershell
git add app/i18n.tsx
git commit -m "feat: localize homepage showcase copy"
```

### Task 3: Rebuild the Hero Composition

**Files:**
- Modify: `app/components/HomeHero.tsx`
- Modify: `app/lib/homeHeroProducts.test.ts`

- [ ] **Step 1: Extend selector tests for fallback-safe inventory**

Verify the selector excludes unavailable, zero-quantity, and image-less products while returning no more than three unique products.

- [ ] **Step 2: Run the selector test**

Run: `npm test -- app/lib/homeHeroProducts.test.ts`

Expected: PASS before visual work, establishing the existing data contract.

- [ ] **Step 3: Replace hero copy and trust row**

Use localized headline copy, keep `/overview` as the primary link, preserve `onSell`, and render the three trust signals as text with Lucide icons. The heading remains the only `h1` on the page.

- [ ] **Step 4: Add listing overlays to live product tiles**

Each live tile must render localized name, formatted price, and localized availability text inside the link. Fallback tiles render images only with `aria-hidden="true"` and no invented metadata.

- [ ] **Step 5: Keep motion bounded and reduced-motion aware**

Use opacity plus at most 12px translation for copy, 60ms product stagger, and at most 4px hover lift. Keep the existing `useReducedMotion` branch.

- [ ] **Step 6: Run focused tests and type checking**

Run: `npm test -- app/lib/homeHeroProducts.test.ts`

Run: `npx tsc --noEmit`

Expected: PASS with zero TypeScript errors.

- [ ] **Step 7: Commit the hero implementation**

```powershell
git add app/components/HomeHero.tsx app/lib/homeHeroProducts.test.ts
git commit -m "feat: rebuild homepage marketplace hero"
```

### Task 4: Build Recent and Clearance Discovery Sections

**Files:**
- Create: `app/components/HomeDiscoverySections.tsx`
- Modify: `app/page.tsx`
- Delete: `app/components/ProductListCard.tsx` only if no remaining imports exist

- [ ] **Step 1: Create an independent loader for each section**

Fetch `HOME_RECENT_PRODUCTS_URL` and `HOME_CLEARANCE_PRODUCTS_URL` in parallel with one `AbortController`. Track loading and failure independently so one failed section does not hide the other.

- [ ] **Step 2: Render a shared listing presentation**

Each section renders four products with localized names, optimized images, effective prices, original-price strike-through where applicable, and links to `/product/{id}`. Clearance links to `/overview?clearance=1`; recent listings link to `/overview`.

- [ ] **Step 3: Preserve stable loading and empty dimensions**

Render four fixed-aspect skeletons while loading. Empty and error states retain section height and include a visible browse link.

- [ ] **Step 4: Replace `ProductListCard` on the homepage**

Update `app/page.tsx` to render `<HomeDiscoverySections />` directly below the hero, before market signals.

- [ ] **Step 5: Verify no stale imports remain**

Run: `rg -n "ProductListCard" app`

Expected: no import remains if the old component is deleted.

- [ ] **Step 6: Run type checking**

Run: `npx tsc --noEmit`

Expected: zero errors.

- [ ] **Step 7: Commit discovery sections**

```powershell
git add app/components/HomeDiscoverySections.tsx app/page.tsx app/components/ProductListCard.tsx
git commit -m "feat: add homepage discovery sections"
```

### Task 5: Apply the Responsive Visual System

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Replace dark hero tokens and layout**

Set the hero to warm white, near-black text, orange primary action, an understated secondary action, and a two-column layout within the existing 1240px content width. Remove the dark grid treatment.

- [ ] **Step 2: Style the layered product showcase**

Use fixed aspect ratios, restrained 6px borders/radii, consistent shadows, and stable overlay placement. Ensure product names wrap to two lines and prices use tabular figures.

- [ ] **Step 3: Style discovery sections without nested cards**

Use full-width unframed sections and individual product tiles. Keep section headings compact and reveal the first discovery row at a 768px desktop viewport.

- [ ] **Step 4: Implement mobile horizontal product browsing**

At 640px and below, stack hero content and use a horizontal snap strip with the next product partially visible. Keep controls at least 44px square and prevent body overflow.

- [ ] **Step 5: Add focus and reduced-motion rules**

Keep visible orange focus rings and disable transform transitions under `prefers-reduced-motion: reduce`.

- [ ] **Step 6: Run style and build validation**

Run: `git diff --check`

Run: `npm run build`

Expected: no whitespace errors and a successful production build.

- [ ] **Step 7: Commit the visual system**

```powershell
git add app/globals.css
git commit -m "style: apply bright homepage showcase design"
```

### Task 6: Browser Acceptance Testing

**Files:**
- Create or modify only if the repository already tracks browser tests: `tests/homepage.spec.ts`

- [ ] **Step 1: Start the development server on an available port**

Run: `npm run dev -- --hostname 127.0.0.1 --port 3000`

Expected: the local Next.js server reports ready.

- [ ] **Step 2: Verify desktop behavior at 1440x900**

Check the warm hero, one primary CTA, three live/fallback images, visible recent/clearance headings, working marketplace navigation, and no overlap.

- [ ] **Step 3: Verify mobile behavior at 390x844**

Check no horizontal page overflow, 44px controls, readable localized copy, touch-scroll product strip, fixed-header clearance, and visible next-section content.

- [ ] **Step 4: Verify all three locales**

Switch EN, Traditional Chinese, and Simplified Chinese. Confirm the header, hero, product overlays, and section titles do not clip or overlap.

- [ ] **Step 5: Verify authentication routing**

Confirm `Browse marketplace` opens `/overview` while signed out. Confirm `Sell an item` opens the login prompt and retains `/sell` as the post-login destination.

- [ ] **Step 6: Verify reduced motion and console health**

Emulate reduced motion, reload, and confirm transform-based entrance motion is removed. Confirm there are no React errors, failed homepage API calls, or hydration warnings.

- [ ] **Step 7: Run the complete test suite**

Run: `npm test -- --run`

Run: `npm run build`

Expected: all tests and production build pass.

- [ ] **Step 8: Commit any acceptance-test additions**

```powershell
git add tests/homepage.spec.ts
git commit -m "test: cover homepage showcase experience"
```
