# Seller Profiles And Favorites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let guests and signed-in buyers favorite products, view all resolved favorites in the marketplace, and browse a privacy-safe public seller page.

**Architecture:** Guest favorite IDs are held in localStorage and resolved through a public, availability-filtered endpoint. Signed-in favorites live in `public.product_favorites`, accessed through authenticated server routes that use `requireActiveUser`; local IDs are merged only after a successful login sync. A separate server-only public seller route returns an explicit `{ id, name }` profile shape and available listings, so the self-only `public.users` RLS policy is not relaxed.

**Tech Stack:** Next.js App Router, React 19, NextAuth, Supabase/PostgREST, TypeScript, Vitest, Testing Library, Radix UI, Lucide.

---

## File Structure

- `supabase/mvp-schema.sql`: idempotent `product_favorites` table and RLS policies.
- `supabase/mvp-schema.test.ts`: schema contract assertions.
- `app/lib/favorites.ts`: pure validation, ID normalization, local-storage key, and list-filter helpers.
- `app/lib/favorites.test.ts`: pure favorite behavior tests.
- `app/api/favorites/route.ts`: authenticated account favorite read/add/merge/delete API.
- `app/api/favorites/route.test.ts`: route authorization, idempotency, and unavailable-product tests.
- `app/api/favorites/resolve/route.ts`: public guest favorite resolver.
- `app/api/favorites/resolve/route.test.ts`: resolver visibility and validation tests.
- `app/lib/publicSeller.ts`: server-only seller profile/listing query and response normalizer.
- `app/lib/publicSeller.test.ts`: public seller data boundary tests.
- `app/api/sellers/[sellerId]/route.ts`: public seller API.
- `app/api/sellers/[sellerId]/route.test.ts`: route-level seller privacy tests.
- `app/components/FavoritesProvider.tsx`: guest persistence, account initialization, sync, and toggle state.
- `app/components/FavoritesProvider.test.tsx`: persistence and merge behavior tests.
- `app/components/ProductCard.tsx`: favorite icon and public seller link.
- `app/components/ProductCard.test.tsx`: card controls and route tests.
- `app/hook/useFavoriteProducts.tsx`: favorites list fetch and shared filters/pagination response.
- `app/hook/useFavoriteProducts.test.tsx`: guest/account favorite query tests.
- `app/overview/page.tsx`: favorite toggle and empty-state integration.
- `app/overview/MarketplaceClient.test.tsx`: marketplace favorite filter behavior.
- `app/sellers/[sellerId]/page.tsx`: public seller page.
- `app/sellers/[sellerId]/page.test.tsx`: public seller page output test.
- `app/[locale]/product/[id]/page.tsx`: public seller link on localized product detail.
- `app/[locale]/product/[id]/page.test.tsx`: localized detail seller-link test.
- `app/i18n.tsx`, `app/i18n.test.tsx`: English, Traditional Chinese, and Simplified Chinese labels.
- `app/layout.tsx`: mount `FavoritesProvider` with the existing global providers.

## Task 1: Database And Pure Favorite Contracts

**Files:**
- Modify: `supabase/mvp-schema.sql`
- Modify: `supabase/mvp-schema.test.ts`
- Create: `app/lib/favorites.ts`
- Create: `app/lib/favorites.test.ts`

- [ ] **Step 1: Write failing schema and pure helper tests**

```ts
test("defines account-owned product favorites without assuming product IDs are UUIDs", () => {
  expect(schema).toContain("create table if not exists public.product_favorites");
  expect(schema).toContain("product_id text not null");
  expect(schema).toContain("primary key (user_id, product_id)");
  expect(schema).toContain("Favorites are private to the current user");
});

test("normalizes a capped, unique product ID list", () => {
  expect(normalizeFavoriteProductIds([" desk ", "desk", "", 42], 3)).toEqual(["desk", "42"]);
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- --run supabase/mvp-schema.test.ts app/lib/favorites.test.ts`

Expected: FAIL because the table and `favorites` helper do not exist.

- [ ] **Step 3: Add the idempotent SQL and pure helper**

Add this schema block after the existing account-owned tables:

