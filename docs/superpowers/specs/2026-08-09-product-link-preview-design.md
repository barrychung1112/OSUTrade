# Product Link Preview Design

## Goal

When a user shares an OSUTrade product URL in LINE, the preview should show the
product's first photo, canonical product name, current price,
and a short description. The same metadata should also work for Discord,
Facebook, LinkedIn, and Twitter-compatible crawlers.

## Scope

- Add site-wide metadata defaults and `metadataBase` for `https://osutrade.com`.
- Generate product-specific metadata on `/product/[id]` from server-side product
  data.
- Use the first public product photo without sending it through Vercel Image
  Optimization.
- Add Open Graph, Twitter card, canonical URL, title, and description metadata.
- Fall back to OSUTrade defaults when the product does not exist or has no photo.
- Do not change the database schema or generate new share-card images.

## Metadata Rules

### Title

Use `<product name> · <current price> | OSUTrade`. Because product URLs do not
contain a locale and LINE crawlers do not carry the sharer's language setting,
use the canonical `name` returned by the product API. The current price must match
the price returned by the product API, including discount and clearance pricing.

### Description

Use the product description when present, normalize whitespace, and limit it to
a crawler-friendly length. When no description exists, use a concise OSUTrade
marketplace fallback.

### Image

Use `image_urls[0]`, then `image_url`, then the default OSUTrade share image.
The URL must be absolute, public, HTTPS, and accessible without authentication.
Metadata points directly to the Supabase Storage object so it does not consume
Vercel Image Optimization transformations.

### URL

Use `https://osutrade.com/product/<product-id>` as both the Open Graph URL and
canonical URL.

## Architecture

Keep the existing interactive product page as a client component. Add a server
layout for the dynamic product route that exports `generateMetadata()`. Extract
or reuse a server-side product lookup so metadata and the product API follow the
same product visibility and price rules without making a request back to the
application's own public URL.

The lookup must fail safely. Missing configuration, unavailable data, malformed
images, and missing products return default OSUTrade metadata rather than
failing page rendering.

## Caching

Metadata may use normal Next.js server caching appropriate for product data.
LINE can independently cache a previously fetched preview, so validation should
use a newly created product URL or a URL LINE has not fetched before.

## Testing

- Unit-test title, price, description, image, and fallback metadata construction.
- Verify discounted and clearance prices are represented correctly.
- Verify products with multiple photos use the first photo.
- Verify a missing product falls back without throwing.
- Run the complete test suite and production build.
- After deployment, fetch a product page as a crawler and verify the rendered
  `og:title`, `og:description`, `og:image`, `og:url`, and canonical tags.

## Non-goals

- Generating branded 1200 x 630 share cards.
- Persisting preview metadata in Supabase.
- Forcing LINE to invalidate previews it has already cached.
- Changing product upload, image optimization, or marketplace UI behavior.
