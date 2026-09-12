# Localized SSR Product SEO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish directly requestable, server-rendered product detail pages in English, Traditional Chinese, and Simplified Chinese for eligible OSUTrade listings.

**Architecture:** A locale helper owns the URL contract. A server-only public-product service owns eligibility, product mapping, and localized text. The localized page reads that service directly, returns `notFound()` for ineligible data, renders crawlable details in the Server Component, and delegates request-cart interaction to a small Client Component. Metadata, JSON-LD, sitemap, API, and internal product links share the same URL and public-data rules.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase, Vitest.

---

## Files

- Create: `app/lib/publicLocale.ts`, `app/lib/publicLocale.test.ts`
- Create: `app/lib/publicProduct.ts`, `app/lib/publicProduct.test.ts`, `app/api/products/[id]/route.test.ts`
- Create: `app/[locale]/product/[id]/page.tsx`, `app/[locale]/product/[id]/ProductRequestActions.tsx`
- Create: `app/sitemap.ts`, `app/robots.ts`, `app/sitemap.test.ts`
- Modify: `app/api/products/[id]/route.ts`, `app/product/[id]/page.tsx`, `app/lib/productMetadata.ts`, `app/lib/productMetadata.test.ts`
- Modify: `app/components/ProductCard.tsx`, `app/components/ProductListCard.tsx`, `app/components/HomeDiscoverySections.tsx`, `app/components/HomeHero.tsx`, `app/sell/page.tsx`, `app/components/newStudentCopy.ts`
- Modify: `app/i18n.tsx`, `app/components/Header.tsx`

### Task 1: Define the locale URL contract

**Files:**
- Create: `app/lib/publicLocale.test.ts`
- Create: `app/lib/publicLocale.ts`

- [ ] **Step 1: Write the failing URL tests.**

```ts
import { describe, expect, test } from "vitest";
import {
  localeInfo,
  productPath,
  publicLocaleFromSegment,
} from "./publicLocale";

describe("public product locales", () => {
  test("maps every locale to one stable product URL", () => {
    expect(productPath("en", "p 1")).toBe("/en/product/p%201");
    expect(productPath("zh-tw", "p-1")).toBe("/zh-tw/product/p-1");
    expect(productPath("zh-cn", "p-1")).toBe("/zh-cn/product/p-1");
  });

  test("rejects unsupported URL segments", () => {
    expect(publicLocaleFromSegment("fr")).toBeNull();
  });

  test("maps document language and hreflang correctly", () => {
    expect(localeInfo("zh-tw")).toMatchObject({
      documentLang: "zh-Hant", hreflang: "zh-TW", clientLocale: "zh",
    });
  });
});
```

- [ ] **Step 2: Run the test and verify a missing-module failure.**

Run: `npm test -- --run app/lib/publicLocale.test.ts`

Expected: FAIL because `./publicLocale` does not exist.

- [ ] **Step 3: Implement the helper.**

```ts
export const publicLocales = ["en", "zh-tw", "zh-cn"] as const;
export type PublicLocale = (typeof publicLocales)[number];

const details = {
  en: { documentLang: "en", hreflang: "en", clientLocale: "en" },
  "zh-tw": { documentLang: "zh-Hant", hreflang: "zh-TW", clientLocale: "zh" },
  "zh-cn": { documentLang: "zh-Hans", hreflang: "zh-CN", clientLocale: "zhCn" },
} as const;

export function publicLocaleFromSegment(value: string): PublicLocale | null {
  return publicLocales.includes(value as PublicLocale)
    ? (value as PublicLocale) : null;
}
export function localeInfo(locale: PublicLocale) { return details[locale]; }
export function publicLocaleFromClientLocale(locale: "en" | "zh" | "zhCn"): PublicLocale {
  return locale === "zh" ? "zh-tw" : locale === "zhCn" ? "zh-cn" : "en";
}
export function productPath(locale: PublicLocale, id: string | number) {
  return `/${locale}/product/${encodeURIComponent(String(id))}`;
}
```

- [ ] **Step 4: Run the focused test and commit.**

Run: `npm test -- --run app/lib/publicLocale.test.ts`

Expected: PASS.

Commit: `test: define localized product URL contract`

### Task 2: Centralize public product retrieval and text selection

**Files:**
- Create: `app/lib/publicProduct.test.ts`
- Create: `app/lib/publicProduct.ts`
- Modify: `app/api/products/[id]/route.ts`

- [ ] **Step 1: Write failing pure-function tests.**

```ts
import { describe, expect, test } from "vitest";
import { isPublicProduct, localizedProductText } from "./publicProduct";

describe("public product eligibility", () => {
  test("only accepts available product rows with positive quantity", () => {
    expect(isPublicProduct({ status: "available", quantity: 1 })).toBe(true);
    expect(isPublicProduct({ status: "sold", quantity: 1 })).toBe(false);
    expect(isPublicProduct({ status: "available", quantity: 0 })).toBe(false);
  });

  test("chooses the requested locale then a safe fallback", () => {
    expect(localizedProductText({ en: "Desk", zhTw: "書桌", zhCn: "书桌" }, "zh-tw"))
      .toBe("書桌");
  });
});
```

