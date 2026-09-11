# Localized SSR Product SEO Design

## Goal

Give every public, in-stock OSUTrade listing a directly requestable English,
Traditional Chinese, and Simplified Chinese product page that Google can crawl
without waiting for browser-side data fetching.

## URL Contract

Each eligible product has three stable URLs:

- `/en/product/:id` for English
- `/zh-tw/product/:id` for Traditional Chinese
- `/zh-cn/product/:id` for Simplified Chinese

Each localized URL returns 200 only when the listing has `status: available`
and positive quantity. It is self-canonical and supplies reciprocal `en`,
`zh-TW`, `zh-CN`, and `x-default` alternate links. `x-default` points to the
English page. The legacy `/product/:id` path permanently redirects to the
English URL. No crawler-facing locale is selected from local storage,
`Accept-Language`, or IP address.

## Server Rendering

Create a server-safe public-product service shared by the detail page, product
API, and sitemap. It reads a product record directly from Supabase, excludes
unavailable or out-of-stock rows, normalizes images and pricing, and selects
the requested localized name and description with explicit fallbacks.

`app/[locale]/product/[id]/page.tsx` remains a Server Component. It renders
the localized product name in an `<h1>`, description, price, category,
availability, and image alt text in the first HTML response. A small child
Client Component keeps only request-cart mutation and image-selection
interactions on the client.

## Indexing Metadata

Each public page generates a locale-specific title, description, Open Graph
URL, self-canonical URL, and alternate-language map from the same URL helper.
It emits `Product` JSON-LD only for a publicly eligible listing, with localized
name and description, first image, USD offer, and in-stock availability. It
does not expose seller contact details or claim that OSUTrade processes payment.

`app/sitemap.ts` lists each locale URL for eligible products only. `app/robots.ts`
allows public crawling and points to the sitemap. Sold, removed, zero-stock,
legacy product, dashboard, cart, request, and API URLs are excluded.

## Navigation and Language Behavior

Internal product links will use the locale URL helper. The product-page language
toggle changes the route to the corresponding localized URL, making the URL the
source of truth for product-page language. Existing non-product application
routes retain their current local-storage locale behavior in this release.

## Error Handling and Verification

Unknown locale segments and missing, unavailable, sold, removed, or zero-stock
products return Next.js `notFound()`. Existing `/api/products/:id` behavior
continues to return JSON and reuses the public-product eligibility rule.

Tests will cover the URL helper, eligibility rule, locale fallback, metadata
alternate map, and legacy redirect. The implementation will then run focused
Vitest tests, the full test suite, and `npm run build`. A production-style HTTP
check will verify the redirect, each localized page, `robots.txt`, and
`sitemap.xml`, including server-rendered product `<h1>` content in response
HTML.
