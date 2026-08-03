# Seller Dashboard Workspace Design

## Goal

Turn the seller dashboard into a product-management workspace while preserving all existing listing, discount, cross-post, and request behavior.

## Experience

- Use compact, filterable summary metrics for available, pending, sold, and unanswered requests.
- Put product management first with search, status filters, sorting, visible selection state, and batch discount actions.
- Keep active-request products visibly locked and exclude them from batch edits.
- Use compact product rows on desktop and touch-friendly cards plus a sticky batch bar on mobile.
- Move buyer requests below product management and keep expired/history sections visually secondary.

## Technical Scope

- Keep current seller APIs and request response behavior.
- Add pure client-side product filtering and sorting helpers with unit tests.
- Apply batch discounts through existing validated product update requests, then refresh dashboard state.
- Add English, Traditional Chinese, and Simplified Chinese labels for new controls.
- Verify desktop and mobile layouts with Playwright, including no horizontal overflow.
