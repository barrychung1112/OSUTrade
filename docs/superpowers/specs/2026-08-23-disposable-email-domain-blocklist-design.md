# Disposable Email Domain Blocklist Design

## Goal

Prevent new OSUTrade accounts from being created with known disposable email
domains while preserving existing account access and keeping registration
available during temporary blocklist lookup failures.

## Scope

- Block new email/password registrations that use an active blocked domain.
- Block first-time Google sign-ins that would create an OSUTrade account with an
  active blocked domain.
- Allow existing email/password and Google users to continue signing in.
- Store and manage blocked domains in Supabase.
- Return a stable application error code and localized user-facing message.

This change does not automatically ban existing users, delete accounts, remove
products, add an admin UI, or call a third-party email reputation service.

## Database Design

Create `public.disposable_email_domains` with these columns:

- `domain text primary key`
- `active boolean not null default true`
- `reason text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Domains are stored lowercase without a leading `@` or trailing dot. A database
check constraint enforces the normalized format. Row Level Security is enabled
without anonymous or authenticated policies, so browser clients cannot read or
modify the list. Server routes use the existing service-role Supabase client.

The migration seeds `hutdot.com` as an active disposable email provider.

## Domain Matching

A shared server utility normalizes the email, extracts the domain, and generates
suffix candidates. For `user@mail.hutdot.com`, candidates include:

- `mail.hutdot.com`
- `hutdot.com`

The utility queries for an active exact match among those candidates. This means
blocking `hutdot.com` also blocks its subdomains without treating unrelated
domains such as `nothutdot.com` as matches.

Malformed emails remain the responsibility of the existing email validation.

## Registration Flows

### Email and Password

The signup API checks the domain after validating the email format and before
checking username availability or calling Supabase Auth. A match returns HTTP
`400` with:

```json
{
  "errorCode": "DISPOSABLE_EMAIL_NOT_ALLOWED",
  "message": "Please use an email address that you can access long term."
}
```

### Google

Google profile handling first looks for an existing OSUTrade public user by
email. Existing users continue normally. If no public user exists, the domain is
checked before creating a Supabase Auth user or public profile. A match aborts
account creation with a controlled authentication error.

## Failure Policy

Blocklist lookup failures are fail-open:

- Log a structured server error without exposing credentials or the full list.
- Continue registration.
- Do not display a database failure to the user.

This prevents a temporary Supabase issue from disabling all new registration.
An actual active-domain match remains fail-closed for account creation.

## User Experience

The existing signup UI maps `DISPOSABLE_EMAIL_NOT_ALLOWED` to localized English,
Traditional Chinese, and Simplified Chinese guidance asking for a permanent
email address. Google authentication uses the existing login error surface with
equivalent guidance where the authentication framework permits it.

## Testing

Automated tests cover:

- Exact blocked-domain matching.
- Case-insensitive normalization.
- Subdomain matching.
- Unrelated and common permanent domains remaining allowed.
- Fail-open behavior and error logging when Supabase lookup fails.
- Email/password signup rejection before account creation.
- Google first-time account rejection.
- Existing Google account access remaining unchanged.
- SQL schema, RLS, normalized-domain constraint, and the `hutdot.com` seed.

## Rollout And Rollback

1. Apply the Supabase migration before deploying application code.
2. Deploy the server and UI changes.
3. Verify a blocked test domain is rejected and a normal address reaches the
   existing registration path.

If the feature causes unexpected registration failures, set affected rows to
`active = false`. Because lookup failures are fail-open, Supabase availability
does not require an application rollback.
