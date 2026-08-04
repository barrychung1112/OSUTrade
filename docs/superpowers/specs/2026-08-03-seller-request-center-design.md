# Seller Request Center Design

## Goal

Keep the seller dashboard focused on product management while making incoming trade requests continuously accessible.

## Experience

- Replace the full request section with a fixed bottom-right Request Center trigger.
- The collapsed trigger shows the pending request count, described as pending rather than unread because the database has no read state.
- Opening the center reveals active, expired, and historical requests with the existing accept and decline actions.
- The pending-request summary card opens the center.
- Desktop uses a right-side floating drawer. Mobile uses a bottom sheet that fills most of the viewport without conflicting with the batch action bar.
- Escape, backdrop click, and the close icon dismiss the center. Focus returns to the trigger.

## Data And Safety

- Reuse `/api/seller/requests` and the existing request update callback.
- Do not add tables, columns, or API routes.
- Preserve request expiry and product locking behavior.
- Keep active requests expanded; expired and history groups remain collapsible.

## Accessibility

- Use dialog semantics, an accessible title, labelled controls, visible focus styles, and a minimum 44px touch target.
- Lock body scrolling while the mobile/desktop drawer is open.
- Respect reduced-motion preferences.

## Verification

- Unit-test request grouping and pending-count behavior.
- Type-check, run the complete test suite, and produce a production build.
- Use Playwright at desktop and mobile viewports to verify opening, closing, grouping, overflow, and console output.
