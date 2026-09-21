# Seller Profiles And Favorites Design

## Goal

Help buyers return to items and sellers they discovered without weakening the
existing browse-first and post-acceptance contact privacy rules.

The first release adds:

- A favorite button on each public product card.
- A public seller page reached from each product card and product detail page.
- A marketplace filter that shows every favorite still available to the buyer.
- Guest favorites stored in the current browser and merged into the account at
  login.

## Decisions

- Use design A: product cards show both a heart control and a link to the
  seller's other items.
- Guests can favorite items. Favorites are stored locally until successful
  account synchronization after login.
- Public seller information is limited to the seller's display name and active
  listings. Email, phone, Line, WeChat, transaction history, request history,
  and other account fields stay private.
- Do not show a join month in this release because `public.users` does not
  currently have a reliable creation timestamp in the maintained schema.
- `/seller` remains the private seller dashboard. Public seller pages use the
  non-conflicting path `/sellers/{sellerId}` so existing route protection does
  not accidentally require login.

## Non-goals

- Seller ratings, follow notifications, public buyer profiles, profile photos,
  bios, or public contact details.
- Sharing favorite lists with other users.
- Favorite notifications, price alerts, or recommendation ranking changes.

## Data Model

Add `public.product_favorites` through an idempotent Supabase migration:

```sql
create table if not exists public.product_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
```

`product_id` is deliberately `text`. Existing OSUTrade environments have
historically used both text-compatible and UUID product identifiers; adding a
foreign key without verifying the production type would make the migration
unsafe. The server verifies that a requested product exists before inserting a
favorite. Favorites for removed or unavailable products remain harmless audit
data but are not returned to a buyer.

Enable RLS with policies that allow an authenticated user to select, insert,
and delete only rows where `user_id = auth.uid()`. The API still requires the
current active-account check so suspended users cannot write favorites through
stale sessions.

## APIs

### Favorites

`/api/favorites` is authenticated for stored favorites:

- `GET`: return the caller's available favorite products, paginated.
- `POST { productId }`: verify the product is currently public and insert with
  conflict-ignore semantics.
- `POST { productIds }`: batch merge local favorites at login. Validate and
  deduplicate IDs, cap the request to 100 IDs, ignore unavailable products,
  then return the merged available list.
- `DELETE { productId }`: remove only the caller's favorite.

`/api/favorites/resolve` is public and accepts a capped list of local product
IDs. It returns only currently public, available products for guest filtering.
This avoids leaking private listing state and avoids putting a potentially long
list of IDs into a query string.

### Public seller profile

`GET /api/sellers/{sellerId}` validates a UUID seller ID and returns only:

- `seller: { id, name }`
- Paginated products owned by that seller where `status = 'available'` and
  `quantity > 0`

This route uses server-only data access and an explicit response shape. It does
not expose `public.users` directly or relax the existing self-only user RLS
policy.

## Client Flow

### Favorite state

- `FavoriteProvider` owns the union of favorite IDs and exposes toggle,
  initialization, and synchronization state.
- For a guest, IDs live under `osutrade:favorite-product-ids` in localStorage.
  Toggling updates the UI optimistically and persists locally.
- When the session becomes authenticated, the provider sends the local IDs in
  one batch request. It does not clear localStorage until the request succeeds.
  The server result becomes the account-backed source of truth and the local
  key is replaced with that normalized ID list.
- If sync fails, the user can continue using local favorites and sees a small,
  non-blocking retry notice. No favorite is discarded.

### Marketplace

- Product cards receive `sellerId`, `isFavorite`, and `onFavoriteToggle`.
- The heart is a separate icon button, not nested inside a product link. It has
  an accessible localized label and a visible selected state.
- A compact seller link below the price reads "More from {seller name}" only
  after seller display data is available; otherwise it reads a localized
  generic version and never reveals an email address.
- The marketplace toolbar gains an icon-and-text `My favorites` toggle. When
  active, it requests the full resolved favorite collection with the same
  pagination behavior as ordinary marketplace results. It combines normally
  with search, category, sale, and clearance filters only where the API can
  preserve correct counts and ordering.
- Zero results distinguish between "no favorites yet" and "favorites are no
  longer available" so users know why the view is empty.

### Seller page

- `app/sellers/[sellerId]/page.tsx` renders a public page with the seller name,
  active item count, product grid, and a back-to-marketplace link.
- No dashboard controls, buyer details, contacts, or sales/request metrics are
  rendered on the public page.
- The localized product detail page receives the same seller link. Legacy
  product routes continue to redirect to their localized destination.

## Error Handling And Safety

- Invalid product or seller IDs return 400 or 404 without revealing account
  existence, email addresses, or unavailable inventory.
- Favorite add/remove actions are idempotent. A double click or retry cannot
  create duplicate rows because of the composite primary key.
- A product changing status while a buyer favorites it is treated as a normal
  unavailable result: do not insert it, or omit it from subsequent results.
- Requests are capped and type-checked before database queries. Server routes
  retain `requireActiveUser` for account-owned operations.
- Cache revalidation runs after favorite mutations only for user-specific
  client state; public product and seller output is revalidated when product
  availability changes through existing listing flows.

## Test Plan

- Migration test checks table, composite key, RLS, and self-only policies.
- Favorite route tests cover authentication, active-account enforcement,
  duplicate add, delete ownership, batch merge, invalid IDs, and unavailable
  product omission.
- Public seller API tests verify the exact response shape, active-only filter,
  pagination, invalid UUID handling, and absence of email/contact fields.
- Provider and card tests cover guest local persistence, optimistic toggling,
  successful login merge, failed merge retention, and localized labels.
- Marketplace tests cover all-favorites resolution, empty states, and a
  page-one to page-two to page-one round trip with stable IDs.
- Browser verification covers guest favorite, login merge, seller navigation,
  and a responsive mobile favorite control.

## Acceptance Criteria

- A guest can favorite a product and see it in My favorites after a reload in
  the same browser.
- After login, those favorites persist to the account and appear on another
  signed-in browser.
- No public seller page response or UI contains an email address or contact
  method.
- A seller page lists only currently available inventory for its seller.
- Unavailable favorites do not appear as purchasable items.
- Existing public browsing, seller dashboard protection, request flow, and
  locale routing remain intact.