```sql
create table if not exists public.product_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.product_favorites enable row level security;

drop policy if exists "Favorites are private to the current user" on public.product_favorites;
create policy "Favorites are private to the current user"
  on public.product_favorites
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can add their own favorites" on public.product_favorites;
create policy "Users can add their own favorites"
  on public.product_favorites
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can remove their own favorites" on public.product_favorites;
create policy "Users can remove their own favorites"
  on public.product_favorites
  for delete to authenticated
  using (user_id = auth.uid());
```

Implement `normalizeFavoriteProductIds(values, limit = 100)` to stringify,
trim, deduplicate, discard empty values, and stop at `limit`. Export
`favoriteStorageKey = "osutrade:favorite-product-ids"` and
`isPublicFavoriteProduct(product)` that requires available status and a
positive quantity.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `npm test -- --run supabase/mvp-schema.test.ts app/lib/favorites.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the data contract**

```bash
git add supabase/mvp-schema.sql supabase/mvp-schema.test.ts app/lib/favorites.ts app/lib/favorites.test.ts
git commit -m "feat: add favorite data contract"
```

## Task 2: Favorite APIs

**Files:**
- Create: `app/api/favorites/route.ts`
- Create: `app/api/favorites/route.test.ts`
- Create: `app/api/favorites/resolve/route.ts`
- Create: `app/api/favorites/resolve/route.test.ts`

- [ ] **Step 1: Write failing account favorite API tests**

```ts
test("merges a signed-in buyer's local favorite IDs without duplicates", async () => {
  mocks.requireActiveUser.mockResolvedValue({ user: { id: "buyer-1" } });
  const response = await POST(requestWithJson({ productIds: ["p-1", "p-1", "p-2"] }));
  expect(response.status).toBe(200);
  expect(mocks.insert).toHaveBeenCalledWith([
    { user_id: "buyer-1", product_id: "p-1" },
    { user_id: "buyer-1", product_id: "p-2" },
  ]);
});