- [ ] **Step 2: Verify the test fails.**

Run: `npm test -- --run app/lib/publicProduct.test.ts`

Expected: FAIL because `./publicProduct` does not exist.

- [ ] **Step 3: Implement one server-safe service.**

`app/lib/publicProduct.ts` imports `createClient`, `toProductRecord`,
`Product`, and `PublicLocale`. It exports `isPublicProduct`,
`localizedProductText`, `localizedProduct(product, locale)`, and
`getPublicProduct(id)`, plus `listPublicProducts()`. The single-item query
must be:

```ts
const { data, error } = await supabase
  .from("products").select("*").eq("product_id", id).maybeSingle();
if (error) throw error;
if (!data || !isPublicProduct(data)) return null;
return toProductRecord(data);
```

`localizedProduct` must return name and description using translated values
before the base value. It must not call the internal HTTP API. Extend
`ProductRow` only with fields actually required by the page.

`listPublicProducts()` must use one server query with
`.eq("status", "available").gt("quantity", 0)` and map every returned row
with `toProductRecord`. It is the only product-list source used by the sitemap.

- [ ] **Step 4: Reuse the service in the JSON route.**

Replace the direct product query in `app/api/products/[id]/route.ts` with
`getPublicProduct(id)`. Return `{ message: "Product not found." }` with 404
for a missing, sold, removed, or zero-stock row. Preserve the existing demo
fallback behavior only when `canUseDemoProducts()` is true.

Create `app/api/products/[id]/route.test.ts` with a mocked public-product
service. Assert an unavailable result produces a 404 response and an available
result produces the existing JSON product payload.

- [ ] **Step 5: Run focused checks and commit.**

Run: `npm test -- --run app/lib/publicProduct.test.ts app/api/products/route.test.ts`

Expected: PASS.

Commit: `refactor: share public product lookup`

### Task 3: Render locale-specific product HTML on the server

**Files:**
- Create: `app/[locale]/product/[id]/ProductRequestActions.tsx`
- Create: `app/[locale]/product/[id]/page.tsx`
- Modify: `app/product/[id]/page.tsx`

- [ ] **Step 1: Write failing route tests.**

Mock `getPublicProduct`, `publicLocaleFromSegment`, `notFound`, and
`permanentRedirect`. Cover an available English page, an invalid locale, a
missing product, and legacy redirect behavior:

```ts
expect(permanentRedirect).toHaveBeenCalledWith("/en/product/p-1");
expect(notFound).toHaveBeenCalled();
```

- [ ] **Step 2: Implement client-only request actions.**

`ProductRequestActions.tsx` begins with `"use client"`. It receives the
public `Product`, posts the existing cart payload to `/api/cart`, and owns the
button pending/success/error state. It must not fetch product details.

- [ ] **Step 3: Implement the Server Component.**

```tsx
export default async function LocalizedProductPage({ params }: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: segment, id } = await params;
  const locale = publicLocaleFromSegment(segment);
  if (!locale) notFound();
  const product = await getPublicProduct(id);
  if (!product) notFound();
  const copy = localizedProduct(product, locale);
  return <main><h1>{copy.name}</h1>{/* price, stock, image, description, actions */}</main>;
}
```

Render the name in one server-rendered `<h1>`, plus the price, stock,
category, description, and descriptive image alt text. Keep existing visual
classes where practical. Render the first image in the server page and retain
additional images without a client fetch.

- [ ] **Step 4: Replace the legacy page with one redirect.**

```tsx
import { permanentRedirect } from "next/navigation";
import { productPath } from "@/app/lib/publicLocale";

export default async function LegacyProductPage({ params }: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  permanentRedirect(productPath("en", id));
}
```

- [ ] **Step 5: Run the route tests and commit.**

Run: `npm test -- --run app/[locale]/product/[id]/page.test.tsx app/product/[id]/page.test.tsx`

Expected: PASS.

Commit: `feat: server render localized product pages`

### Task 4: Generate localized metadata and structured data

**Files:**
- Modify: `app/lib/productMetadata.ts`
- Modify: `app/lib/productMetadata.test.ts`
- Modify: `app/[locale]/product/[id]/page.tsx`

- [ ] **Step 1: Write failing localized metadata tests.**

Assert a Traditional Chinese product page returns a self-canonical
`/zh-tw/product/product-1`, Open Graph URL for that path, and alternates for
`en`, `zh-TW`, `zh-CN`, and `x-default`. Assert English text is not used when
a Traditional Chinese translation exists.

- [ ] **Step 2: Implement shared localized metadata helpers.**

