# Public Product Image Optimization Design

## Goal

Restore Vercel Image Optimization for the public OSUTrade browsing experience now that the Vercel plan has been upgraded.

## Scope

- Optimize Supabase product images in the homepage hero, marketplace cards, product detail main image, and product thumbnails.
- Preserve existing responsive `sizes` and main-image priority behavior.
- Keep seller, cart, and request management images unchanged because they use direct `<img>` loading and are not the primary public browsing path.
- Set a 30-day minimum image cache TTL to reduce repeated transformations.
- Retain the centralized bypass helper so optimization can be disabled quickly if plan limits change again.

## Verification

- Update the image policy test to require optimization for Supabase Storage URLs.
- Run the full test suite and production build.
- Verify Preview image requests use `/_next/image` and return successfully at desktop and mobile widths.
