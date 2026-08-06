# Clearance Market Design

## Goal

Allow sellers to temporarily offer an available product for free or for $1 while preserving its original price and existing percentage discount. Clearance products continue through the existing request, seller acceptance, and contact-sharing workflow.

## Scope

- Sellers can choose `Free clearance`, `$1 clearance`, or `Cancel clearance`.
- Clearance products appear in a dedicated Marketplace filter.
- Product cards and details show the original price struck through and the active clearance price.
- Existing percentage discounts remain stored while clearance is active and return automatically when clearance is cancelled.
- Products with active trade requests cannot enter, change, or leave clearance.
- Cart totals, request snapshots, emails, and seller views support a valid effective price of zero.

Bulk clearance actions and AI-selected clearance prices are outside this release.

## Data Model

Add a nullable `products.clearance_price numeric` column with a constraint allowing only `NULL`, `0`, or `1`.

The existing `products.price` remains the original price. The existing `discount_percent` remains unchanged. Rebuild the generated `effective_price` column so its value is:

```sql
coalesce(
  clearance_price,
  round(price::numeric * (100 - discount_percent) / 100, 2)
)
```

This creates one server-authoritative price. API consumers must never calculate a separate clearance price in the browser.

The migration will be added as a standalone SQL file and mirrored in `supabase/mvp-schema.sql`. Because PostgreSQL generated expressions cannot be altered in place, the migration drops and recreates `effective_price` after adding `clearance_price`.

## Pricing Contract

The shared pricing mapper returns:

- `originalPrice`: `products.price`
- `discountPercent`: the stored percentage discount
- `clearancePrice`: `null`, `0`, or `1`
- `effectivePrice`: the database-generated effective price, with a deterministic application fallback
- `isClearance`: true when `clearancePrice` is `0` or `1`
- `isDiscounted`: true only when percentage discount is active and clearance is not active

All null checks must be explicit. A zero price is valid and must not be replaced by `price || fallback` expressions.

## Seller Experience

Each editable, available product exposes a compact clearance menu with three commands:

- Free clearance
- $1 clearance
- Cancel clearance

The active option is visually indicated. Applying clearance does not erase `discount_percent`. Cancelling clearance only sets `clearance_price` to `NULL`.

Products that are sold or have an active request show the existing locked state and an explanation that price and clearance settings cannot change during a transaction.

The seller API accepts `clearancePrice` as `null`, `0`, or `1`, rejects all other values, and rechecks active requests server-side before updating.

## Marketplace Experience

Marketplace adds a mutually composable `Clearance` filter using `?clearance=1`. The products API implements this filter with `clearance_price IS NOT NULL`.

The filter also includes any available product whose server-generated `effective_price` is exactly `1`, even when the seller did not explicitly set `clearance_price`. This covers products originally listed at $1 and products whose percentage discount results in a $1 buyer price. Automatic inclusion affects discovery only: these products do not receive a clearance badge, original-price strike-through, or clearance controls unless `clearance_price` is explicitly set.

Clearance cards and product details show:

- Original price with a strike-through
- `Free` or `$1`
- A distinct clearance badge

Percentage-sale badges are hidden while clearance is active. Existing search, category, sorting, pagination, and public browsing continue to work.

## Request Flow

The existing cart and request workflow remains unchanged. When the buyer submits a request, `price_at_request` stores `effective_price`, including `0` for free products. Price-change detection compares the snapshot with the current effective price.

If a seller cancels or changes clearance before a request is submitted, the buyer sees the current server price. Once an active request exists, the product becomes price-locked by the existing transaction rule.

## Error Handling

- Missing database migration: API returns a clear schema-configuration error rather than silently discarding clearance data.
- Invalid clearance value: seller API returns HTTP 400.
- Active request race: seller API returns HTTP 409 and leaves pricing unchanged.
- Zero-price formatting: UI renders `$0.00` or localized `Free`, never a blank value.
- Migration rollback: drop the new generated column, remove `clearance_price`, and recreate the original discount-only `effective_price` expression.

## Localization

Add English, Traditional Chinese, and Simplified Chinese text for clearance filters, badges, commands, locked-state guidance, empty states, and validation messages.

## Testing

Automated tests cover:

- Shared pricing for normal, discounted, free, and $1 products
- Cancellation restoring the stored percentage discount
- Seller update validation and active-request locking
- Products API clearance filtering
- Request snapshots and totals with a zero price
- Schema constraints and generated-price precedence

Playwright acceptance covers desktop and mobile:

1. Seller activates free clearance and sees the original price preserved.
2. Marketplace clearance filter finds the product.
3. Product detail and cart display a valid zero total.
4. Buyer sends a request through the existing flow.
5. Seller can no longer change clearance while the request is active.
6. After the request is no longer active, cancelling clearance restores the prior percentage-discount price.

## Release Sequence

1. Apply the SQL migration in Supabase.
2. Deploy application code.
3. Smoke-test seller update, Marketplace filter, product detail, cart, and request creation.
4. If application deployment fails, roll back application code while leaving the nullable column in place.
5. If the migration itself must be rolled back, use the included rollback SQL before redeploying the previous application version.
