# Batch Cross-Posting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace per-product cross-post generation with a seller-owned batch flow that generates one localized post containing 1 to 10 available products, always including every OSUTrade product link and never automatically injecting seller contact fields.

**Architecture:** Move generation state to `SellerPage`, expose pure selection helpers for testable limits and reconciliation, and replace the dynamic single-product route with a static batch route. OpenAI generates only each platform's title and introduction; deterministic serializers append ordered, localized item blocks and canonical links so required facts cannot be omitted.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase admin client, OpenAI Responses API, Vitest, Playwright CLI, Radix Themes, Tailwind CSS.

---

### Task 1: Batch Copy Generator

**Files:**
- Modify: `app/lib/crossPostCopy.ts`
- Modify: `app/lib/crossPostCopy.test.ts`

- [ ] **Step 1: Replace single-product expectations with failing ordered batch tests**

Define test fixtures with two products and canonical URLs, then assert:

```ts
const listings = [
  { product, productUrl: "https://osutrade.example/product/product-1" },
  { product: secondProduct, productUrl: "https://osutrade.example/product/product-2" },
];

const copies = buildFallbackCrossPostCopies(listings);

expect(copies).toHaveLength(5);
for (const copy of copies) {
  expect(copy.body).toContain(listings[0].productUrl);
  expect(copy.body).toContain(listings[1].productUrl);
  expect(copy.body.indexOf(listings[0].productUrl)).toBeLessThan(
    copy.body.indexOf(listings[1].productUrl)
  );
  expect(copy.body).not.toContain("seller-line");
  expect(copy.body).not.toContain("seller-wechat");
  expect(copy.body).not.toContain("541-555-0101");
}
```

Add AI tests asserting the request contains only localized listing facts and URLs, while the final bodies still contain deterministic item blocks even if the AI output only returns `title` and `introduction`.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
npm.cmd test -- app/lib/crossPostCopy.test.ts --run
```

Expected: FAIL because `buildFallbackCrossPostCopies` and `generateCrossPostCopies` still accept one product and AI output still owns the complete body.

- [ ] **Step 3: Implement the batch generator and deterministic serializer**

Introduce these public shapes:

```ts
export type CrossPostListing = {
  product: Product;
  productUrl: string;
};

type AiPlatformDraft = {
  platform: CrossPostPlatform;
  title: string;
  introduction: string;
};

export function buildFallbackCrossPostCopies(
  listings: CrossPostListing[]
): CrossPostCopy[];

export async function generateCrossPostCopies(
  listings: CrossPostListing[]
): Promise<CrossPostGenerationResult>;
```

Remove `includeContactInfo`, `contactLines`, and all `sellerContact` use. Add a platform serializer that builds each body from a localized fallback/AI introduction followed by one item block per listing. Item blocks must include localized name, price, category, quantity, optional description, optional image, and `OSUTrade: <productUrl>`.

Change the strict JSON schema so each AI result contains only:

```ts
{
  platform: CrossPostPlatform;
  title: string;
  introduction: string;
}
```

Normalize AI drafts only when all five platforms contain non-empty fields; otherwise use fallback titles and introductions. Keep the 15-second timeout and output-token cap.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```powershell
npm.cmd test -- app/lib/crossPostCopy.test.ts --run
```

Expected: all generator tests PASS, including URL order, localized LINE/WeChat item facts, no structured contacts, and AI fallback.

- [ ] **Step 5: Commit generator changes**

```powershell
git add app/lib/crossPostCopy.ts app/lib/crossPostCopy.test.ts
git commit -m "Refactor cross-post copy for product batches"
```

### Task 2: Seller-Owned Batch API

**Files:**
- Create: `app/api/seller/products/cross-post/route.ts`
- Create: `app/api/seller/products/cross-post/route.test.ts`
- Delete: `app/api/seller/products/[id]/cross-post/route.ts`
- Delete: `app/api/seller/products/[id]/cross-post/route.test.ts`

- [ ] **Step 1: Write failing route tests for batch validation and ownership**

Test the static batch route with mocked auth and Supabase chains:

```ts
test("rejects empty and oversized selections", async () => {
  expect((await POST(request({ productIds: [] }))).status).toBe(400);
  expect(
    (await POST(request({ productIds: Array.from({ length: 11 }, (_, i) => `p-${i}`) }))).status
  ).toBe(400);
});

