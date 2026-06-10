# Google Login Design

## Goal

Add Google third-party login so a new visitor can register or log in with Google, then use OSUTrade as a normal authenticated user without completing a separate onboarding flow.

## Product Decision

Google login automatically creates the OSUTrade account. When a Google identity signs in for the first time, OSUTrade creates or updates the matching row in `public.users` using the Google email and display name.

## Current Context

OSUTrade currently uses NextAuth for the application session and Supabase for password signup/login and profile storage. Existing protected API routes call `auth()` and use `session.user.id`, so the Google login path should keep NextAuth as the session owner. The header already depends on `SessionProvider`, `useSession()`, and a visible logout action, so this flow must preserve those pieces.

## Recommended Approach

Use NextAuth's Google provider and synchronize profiles in NextAuth callbacks.

- Add a Google provider to `auth.ts`.
- Keep the existing credentials providers for email/password login and signup.
- On Google sign-in, ensure the user has an email address.
- Upsert `public.users` with `id`, `email`, `name`, `role`, and `updated_at`.
- Populate JWT/session fields so existing seller, request, cart, and product APIs continue reading `session.user.id`, `session.user.email`, `session.user.name`, and `session.user.role`.

This avoids switching the app to Supabase OAuth session handling and keeps the implementation small enough for one feature branch.

## User Experience

Login and signup dialogs should both show a Google sign-in option above the email/password form.

The Google call to action should feel trustworthy and easy to scan:

- Use an icon-plus-label button, not plain text.
- Make the button full width inside the modal, with a clear border, visible hover state, and at least a 44px touch target.
- Label it as `Continue with Google`.
- Keep the email/password form visible below it for users who prefer the existing flow.
- Use a subtle divider between Google and email/password fields.
- Preserve the current OSUTrade orange accent without making the Google button look like a destructive or primary commerce action.

The modal should not add a separate username step for Google users. Google display name is used as the initial OSUTrade display name, with the email prefix as fallback.

## Data Flow

1. User clicks `Continue with Google` in the login or signup modal.
2. Client calls `signIn("google", { callbackUrl: redirectTo })`.
3. NextAuth redirects the user through Google OAuth.
4. Google returns profile data to NextAuth.
5. NextAuth verifies the profile includes an email address.
6. NextAuth upserts `public.users`.
7. NextAuth writes the JWT and session fields used by the app.
8. User lands on the original `redirectTo` route, usually `/overview`.

## Environment And External Setup

The app needs these environment variables in local `.env.local` and Vercel:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `AUTH_SECRET` or `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` or `AUTH_BASE_URL`

Google Cloud OAuth configuration must include these redirect URIs:

- Local: `http://localhost:3000/api/auth/callback/google`
- Production: `https://osutrade.com/api/auth/callback/google`

If local testing uses another port, that port must also be added to Google Cloud OAuth redirect URIs.

## Error Handling

- If Google does not provide an email, reject sign-in.
- If Supabase profile upsert fails, reject sign-in instead of creating a broken session.
- If required Google environment variables are missing, the app should still build, but the UI should either hide the Google button or show a clear disabled state. The implementation should prefer a small server-exposed capability endpoint or safe public flag instead of exposing secrets.
- Email/password login and signup error handling should remain unchanged.

## Testing And Verification

Local automated checks:

- `npx.cmd tsc --noEmit`
- `npm.cmd test -- --run`
- `git diff --check`
- `NEXT_TELEMETRY_DISABLED=1 npx.cmd next build --debug`

Browser verification with Playwright:

- Open the home page and verify login/signup dialogs render.
- Verify both dialogs show `Continue with Google`.
- Verify existing email/password fields remain available.
- Verify header logout is still visible after an authenticated session.
- Verify the main authenticated pages still load after login: `/overview`, `/sell`, `/cart`, `/requests`, and `/seller`.

Manual OAuth verification:

- Configure local Google OAuth redirect URI.
- Click `Continue with Google`.
- Complete Google authentication.
- Confirm a row exists in `public.users` for the Google account.
- Confirm the user can view marketplace, list items, and access seller/request pages.

## Out Of Scope

- Username onboarding after Google login.
- Account linking between an existing password account and Google account when emails differ.
- Replacing NextAuth with Supabase OAuth session handling.
- Adding other providers such as Discord or Apple.
