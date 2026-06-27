# Batch Cross-Posting Design

## Goal

Allow a seller to select multiple available listings and generate one platform-specific post containing every selected item. Generated posts never include private contact details and always include a canonical OSUTrade URL for each item.

## Scope

- Replace the per-product cross-post panel with one batch cross-post workspace above the seller's listing rows.
- Allow selection of available listings only.
- Support 1 to 10 selected products per generated post.
- Generate one draft each for Facebook Marketplace, Craigslist, LINE, WeChat, and Discord.
- Use English for Facebook, Craigslist, and Discord; Traditional Chinese for LINE; Simplified Chinese for WeChat.
- Remove the contact-information option and exclude email, phone, LINE ID, and WeChat ID from generation inputs and outputs.

## Non-Goals

- Publishing directly to third-party platforms.
- Persisting generated drafts or selection state across sessions.
- Generating posts for pending, sold, or removed listings.
- Adding new product fields or changing the database schema.

## Seller Experience

The `My Listings` section owns batch selection and generation state.

- Each available product row has a selection checkbox near its product identity.
- Pending, sold, and removed products show a disabled checkbox and cannot enter the selection set.
- The section header includes `Select all available` and `Clear` commands plus the selected count.
- `Select all available` selects the first 10 available products in the current displayed order. Once 10 products are selected, remaining unchecked products are disabled until an item is removed.
- The batch cross-post workspace appears below the section header and above product rows when at least one product is selected.
- The workspace contains the existing Generate/Regenerate command, five platform tabs, preview, source badge, and Copy command.
- Changing the selected product set clears generated drafts immediately.
- The seller dashboard's background refresh intersects selection with products that still exist and remain available. If no products remain selected, the workspace closes.

All new interface text uses the existing English, Traditional Chinese, and Simplified Chinese i18n dictionaries.

## API Contract

Replace the single-product endpoint with:

`POST /api/seller/products/cross-post`

Request:

```json
{
  "productIds": ["product-1", "product-2"]
}
```

Rules:

1. Require an authenticated seller session.
2. Normalize IDs to unique, non-empty strings while preserving request order.
3. Reject fewer than 1 or more than 10 IDs with HTTP 400.
4. Query products by requested IDs, current `seller_id`, and `status = available`.
5. Reject the request if every requested ID is not returned. This prevents another seller's, missing, or stale listings from entering a post.
6. Reorder database rows to match the requested ID order.
7. Derive each canonical URL on the server as `<request-origin>/product/<encoded-id>`; never accept listing URLs from the client.

Response retains the existing shape:

```json
{
  "source": "ai",
  "copies": [
    {
      "platform": "facebook",
      "language": "en",
      "title": "Campus moving sale",
      "body": "..."
    }
  ]
}
```

The obsolete `POST /api/seller/products/[id]/cross-post` route and its tests are removed.

## Copy Generation

The generator accepts an ordered list of products and their server-derived URLs.

AI is responsible only for a short platform-appropriate post title and introduction. Item blocks are assembled deterministically from stored listing facts so links cannot be omitted and prices or availability cannot be invented.

Each item block contains:

- Localized product name.
- USD price.
- Localized category.
- Quantity available.
- Localized description when present.
- Image URL when present.
- Canonical OSUTrade product URL.

Every final draft contains exactly one item block for every selected product, in selection order. The canonical URL appears inside its corresponding item block regardless of whether AI generation succeeds.

The OpenAI request excludes `sellerContact` entirely. The deterministic assembler also has no contact-field input, providing defense in depth against accidental contact disclosure. This removes automatic contact injection; seller-authored free-form descriptions remain unchanged and are not redacted by this feature.

If the API key is absent, the request times out, the model returns invalid output, or any AI request fails, the generator uses localized deterministic titles and introductions while preserving the same item blocks.

## Components And State

`SellerPage` owns:

- `selectedProductIds`.
- Batch loading, error, generated copies, source, selected platform, and copied state.
- Selection reconciliation after seller data refresh.

`ProductRow` receives selection state and an `onSelectionChange` callback. It no longer owns cross-post generation state or renders a cross-post panel.

`BatchCrossPostPanel` renders selection controls, generation controls, platform tabs, preview, and copy feedback. It receives selected products and callbacks but does not fetch product data itself.

`crossPostCopy.ts` exposes a batch generator and deterministic item serializer. Platform/language metadata remains centralized there.

## Error Handling

- Empty or oversized selection: prevent submission in the UI and reject at the API.
- Stale or unauthorized product selection: return HTTP 400 with a generic message, refresh seller data, and remove invalid selections.
- AI failure: return deterministic fallback drafts rather than an API error.
- Clipboard failure: retain the draft and show the existing localized copy error.
- Selection change during generation: ignore the stale response by comparing the submitted selection key with the current selection key.

## Testing

Unit tests cover:

- Platform language mapping.
- One to ten products in selection order.
- Every platform draft containing every canonical product URL.
- Contact fields never appearing in prompts, fallback drafts, or final drafts.
- Localized item facts for LINE and WeChat.
- AI failure and malformed output fallback.

Route tests cover:

- Authentication.
- Selection count validation and ID de-duplication.
- Seller ownership and `available` status filters.
- Failure when any requested product is missing or invalid.
- Server-derived canonical URLs and preserved request order.

Browser verification covers:

- Selecting, deselecting, select-all, clear, and the 10-item limit.
- Disabled selection for unavailable products.
- Draft invalidation when selection changes.
- Multi-item generation, platform switching, localized LINE/WeChat drafts, and Copy feedback.
- Desktop and 390 px mobile layouts with no overflow or overlapping controls.

## Acceptance Criteria

- A seller can select 1 to 10 available products and generate one post per supported platform.
- Each generated post includes all selected products and the canonical OSUTrade URL for each product.
- No structured seller email, phone, LINE ID, or WeChat ID fields are added to generation inputs or outputs.
- Unavailable or non-owned products cannot be included.
- Changing selection invalidates stale drafts.
- Unit, route, TypeScript, production build, and Playwright verification pass.