test("queries unique available seller products and preserves request order", async () => {
  const response = await POST(request({ productIds: ["p-2", "p-1", "p-2"] }));
  expect(query.in).toHaveBeenCalledWith("product_id", ["p-2", "p-1"]);
  expect(query.eq).toHaveBeenCalledWith("seller_id", "seller-1");
  expect(query.eq).toHaveBeenCalledWith("status", "available");
  expect(generateCrossPostCopies).toHaveBeenCalledWith([
    expect.objectContaining({ product: expect.objectContaining({ id: "p-2" }) }),
    expect.objectContaining({ product: expect.objectContaining({ id: "p-1" }) }),
  ]);
});
```

Also test unauthenticated requests, missing/unauthorized/stale rows, canonical URL derivation, and ignored client-supplied URLs.

- [ ] **Step 2: Run the route test and verify RED**

Run:

```powershell
npm.cmd test -- 'app/api/seller/products/cross-post/route.test.ts' --run
```

Expected: FAIL because the static batch route does not exist.

- [ ] **Step 3: Implement the static batch route**

The route must:

```ts
const requestedIds = Array.isArray(body.productIds)
  ? [...new Set(body.productIds.map((id: unknown) => String(id).trim()).filter(Boolean))]
  : [];

if (requestedIds.length < 1 || requestedIds.length > 10) {
  return NextResponse.json({ message: "Select between 1 and 10 products." }, { status: 400 });
}
```

Query with `.in("product_id", requestedIds)`, `.eq("seller_id", session.user.id)`, and `.eq("status", "available")`. Reject when returned row count differs from requested ID count. Build a row map, restore requested order, URL-encode each product ID, and call the batch generator. Return a generic 400 response for stale or unauthorized selections.

Delete the old dynamic route and its tests after the static route passes.

- [ ] **Step 4: Run route and generator tests**

Run:

```powershell
npm.cmd test -- app/lib/crossPostCopy.test.ts 'app/api/seller/products/cross-post/route.test.ts' --run
```

Expected: both files PASS.

- [ ] **Step 5: Commit the route migration**

```powershell
git add app/api/seller/products app/lib/crossPostCopy.ts app/lib/crossPostCopy.test.ts
git commit -m "Add seller batch cross-post API"
```

### Task 3: Pure Batch Selection Rules

**Files:**
- Create: `app/lib/crossPostSelection.ts`
- Create: `app/lib/crossPostSelection.test.ts`

- [ ] **Step 1: Write failing tests for selection limits and reconciliation**

```ts
test("selects the first ten available products in display order", () => {
  expect(selectAllAvailable(products)).toEqual(
    products.filter((product) => product.status === "available").slice(0, 10).map((product) => String(product.id))
  );
});

test("reconciles selection with products that remain available", () => {
  expect(reconcileCrossPostSelection(["p-3", "p-1", "missing"], products)).toEqual(["p-1"]);
});

test("does not add an eleventh product", () => {
  expect(toggleCrossPostSelection(firstTenIds, "p-11", true)).toEqual(firstTenIds);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
npm.cmd test -- app/lib/crossPostSelection.test.ts --run
```

Expected: FAIL because the selection helper module does not exist.

- [ ] **Step 3: Implement pure selection helpers**

Export:

```ts
export const maxCrossPostProducts = 10;
export function selectAllAvailable(products: SelectableProduct[]): string[];
export function reconcileCrossPostSelection(ids: string[], products: SelectableProduct[]): string[];
export function toggleCrossPostSelection(ids: string[], id: string, checked: boolean): string[];
```

Preserve current display order for select-all, preserve current selection order when reconciling, de-duplicate IDs, and cap all results at 10.

- [ ] **Step 4: Run focused tests and verify GREEN**

```powershell
npm.cmd test -- app/lib/crossPostSelection.test.ts --run
```

Expected: all selection tests PASS.

- [ ] **Step 5: Commit selection helpers**

```powershell
git add app/lib/crossPostSelection.ts app/lib/crossPostSelection.test.ts
git commit -m "Add batch cross-post selection rules"
```

### Task 4: Seller Dashboard Batch UI

**Files:**
- Modify: `app/seller/page.tsx`
- Modify: `app/i18n.tsx`

- [ ] **Step 1: Move cross-post state and generation to `SellerPage`**

Add parent state for selected IDs, copies, source, loading, error, selected platform, copied platform, and a submitted selection key. Derive selected products from `sortedProducts`. Reconcile selection after product refresh with `reconcileCrossPostSelection`.

Generate with:

```ts
const submittedIds = [...selectedProductIds];
const submittedKey = submittedIds.join("\u0000");
const response = await fetch("/api/seller/products/cross-post", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ productIds: submittedIds }),
});

