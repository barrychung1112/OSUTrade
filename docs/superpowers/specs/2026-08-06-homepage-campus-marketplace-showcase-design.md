# Homepage Campus Marketplace Showcase Design

## Goal

Replace the current dark homepage banner with a bright, product-led campus marketplace experience that immediately communicates that visitors can browse without signing in.

## Product Intent

The homepage should prove marketplace value before asking a visitor to register. It must present real available inventory, provide an obvious route to the marketplace, and keep selling as a protected secondary action.

## Visual Direction

- Use a warm-white page and hero surface instead of a full black background.
- Keep Beaver Orange `#D73F09` as the primary action and brand accent.
- Use near-black for headings and muted blue-gray for supporting text.
- Use small natural-green accents only for availability states.
- Do not use Oregon State University logos, crests, mascots, or language implying official affiliation.
- Use real product photography as the hero's primary visual asset.
- Use restrained borders, shadows, and radii no larger than 8px.

## Desktop Hero

The hero is a full-width, unframed band below the header. Its content uses the application's existing maximum content width and a two-column layout.

### Left Column

Display, in order:

1. Localized eyebrow equivalent to `OSU CAMPUS MARKETPLACE`.
2. Localized headline equivalent to `Give campus goods a second life.`
3. Localized supporting copy explaining that users may browse before signing in.
4. A primary `Browse marketplace` link to `/overview`.
5. A secondary `Sell an item` action that preserves the existing authentication gate and redirects to `/sell` after authentication.
6. Three compact trust signals: free browsing, campus pickup, and direct seller contact after an accepted request.

The primary action is the only solid orange button. The sell action is visually subordinate and must not compete with browsing.

### Product Showcase

- Request available inventory through the existing products API.
- Reuse `selectRandomHomeHeroProducts` to choose three products with an image, positive quantity, and `available` status.
- Present one large anchor product and two smaller overlapping products.
- Each product displays localized name, current price, and a textual availability indicator.
- Each product links to `/product/{id}`.
- Keep existing fallback images when live inventory is unavailable, but do not display fake product names or prices for fallbacks.
- Reserve fixed image dimensions to prevent layout shift.

## Supporting Marketplace Sections

The first viewport must reveal the beginning of the content below the hero.

1. `Recently listed` displays recent available inventory.
2. `Clearance corner` displays discounted, free, and one-dollar clearance inventory.

Existing product API behavior and product-detail links remain authoritative. Empty, loading, and unavailable states must occupy stable dimensions and provide a route to `/overview`.

## Responsive Behavior

### Mobile

- Stack hero copy above the product showcase.
- Keep the headline readable without viewport-width font scaling.
- Make both actions at least 48px high; the primary action spans the available width.
- Present products as a horizontal, touch-scrollable strip with the next item partially visible.
- Do not auto-rotate products.
- Prevent horizontal page overflow and account for the fixed header and mobile safe areas.

### Tablet and Desktop

- Switch to the two-column hero when both columns retain usable width.
- Keep the hero compact enough to reveal the next section at common 768px-high desktop viewports.
- Ensure localized navigation and hero text can wrap without overlapping the product composition.

## Motion

- Reveal hero copy with opacity and a maximum 12px vertical translation.
- Stagger product entrance by approximately 60ms.
- Use transform and opacity only; do not animate layout dimensions.
- Product hover may lift up to 4px on pointer devices.
- Disable nonessential translation, stagger, and hover motion when `prefers-reduced-motion` is active.

## Accessibility

- Maintain WCAG AA contrast for all text and controls.
- Keep visible keyboard focus indicators.
- Give product links useful labels containing localized product name and price.
- Do not rely on green alone for availability; include visible status text.
- Keep interactive targets at least 44px by 44px.
- Preserve semantic heading order and use a single homepage `h1`.

## Data and Failure Behavior

- No database or API schema changes are required.
- If the products request fails, render fallback imagery without invented listing data and keep the browse CTA functional.
- Loading and image failure states must not collapse the hero.
- The existing login modal and protected sell routing remain unchanged.

## Verification

- Unit test random hero selection and any new product-section selectors.
- Run lint, relevant unit tests, and production build.
- Use Playwright to verify desktop and mobile screenshots, navigation, product links, the protected sell action, no horizontal overflow, and reduced-motion compatibility.
- Confirm English, Traditional Chinese, and Simplified Chinese layouts do not clip or overlap.

## Out of Scope

- Changing product pricing, discount, clearance, authentication, or marketplace APIs.
- Adding an OSU logo or claiming official university affiliation.
- Auto-playing carousels, decorative background video, or new analytics instrumentation.
