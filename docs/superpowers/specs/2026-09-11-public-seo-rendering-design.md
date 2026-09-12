# Public SEO Rendering Design

## Goal

Make OSUTrade's public discovery pages crawlable and fast without turning
private marketplace workflows into publicly cached SSR pages. The URL is the
source of truth for public product language; authenticated cart, request,
seller, and notification views remain user-specific.

## Rendering Boundary

Public product pages, the marketplace's first result page, and the homepage's
listing sections render their data on the server. Each page may pass only the
interactive controls (search input, filters, load-more, cart mutation, menu,
and language selection) to Client Components. Public server rendering must
not depend on NextAuth or Supabase request cookies.

Private routes (`/cart`, `/requests`, `/seller`, `/sell`, and
`/notifications`) remain client/hybrid. They explicitly emit `noindex`,
because their data is session-specific and not a Google landing page.

## Public Data and Freshness

A public Supabase client uses the anonymous key but does not read or write
request cookies. Public product reads are cached by one collection tag and a
per-product tag. On a successful product create, edit, removal, sale, or
quantity change, the mutation route invalidates the collection tag, each
localized product path, and the sitemap. This keeps an available listing
discoverable while preventing a sold or removed listing from lingering in
cached HTML.

The cache is a performance layer, not the access-control boundary: all public
queries continue to select only `available` products with positive quantity,
and Row Level Security must continue to enforce the same rule for the anon
key.

## Marketplace and Homepage

`/overview` accepts normalized `page`, `name`, `category`, `sort`, `sale`,
and `clearance` search parameters on the server. It renders a semantic H1,
the first twelve matching public products, and a count in the initial HTML.
The client filter controls update the query string and progressively fetch
later pages; they do not replace the server-rendered first page.

The homepage renders recent, clearance, sale, and market-signal data from the
same public list service. It retains motion and login actions as client islands
but does not make the core product links wait for an effect-driven API call.

## Language

Localized product routes keep their existing explicit `/en`, `/zh-tw`, and
`/zh-cn` URLs. The root document language is set from the locale route layout,
not adjusted after first paint from local storage. Non-product routes keep the
existing client locale during this release; a locale toggle on a product route
always navigates to its matching localized URL.

## Crawl Directives and Verification

`robots.txt` and `sitemap.xml` remain public and use only the public data
service. Private pages provide `robots: { index: false, follow: false }`.
Tests prove data eligibility, cache invalidation dispatch, initial public
results, query normalization, locale document language, and private metadata.
Release verification includes the focused tests, full suite with the known
three `server-only` Vitest resolution suites reported separately, a production
build, and HTTP inspection of public HTML.