test("does not resolve removed products for a guest", async () => {
  const response = await resolvePost(requestWithJson({ productIds: ["available", "removed"] }));
  expect(await response.json()).toEqual(expect.objectContaining({ data: [expect.objectContaining({ id: "available" })] }));
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- --run app/api/favorites/route.test.ts app/api/favorites/resolve/route.test.ts`

Expected: FAIL because the routes do not exist.

- [ ] **Step 3: Implement account API behavior**

Implement `GET`, `POST`, and `DELETE` in `app/api/favorites/route.ts`:

```ts
const session = await requireActiveUser();
const ids = normalizeFavoriteProductIds(body.productIds ?? [body.productId]);
if (ids.length === 0) return NextResponse.json({ message: "At least one product is required." }, { status: 400 });

const { data: products } = await admin
  .from("products")
  .select("*")
  .in("product_id", ids)
  .eq("status", "available")
  .gt("quantity", 0);
const availableIds = (products ?? []).map((product) => String(product.product_id));
await admin.from("product_favorites").upsert(
  availableIds.map((productId) => ({ user_id: session.user.id, product_id: productId })),
  { onConflict: "user_id,product_id", ignoreDuplicates: true }
);
```

`GET` joins the caller's favorite IDs to currently available products and uses
the existing `toProductRecord` normalizer. `DELETE` scopes both `user_id` and
`product_id`. Map active-account errors with the existing account-access
response helper.

Implement the public resolve route as a `POST` accepting no more than 100 IDs,
querying only `status = "available"` and `quantity > 0`, then returning the
same public product record shape. It does not call admin-only profile APIs or
return missing IDs.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- --run app/api/favorites/route.test.ts app/api/favorites/resolve/route.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit favorite APIs**

```bash
git add app/api/favorites app/lib/favorites.ts
git commit -m "feat: add favorite APIs"
```

## Task 3: Privacy-Safe Public Seller API

**Files:**
- Create: `app/lib/publicSeller.ts`
- Create: `app/lib/publicSeller.test.ts`
- Create: `app/api/sellers/[sellerId]/route.ts`
- Create: `app/api/sellers/[sellerId]/route.test.ts`

- [ ] **Step 1: Write failing seller query and response-shape tests**

```ts
test("returns only the seller display name and active listings", async () => {
  const result = await getPublicSeller("11111111-1111-4111-8111-111111111111", 1, 12);
  expect(result).toEqual({
    seller: { id: "11111111-1111-4111-8111-111111111111", name: "Casey" },
    data: [expect.objectContaining({ id: "p-1", status: "available" })],
    total: 1,
    page: 1,
    limit: 12,
  });
  expect(JSON.stringify(result)).not.toContain("casey@example.com");
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- --run app/lib/publicSeller.test.ts app/api/sellers/[sellerId]/route.test.ts`

Expected: FAIL because the public seller helper and route do not exist.

- [ ] **Step 3: Implement the server-only seller query and route**

Create `getPublicSeller(sellerId, page, limit)` using `createAdminClient()`.
Validate the UUID with a strict UUID regular expression before querying. Select
only `id,name` from `users`, then select products matching seller ID,
`status = "available"`, and `quantity > 0`, using the existing product
normalizer and list-sort default. Return 404 for no seller or no public seller
profile, never contact fields.

The route parses bounded `page` and `limit` values and returns the helper's
explicit response object. It stays public because it only exposes the approved
shape.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- --run app/lib/publicSeller.test.ts app/api/sellers/[sellerId]/route.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit public seller API**

```bash
git add app/lib/publicSeller.ts app/lib/publicSeller.test.ts app/api/sellers
git commit -m "feat: add public seller profiles API"
```

## Task 4: Favorite Provider And Product Card Controls

**Files:**
- Create: `app/components/FavoritesProvider.tsx`
- Create: `app/components/FavoritesProvider.test.tsx`
- Modify: `app/components/ProductCard.tsx`
- Create: `app/components/ProductCard.test.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/i18n.tsx`
- Modify: `app/i18n.test.tsx`

- [ ] **Step 1: Write failing provider and card tests**

```tsx
test("keeps a guest favorite after reload", () => {
  render(<FavoritesProvider><FavoriteProbe productId="p-1" /></FavoritesProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Add to favorites" }));
  expect(JSON.parse(window.localStorage.getItem(favoriteStorageKey)!)).toEqual(["p-1"]);
});

test("links a product card to its public seller page without nesting the favorite button", () => {
  render(<ProductCard productId="p-1" sellerId="11111111-1111-4111-8111-111111111111" {...productProps} />);
  expect(screen.getByRole("link", { name: "More from this seller" })).toHaveAttribute("href", "/sellers/11111111-1111-4111-8111-111111111111");
  expect(screen.getByRole("button", { name: "Add to favorites" }).closest("a")).toBeNull();
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- --run app/components/FavoritesProvider.test.tsx app/components/ProductCard.test.tsx app/i18n.test.tsx`

Expected: FAIL because favorite context, seller link, and translation keys do not exist.

- [ ] **Step 3: Implement the provider, card controls, and locale labels**

Mount `FavoritesProvider` around the current global client providers in
`app/layout.tsx`. It must:

```ts
type FavoritesContextValue = {
  favoriteIds: Set<string>;
  initialized: boolean;
  toggleFavorite: (productId: string) => Promise<void>;
  retrySync: () => Promise<void>;
};
```

On a guest, update `favoriteStorageKey` optimistically. On authentication,
call `POST /api/favorites` once for the normalized local IDs, retain the local
value on failure, and replace it only on success. On an authenticated toggle,
call the account endpoint and restore the prior UI state if the request fails.

Add localized labels for add/remove favorite, favorites filter, empty local
favorites, unavailable favorites, and generic seller link in all three
dictionaries. Add a Lucide heart icon button to `ProductCard` and accept an
optional `sellerId`; do not render the seller link for a missing seller ID.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- --run app/components/FavoritesProvider.test.tsx app/components/ProductCard.test.tsx app/i18n.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit client favorite controls**

```bash
git add app/components/FavoritesProvider.tsx app/components/FavoritesProvider.test.tsx app/components/ProductCard.tsx app/components/ProductCard.test.tsx app/layout.tsx app/i18n.tsx app/i18n.test.tsx
git commit -m "feat: add guest and account favorite controls"
```

## Task 5: Marketplace Favorite View And Public Seller Page

**Files:**
- Create: `app/hook/useFavoriteProducts.tsx`
- Create: `app/hook/useFavoriteProducts.test.tsx`
- Modify: `app/overview/page.tsx`
- Modify: `app/overview/MarketplaceClient.test.tsx`
- Create: `app/sellers/[sellerId]/page.tsx`
- Create: `app/sellers/[sellerId]/page.test.tsx`
- Modify: `app/[locale]/product/[id]/page.tsx`
- Modify: `app/[locale]/product/[id]/page.test.tsx`

- [ ] **Step 1: Write failing marketplace and seller page tests**

```tsx
test("shows resolved favorites instead of the first marketplace page", async () => {
  render(<ProductListPage />);
  fireEvent.click(screen.getByRole("button", { name: "My favorites" }));
  expect(await screen.findByText("Saved desk")).toBeTruthy();
  expect(screen.queryByText("Unrelated listing")).toBeNull();
});

test("renders a seller name and active items without contact details", async () => {
  const page = await SellerPage({ params: Promise.resolve({ sellerId: sellerId }) });
  const html = renderToStaticMarkup(page);
  expect(html).toContain("Casey");
  expect(html).toContain("Desk lamp");
  expect(html).not.toContain("casey@example.com");
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- --run app/hook/useFavoriteProducts.test.tsx app/overview/MarketplaceClient.test.tsx app/sellers/[sellerId]/page.test.tsx app/[locale]/product/[id]/page.test.tsx`

Expected: FAIL because the favorite view and public seller page do not exist.

- [ ] **Step 3: Implement the favorites view and seller pages**

Implement `useFavoriteProducts` so it calls `GET /api/favorites` for an
authenticated user and `POST /api/favorites/resolve` for guest IDs. Both
responses carry `data`, `total`, `page`, and `limit`; client-side search,
category, sale, and clearance filters run over the resolved collection before
local pagination. This keeps a guest's complete saved list available without
placing IDs in URLs.

Add a selected `My favorites` toolbar button to `app/overview/page.tsx`. When
selected, render the hook's favorite results and exact empty state; when
unselected, preserve the existing `useProducts` list and URL sale/clearance
behavior. Pass each product's `sellerId` into `ProductCard`.

Create the public seller page using `getPublicSeller`, a regular product grid,
and a marketplace back link. Add a generic seller link to the localized
product detail page when `product.sellerId` is present. Keep `/seller` private;
do not modify `protectedPrefixes`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- --run app/hook/useFavoriteProducts.test.tsx app/overview/MarketplaceClient.test.tsx app/sellers/[sellerId]/page.test.tsx app/[locale]/product/[id]/page.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit marketplace and seller experience**

```bash
git add app/hook/useFavoriteProducts.tsx app/hook/useFavoriteProducts.test.tsx app/overview/page.tsx app/overview/MarketplaceClient.test.tsx app/sellers app/[locale]/product/[id]/page.tsx app/[locale]/product/[id]/page.test.tsx
git commit -m "feat: add favorite marketplace and seller pages"
```

## Task 6: End-To-End Verification

**Files:**
- Modify only if a regression test demonstrates a defect.

- [ ] **Step 1: Run the full automated suite**

Run: `npm test -- --run`

Expected: all tests pass; document any pre-existing framework teardown warning
separately from new failures.

- [ ] **Step 2: Build the production application**

Run: `npm run build`

Expected: exit code 0 and generated `/sellers/[sellerId]`, favorites APIs, and
existing protected `/seller` routes in the route report.

- [ ] **Step 3: Browser verification**

Run the local development server and verify desktop plus mobile behavior:

1. As a guest, heart a product, reload, and open My favorites.
2. Sign in, confirm the sync request succeeds, reload, and confirm favorites
   remain.
3. Open a product card's seller link and confirm only active listings and no
   email/contact data are visible.
4. Confirm the private `/seller` dashboard still redirects unauthenticated
   visitors to login while `/sellers/{sellerId}` remains public.

- [ ] **Step 4: Commit only regression fixes, if any**

```bash
git add <only-regression-fix-files>
git commit -m "fix: address favorite flow regression"
```
