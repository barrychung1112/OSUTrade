# 10 MB Product Image Upload Design

## Goal

Increase the per-image product upload limit from 5 MB to 10 MB without changing the existing one-to-three image count or supported formats.

## Design

- The product image API accepts JPG, PNG, and WebP files up to `10 * 1024 * 1024` bytes each.
- Files larger than 10 MB return a clear validation error before any upload begins.
- English, Traditional Chinese, and Simplified Chinese upload guidance displays the new 10 MB limit.
- The Supabase `product-images` bucket uses a `10485760` byte `file_size_limit`.
- Existing multi-image behavior and the three-image maximum remain unchanged.

## Verification

- An image exactly 10 MB is accepted.
- An image larger than 10 MB is rejected.
- Schema tests require the 10 MB bucket limit.
- The focused upload tests, TypeScript check, and production build pass.

