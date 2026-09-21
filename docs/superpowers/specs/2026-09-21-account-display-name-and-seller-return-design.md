# Account Display Name And Seller Return Design

## Goal

Let an authenticated user change their unique public display name, open their
own public seller profile from the account menu, and return from a seller page
to the exact Marketplace state they came from.

## User Experience

- The Header account menu adds `View my seller profile` and `Edit display name`.
- Editing opens a compact dialog with the current name, inline validation, save
  state, and a clear duplicate-name error.
- On success, the Header updates without requiring a new login. Public seller
  pages use the same updated name on the next request.
- Marketplace seller links include their current `/overview` URL as a return
  target. A seller profile's back action restores that target, including page,
  search, category, sale, clearance, and favorites filters.

## Data And Security

- `public.users.name` remains the canonical public display name and keeps its
  existing case-insensitive unique index.
- `PATCH /api/account/display-name` requires `requireActiveUser`, validates a
  trimmed 2-32 character display name without control characters, rejects an
  existing name owned by another account, and updates only the current user's
  row through the server-only admin client.
- The endpoint also updates that Auth user's `user_metadata.name` and
  `user_metadata.full_name`, so credential login does not restore an old name.
- The client calls NextAuth `update` only with the API's canonical returned
  name. The name is display-only in the JWT; all authorization continues to use
  the user id and existing active-account checks.
- Seller return targets are accepted only when they begin with `/overview`.
  Invalid, external, and protocol-relative values fall back to `/overview`.

## Tests

- API coverage: unauthenticated access, invalid input, self-excluded duplicate
  detection, conflict result, public profile update, and Auth metadata update.
- Header coverage: menu exposes both entries; a successful save updates the
  visible name and calls the protected endpoint.
- Navigation coverage: Marketplace seller links preserve the current URL;
  seller page back links use a valid return URL and reject unsafe values.
