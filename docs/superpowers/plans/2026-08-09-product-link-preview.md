# Product Link Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render product-specific Open Graph metadata so LINE previews show the first product photo, canonical name, current price, and description.

**Architecture:** Extract the existing API product-row normalization into a shared pure module, then build metadata with another pure module. A server layout under `/product/[id]` reads Supabase directly and returns safe fallback metadata without changing the existing client product page.

**Tech Stack:** Next.js 15 App Router metadata API, TypeScript, Supabase SSR client, Vitest.

---

## File Structure

- Create `app/lib/productRecord.ts`: shared database row type and API product normalization.
- Create `app/lib/productRecord.test.ts`: pricing and image-order regression coverage.
- Create `app/lib/productMetadata.ts`: pure Next.js metadata construction and defaults.
- Create `app/lib/productMetadata.test.ts`: Open Graph, Twitter, canonical, and fallback coverage.
- Create `app/product/[id]/layout.tsx`: server-side product lookup and `generateMetadata()`.
- Modify `app/api/products/[id]/route.ts`: consume the shared row normalizer.
- Modify `app/layout.tsx`: add site metadata defaults and `metadataBase`.

### Task 1: Share Product Record Normalization

**Files:**
- Create: `app/lib/productRecord.test.ts`
- Create: `app/lib/productRecord.ts`
- Modify: `app/api/products/[id]/route.ts`

- [ ] **Step 1: Write failing normalization tests**

Cover a discounted product, a `$0` clearance product, and ordered `image_urls`:

```ts
expect(toProductRecord({
  product_id: "p1",
  name: "Desk",
  price: 100,
  discount_percent: 20,
  image_url: "fallback.jpg",
  image_urls: ["first.jpg", "second.jpg"],
})).toMatchObject({
  id: "p1",
  price: 80,
  originalPrice: 100,
  imageUrl: "first.jpg",
  imageUrls: ["first.jpg", "second.jpg"],
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npx vitest run app/lib/productRecord.test.ts`

Expected: FAIL because `productRecord.ts` does not exist.

- [ ] **Step 3: Move `ProductRow`, image normalization, and `toProduct()` from the API route**

Export them as `ProductRow` and `toProductRecord()` from `app/lib/productRecord.ts`. Preserve the existing `getProductPricing()` behavior and translation fallbacks exactly.

- [ ] **Step 4: Update the API route to call `toProductRecord(data)`**

Remove the route-local duplicate type and normalization functions. Do not change response status or demo fallback behavior.

- [ ] **Step 5: Run focused API and normalization tests**

Run: `npx vitest run app/lib/productRecord.test.ts app/api/products/route.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add app/lib/productRecord.ts app/lib/productRecord.test.ts 'app/api/products/[id]/route.ts'
git commit -m "refactor: share product record normalization"
```

### Task 2: Build Product Metadata

**Files:**
- Create: `app/lib/productMetadata.test.ts`
- Create: `app/lib/productMetadata.ts`

- [ ] **Step 1: Write failing metadata tests**

Verify that a product named `Computer Monitor` at `$30` produces:

```ts
expect(buildProductMetadata(product)).toMatchObject({
  title: "Computer Monitor · $30.00 | OSUTrade",
  alternates: { canonical: "/product/product-1" },
  openGraph: {
    title: "Computer Monitor · $30.00 | OSUTrade",
    url: "/product/product-1",
    images: [{ url: product.imageUrls[0] }],
  },
  twitter: { card: "summary_large_image" },
});
```

Also verify whitespace normalization, description truncation, `$0` formatting as `Free`, first-image precedence, and default metadata for `null`.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npx vitest run app/lib/productMetadata.test.ts`

Expected: FAIL because `productMetadata.ts` does not exist.

- [ ] **Step 3: Implement the pure metadata builder**

Export:

```ts
export const SITE_URL = new URL("https://osutrade.com");
export const DEFAULT_SHARE_IMAGE = "/images/DellMonitor_0.jpg";
export function buildProductMetadata(product: Product | null): Metadata;
```

Use `product.price`, which already contains effective discount or clearance pricing. Use the first non-empty value from `imageUrls`, `imageUrl`, and `DEFAULT_SHARE_IMAGE`. Return Open Graph `type: "website"`, canonical URL, and Twitter `summary_large_image` metadata.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npx vitest run app/lib/productMetadata.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add app/lib/productMetadata.ts app/lib/productMetadata.test.ts
git commit -m "feat: build product sharing metadata"
```

### Task 3: Connect Metadata to Product Routes

**Files:**
- Create: `app/product/[id]/layout.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Add root metadata defaults**

Export `metadata` from `app/layout.tsx` with:

```ts
export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: { default: "OSUTrade", template: "%s" },
  description: "Buy and sell useful campus goods with the OSU community.",
  openGraph: {
    siteName: "OSUTrade",
    type: "website",
    images: [{ url: DEFAULT_SHARE_IMAGE }],
  },
  twitter: { card: "summary_large_image" },
};
```

- [ ] **Step 2: Implement the server product layout**

Create `generateMetadata({ params })`, await the product ID, query `products` with the existing Supabase server client, normalize with `toProductRecord()`, and return `buildProductMetadata(product)`. On missing configuration, query error, or missing product, return `buildProductMetadata(null)` without throwing. The layout itself returns `children` unchanged.

- [ ] **Step 3: Run metadata, API, and type/build verification**

Run:

```powershell
npx vitest run app/lib/productMetadata.test.ts app/lib/productRecord.test.ts app/api/products/route.test.ts
npm run build
```

Expected: tests PASS and Next.js production build exits `0`.

- [ ] **Step 4: Commit**

```powershell
git add app/layout.tsx 'app/product/[id]/layout.tsx'
git commit -m "feat: add product link previews"
```

### Task 4: Full Verification and Release Readiness

**Files:** No additional product code expected.

- [ ] **Step 1: Run the full suite**

Run: `npm test -- --run`

Expected: all tests PASS.

- [ ] **Step 2: Run production build again after all commits**

Run: `npm run build`

Expected: exit `0`.

- [ ] **Step 3: Inspect the final diff**

Run: `git diff origin/master...HEAD --check` and `git status --short`.

Expected: no whitespace errors and a clean worktree.

- [ ] **Step 4: After deployment, verify crawler-visible HTML**

Fetch a real, previously unshared product URL and confirm the HTML contains absolute `og:title`, `og:description`, `og:image`, `og:url`, Twitter card, and canonical tags. Confirm the `og:image` URL returns HTTP `200` without authentication.