Add `buildLocalizedProductMetadata(product, locale)` to
`productMetadata.ts`. It must use `productPath`, `localizedProduct`, and the
existing image/description formatting. The page's `generateMetadata` calls
`getPublicProduct`, returns `{}` for an unavailable row, and returns the
localized helper result otherwise.

In the page, emit this JSON-LD only after `product` is confirmed public:

```tsx
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
  "@context": "https://schema.org", "@type": "Product", name: copy.name,
  description: copy.description, image: product.imageUrls, offers: {
    "@type": "Offer", priceCurrency: "USD", price: product.price,
    availability: "https://schema.org/InStock",
  },
}) }} />
```

- [ ] **Step 3: Run the metadata tests and commit.**

Run: `npm test -- --run app/lib/productMetadata.test.ts`

Expected: PASS.

Commit: `feat: add localized product search metadata`

### Task 5: Publish sitemap, robots, and canonical internal links

**Files:**
- Create: `app/sitemap.ts`, `app/robots.ts`, `app/sitemap.test.ts`
- Modify: all product-link files listed in **Files** above

- [ ] **Step 1: Write failing sitemap tests.**

Mock an eligible `p-1` and an ineligible sold row. Assert three absolute URLs
for `p-1`, no URL for the sold row, and no `/product/` legacy URL.

- [ ] **Step 2: Implement crawler metadata routes.**

`app/sitemap.ts` obtains public product rows through the same public-product
service (`listPublicProducts()`), maps each through `publicLocales`, and returns absolute URLs beneath
`https://osutrade.com`. `app/robots.ts` returns:

```ts
export default function robots() {
  return { rules: { userAgent: "*", allow: "/" }, sitemap: "https://osutrade.com/sitemap.xml" };
}
```

- [ ] **Step 3: Replace product detail links.**

For every component that currently creates `/product/${id}`, use
`productPath(publicLocaleFromClientLocale(locale), id)`. Keep URLs created for
cross-posting and notification emails on English (`productPath("en", id)`) so
they remain stable. Update the post-listing redirect in `app/sell/page.tsx` to
the active client locale. Remove direct legacy links from the new-student copy.

- [ ] **Step 4: Route product-page language toggles.**

In `app/i18n.tsx`, make `LanguageToggle` read `usePathname` and `useRouter`.
When the path matches `/en/product/:id`, `/zh-tw/product/:id`, or
`/zh-cn/product/:id`, a language button must call `router.push` with
`productPath(publicLocaleFromClientLocale(nextLocale), decodeURIComponent(id))`
instead of only changing local storage. On every other route it retains the
existing `setLocale(nextLocale)` behavior. Add a focused component test that
clicks the Traditional Chinese button on `/en/product/p-1` and asserts the
router target is `/zh-tw/product/p-1`.

- [ ] **Step 5: Run focused tests and commit.**

Run: `npm test -- --run app/sitemap.test.ts app/lib/publicLocale.test.ts`

Expected: PASS.

Commit: `feat: publish localized product discovery URLs`

### Task 6: Verify release behavior

**Files:**
- Modify: `README.md`, `README.zh-TW.md`, `README.zh-CN.md`

- [ ] **Step 1: Document the contract.**

Add the three URL examples and state that only available, positive-quantity
products are discoverable. State that legacy product links permanently redirect
to English and that every locale has its own canonical URL.

- [ ] **Step 2: Run source validation.**

Run: `npm test -- --run app/lib/publicLocale.test.ts app/lib/publicProduct.test.ts app/lib/productMetadata.test.ts app/sitemap.test.ts`

Expected: PASS.

Run: `npm test -- --run`

Expected: record any pre-existing failures separately from SEO regressions.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 3: Run production-style HTTP checks.**

Start the production server and check a known in-stock ID:

```powershell
$productId = (Invoke-RestMethod 'http://localhost:3000/api/products?limit=1').data[0].id
if (-not $productId) { throw 'The production-equivalent API returned no in-stock product for the SEO route check.' }
curl.exe -I "http://localhost:3000/product/$productId"
curl.exe -s "http://localhost:3000/en/product/$productId" | Select-String '<h1'
curl.exe -I "http://localhost:3000/zh-tw/product/$productId"
curl.exe -I "http://localhost:3000/zh-cn/product/$productId"
curl.exe -I http://localhost:3000/robots.txt
curl.exe -I http://localhost:3000/sitemap.xml
```

Expected: legacy `308`; all three locales, robots, and sitemap return `200`;
the English HTML contains a product `<h1>` before JavaScript interaction.

- [ ] **Step 4: Commit.**

Commit: `docs: document localized product indexing`

## Self-review

- The plan covers stable separate language URLs, server-rendered primary text,
  self-canonicals, reciprocal alternates, JSON-LD, sitemap, robots, and link
  migration.
- It intentionally excludes Ads trust pages, ranking claims, moderation, and
  non-product locale routing.
- Eligibility is shared by the page, API, and sitemap so unavailable inventory
  cannot become a search landing page.
