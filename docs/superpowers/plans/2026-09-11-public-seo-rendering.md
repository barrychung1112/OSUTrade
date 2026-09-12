# Public SEO Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Server-render public marketplace discovery content with safe cache invalidation, while keeping private marketplace pages out of search indexes.

**Architecture:** Public data moves behind a cookie-free anonymous Supabase client and a small cached query layer. Server pages own initial data and metadata; client components own filters, mutations, session actions, and progressive loading. Product mutations invalidate public discovery data and localized route paths.

**Tech Stack:** Next.js 15 App Router, React 19, Supabase, Next cache APIs, Vitest.

---

### Task 1: Cookie-free public product data and invalidation

**Files:**
- Create: `utils/supabase/public.ts`, `app/lib/publicProductCache.ts`, `app/lib/publicProductCache.test.ts`
- Modify: `app/lib/publicProduct.ts`, `app/api/products/route.ts`, `app/api/seller/products/route.ts`

- [ ] **Step 1: Write failing cache-contract tests.**

```ts
test("builds a per-product public cache tag", () => {
  expect(productCacheTag("p-1")).toBe("public-product:p-1");
});

test("returns all localized paths after a product mutation", () => {
  expect(publicProductPaths("p-1")).toEqual([
    "/en/product/p-1", "/zh-tw/product/p-1", "/zh-cn/product/p-1",
  ]);
});
```

- [ ] **Step 2: Run `npm test -- --run app/lib/publicProductCache.test.ts` and confirm it fails because the module is missing.**

- [ ] **Step 3: Add the minimal public client and cache helper.**

```ts
export const publicProductsCacheTag = "public-products";
export const productCacheTag = (id: string | number) => `public-product:${id}`;
export const publicProductPaths = (id: string | number) =>
  publicLocales.map((locale) => productPath(locale, id));
```

`utils/supabase/public.ts` creates a Supabase client from the public URL and anon key without importing `cookies`. `publicProduct.ts` uses that client for public reads. The route handlers call an exported invalidator after a successful product create or seller product update, passing the affected product id.

- [ ] **Step 4: Run the focused tests, inspect the mutation route test suite, and commit `feat: cache public product discovery data`.**

### Task 2: Server-render the marketplace first page

**Files:**
- Create: `app/lib/publicProductList.ts`, `app/lib/publicProductList.test.ts`, `app/overview/MarketplaceClient.tsx`, `app/overview/page.test.tsx`
- Modify: `app/overview/page.tsx`, `app/hook/useProducts.tsx`

- [ ] **Step 1: Write failing tests for normalized query parsing and a rendered H1 with initial products.**

```ts
expect(parsePublicProductListParams({ page: "0", sort: "drop table" })).toMatchObject({ page: 1, sort: undefined });
expect(await renderOverview({ initialProducts: [product] })).toContain("Campus marketplace");
```

- [ ] **Step 2: Run `npm test -- --run app/lib/publicProductList.test.ts app/overview/page.test.tsx` and confirm the missing parser/client boundary fails.**

- [ ] **Step 3: Implement the public list query and server page.**

The query accepts only page, positive bounded limit, trimmed name, the five known categories, `asc`/`desc`, sale, and clearance. It applies the current SQL filters and sort, returns the first page plus total, and is cached by the collection tag. `page.tsx` reads `searchParams`, renders the H1 and cards from server data, and passes serializable initial data to `MarketplaceClient`. The client reflects controls into the URL and only uses `useProducts` for a changed query or later pages.

- [ ] **Step 4: Run focused tests and commit `feat: server render marketplace discovery`.**

### Task 3: Server-render homepage discovery sections

**Files:**
- Create: `app/lib/homePublicDiscovery.ts`, `app/lib/homePublicDiscovery.test.ts`, `app/components/HomeDiscoverySectionsServer.tsx`
- Modify: `app/page.tsx`, `app/components/HomeDiscoverySections.tsx`, `app/components/HomeMarketSignalsCard.tsx`, `app/components/ProductListCard.tsx`

- [ ] **Step 1: Write a failing test showing that recent, clearance, and sale subsets derive from a supplied public product collection.**

```ts
expect(homeDiscovery(products).recent).toHaveLength(4);
expect(homeDiscovery(products).clearance[0].isClearance).toBe(true);
```

- [ ] **Step 2: Run `npm test -- --run app/lib/homePublicDiscovery.test.ts` and confirm it fails because the helper is absent.**

- [ ] **Step 3: Implement the helper and server shell.**

The server page loads the public collection once, derives all three sections and market signals, and emits product links using the English canonical path. Client components retain animation only and accept supplied data; they must not fetch `/api/products` on mount.

- [ ] **Step 4: Run focused homepage tests and commit `feat: server render homepage listings`.**

### Task 4: Locale document language and private-page crawl directives

**Files:**
- Create: `app/[locale]/layout.tsx`, `app/lib/privatePageMetadata.ts`, `app/lib/privatePageMetadata.test.ts`
- Modify: `app/cart/page.tsx`, `app/requests/page.tsx`, `app/seller/page.tsx`, `app/sell/page.tsx`, `app/notifications/page.tsx`

- [ ] **Step 1: Write failing metadata tests.**

```ts
expect(privatePageMetadata.robots).toEqual({ index: false, follow: false });
expect(localeDocumentLanguage("zh-tw")).toBe("zh-Hant");
```

- [ ] **Step 2: Run `npm test -- --run app/lib/privatePageMetadata.test.ts` and confirm it fails because the helpers do not exist.**

- [ ] **Step 3: Implement the route layout and metadata exports.**

The localized layout validates locale segments and sets the route language wrapper. Each listed private page exports the same noindex metadata object; no auth or data-fetch behavior changes.

- [ ] **Step 4: Run focused tests and commit `feat: protect private marketplace pages from indexing`.**

### Task 5: Release verification

**Files:**
- Modify: `README.md`, `README.zh-TW.md`, `README.zh-CN.md`

- [ ] **Step 1: Document public rendering, localized URLs, and private noindex boundaries.**
- [ ] **Step 2: Run all focused SEO tests, then `npm test -- --run` and record the known `server-only` Vitest resolution suites separately.**
- [ ] **Step 3: Run `npm run build`, then inspect a local production response for marketplace H1, product H1, sitemap, robots, and a private-page robots directive.**
- [ ] **Step 4: Commit `docs: document public SEO rendering`.**
