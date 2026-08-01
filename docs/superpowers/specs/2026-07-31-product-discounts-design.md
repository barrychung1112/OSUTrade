# Product Discounts Design

## Goal

Let sellers enable a preset discount of 10%, 20%, 30%, or 50%, while keeping one authoritative price calculation across the marketplace and trade-request flow.

## Price Contract

- `products.price` remains the seller-entered original price.
- `products.discount_percent` stores `0`, `10`, `20`, `30`, or `50`.
- `products.effective_price` is a stored PostgreSQL generated column rounded to two decimals.
- Buyer-facing APIs expose `price` as the effective price plus `originalPrice` and `discountPercent` for presentation.
- Seller APIs expose the original price for editing and also return the effective price.
- Request creation reads the effective price from Supabase; it never trusts a cart-provided price.
- Accepted requests retain `price_at_request`; active requests receive the existing price-change notification when the effective price changes.

## UX

Seller editing uses a segmented control: No discount, 10%, 20%, 30%, 50%. Marketplace and product details show the original price with a strikethrough, the sale price, and an OFF badge only when discounted.

## Constraints

- Sold listings cannot change price or discount.
- No custom percentages, coupons, schedules, or stacking.
- English, Traditional Chinese, and Simplified Chinese are supported.

## Verification

Test calculation and validation, seller updates, API mapping, request snapshots, discounted display data, cancellation, and sold-item protection.