if (submittedKey !== selectedProductIdsRef.current.join("\u0000")) return;
```

Clear drafts whenever selection changes. On HTTP 400, refresh seller data and reconcile invalid selections.

- [ ] **Step 2: Add list-level selection controls and batch panel**

Render in the `My Listings` section header:

- Selected count.
- `Select all available` command.
- `Clear` command.

Render `BatchCrossPostPanel` below the section header when at least one item is selected. Reuse platform tabs, preview, source badge, and Copy behavior from the old per-row panel, but remove the contact checkbox and its state.

Pass each `ProductRow`:

```ts
selected={selectedProductIds.includes(String(product.id))}
selectionDisabled={
  product.status !== "available" ||
  (!selected && selectedProductIds.length >= maxCrossPostProducts)
}
onSelectionChange={(checked) => updateSelection(product.id, checked)}
```

Place the checkbox beside the product image/name, with a localized accessible label. Keep status, editing, and contact preview behavior unchanged.

- [ ] **Step 3: Update all three locale dictionaries**

Remove the contact-option key and add localized strings for selected count, select all, clear, unavailable-selection explanation, maximum-selection explanation, and batch generation errors in English, Traditional Chinese, and Simplified Chinese.

- [ ] **Step 4: Run TypeScript and focused tests**

```powershell
npx.cmd tsc --noEmit
npm.cmd test -- app/lib/crossPostCopy.test.ts app/lib/crossPostSelection.test.ts 'app/api/seller/products/cross-post/route.test.ts' --run
```

Expected: TypeScript exits 0 and all focused tests PASS.

- [ ] **Step 5: Commit the batch UI**

```powershell
git add app/seller/page.tsx app/i18n.tsx
git commit -m "Add batch cross-post controls to seller dashboard"
```

### Task 5: Browser And Full Verification

**Files:**
- No production files unless verification reveals a defect.
- Store screenshots under: `output/playwright/`

- [ ] **Step 1: Run the complete automated verification suite**

```powershell
npm.cmd test -- --run
npx.cmd tsc --noEmit
$env:NEXT_TELEMETRY_DISABLED='1'; npm.cmd run build
git diff --check
```

Expected: all tests pass, TypeScript and build exit 0, and diff check reports no errors.

- [ ] **Step 2: Start one clean development server**

Start the app on an unused port with no second Next.js process sharing the same `.next` directory. Use a seller session and mock only environment-dependent seller/notification/cross-post API responses when local Supabase admin credentials are unavailable.

- [ ] **Step 3: Verify desktop interactions with Playwright CLI**

At 1280x800 verify:

- Only available products can be selected.
- Select-all chooses the first 10 available products.
- Clear removes every selection.
- Changing selection removes generated drafts.
- One generation request contains all selected product IDs.
- Every platform preview contains all selected products and every OSUTrade link.
- LINE uses Traditional Chinese and WeChat uses Simplified Chinese.
- Copy changes to Copied and console has zero errors.

- [ ] **Step 4: Verify mobile layout**

Resize to 390x844 and capture the selection toolbar, product checkbox, platform tabs, preview, and Copy control. Confirm no horizontal overflow, clipped text, or overlapping controls.

- [ ] **Step 5: Perform final review and commit any verification fixes**

Review the complete branch diff for authorization, stale-selection races, contact leakage, deterministic URL inclusion, i18n coverage, and unrelated changes. If fixes are required, add a failing regression test first, implement the correction, rerun the relevant checks, and commit with a focused message.
