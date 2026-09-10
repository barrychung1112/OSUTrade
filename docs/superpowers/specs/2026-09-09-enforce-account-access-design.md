# Enforce Account Access Design

## Goal

Prevent a Supabase-banned account or an account whose email domain is on the existing blocklist from using OSUTrade after it has obtained a NextAuth session.

## Scope

The existing Supabase `Before User Created` hook remains the account-creation boundary. This change adds the missing use-time boundary: every private OSUTrade API will require a current Supabase Auth account that is neither actively banned nor on `public.disposable_email_domains`.

## Design

`utils/auth/requireActiveUser.ts` will read the NextAuth session, retrieve the authoritative Auth user using the service-role client, reject a future `banned_until`, and check the user's email against the existing database-backed blocklist. It will throw a typed error for an absent session (401), banned account (403), or blocked email domain (403). A Supabase lookup failure will be a 503 rather than allowing access.

All private API handlers will replace their local `auth()` checks with this helper. The helper returns the original session shape so current seller/buyer ownership logic stays unchanged. Password login will check the existing blocklist before asking Supabase to authenticate; Google profile synchronization will reject a blocked domain even when an Auth user already exists.

## Non-goals

- Do not change the configured Supabase Auth Hook.
- Do not delete products, accounts, or files.
- Do not add an admin UI or new blocklist storage.

## Verification

Unit tests will cover session absence, an active ban, a blocked domain, expired bans, and lookup failure. Route tests will verify that product creation and image upload stop before their write operations. Authentication tests will prove password and existing Google account login reject a blocked domain.
