# Google Analytics Design

## Goal

Add the GA4 measurement tag `G-EE1HLRT49M` to OSUTrade so production visits are recorded without polluting analytics with local development or Vercel Preview traffic.

## Scope

- Load Google's `gtag.js` from the root App Router layout.
- Initialize `window.dataLayer` and configure GA4 with `G-EE1HLRT49M`.
- Enable tracking only when `VERCEL_ENV` is `production`.
- Keep the measurement ID in source because GA measurement IDs are public identifiers, not secrets.
- Do not add packages, database changes, consent management, custom events, or user-identifying data.

## Implementation

Use Next.js `Script` with the `afterInteractive` strategy so analytics does not block the initial page render. A small pure helper will determine whether the current deployment is production. The root layout will render both the external GA script and the inline initialization script only when that helper returns true.

## Failure Behavior

If Google Analytics is blocked by a browser, extension, or network policy, OSUTrade continues operating normally. Analytics failures must not affect navigation, authentication, listings, or transactions.

## Verification

- Unit-test that analytics is enabled for `production` and disabled for `preview`, `development`, and missing environment values.
- Run the existing test suite and production build.
- After deployment, verify the production HTML contains the GA script and measurement ID.
- Confirm traffic in GA4 Realtime separately; browser privacy tools may suppress individual events.
