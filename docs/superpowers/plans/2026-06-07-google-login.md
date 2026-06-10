# Google Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google third-party login that automatically creates an OSUTrade user profile and preserves the current email/password auth flow.

**Architecture:** Keep NextAuth as the application session owner. Add a Google provider in `auth.ts`, synchronize Google identities into `public.users` through a small Supabase profile helper, and add a polished Google CTA to the existing login and signup dialogs.

**Tech Stack:** Next.js App Router, NextAuth v5 beta, Supabase Admin client, React client components, Radix Themes, Tailwind CSS, Vitest, Playwright CLI.

---

## File Structure

- Modify: `auth.ts`
  - Add `next-auth/providers/google`.
  - Add Google provider only when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are configured.
  - Use NextAuth callbacks to upsert Google users into `public.users`.
  - Keep JWT/session fields compatible with existing API routes.
- Create: `utils/auth/googleProfile.ts`
  - Normalize Google profile fields.
  - Upsert a Google user into `public.users`.
  - Return the app user shape used by NextAuth JWT/session callbacks.
- Create: `app/components/GoogleSignInButton.tsx`
  - Client component shared by login and signup dialogs.
  - Uses `signIn("google", { callbackUrl })`.
  - Implements the frontend-design requirement: full-width, icon-plus-label, clear hover/focus states, 44px touch target.
- Modify: `app/components/LoginModal.tsx`
  - Add Google sign-in CTA above the email/password form.
  - Add divider between OAuth and email/password login.
- Modify: `app/components/SignUpModal.tsx`
  - Add the same Google CTA above the signup form.
  - Keep existing username/email/password signup unchanged.
- Modify: `app/i18n.tsx`
  - Add `auth.continueWithGoogle` and `auth.orContinueWithEmail` keys to all locale dictionaries.
- Optional Modify: `.env.example` if it exists
  - Add Google OAuth environment variable examples.

## Task 0: Prepare Feature Branch

**Files:**
- No file changes expected.

- [ ] **Step 1: Confirm current repository state**

Run:

```powershell
git status --short --branch
```

Expected:
- The branch is `master...origin/master` or a clean feature branch.
- Untracked local verification artifacts such as `output/` may exist and should not be staged.

- [ ] **Step 2: Create the implementation branch**

Run:

```powershell
git switch -c codex/google-login
```

Expected:
- Git switches to `codex/google-login`.
- All following implementation commits happen on this branch.

## Task 1: Add Google Profile Synchronization Helper

**Files:**
- Create: `utils/auth/googleProfile.ts`

- [ ] **Step 1: Create the helper file**

Use `apply_patch` to create `utils/auth/googleProfile.ts`:

```ts
import { createAdminClient } from "@/utils/supabase/admin";

export type AppAuthUser = {
  id: string;
  email: string;
  name?: string;
  role?: string;
};

type GoogleProfileInput = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
};

function getDisplayName(email: string, name?: string | null) {
  const trimmedName = String(name ?? "").trim();
  return trimmedName || email.split("@")[0] || "User";
}

export async function upsertGoogleUserProfile(
  profile: GoogleProfileInput
): Promise<AppAuthUser> {
  const email = String(profile.email ?? "").trim().toLowerCase();
  const providerId = String(profile.id ?? "").trim();

  if (!email) {
    throw new Error("Google account did not provide an email address.");
  }

  const admin = createAdminClient();
  const displayName = getDisplayName(email, profile.name);

  const { data: existingUser, error: lookupError } = await admin
    .from("users")
    .select("id, email, name, role")
    .eq("email", email)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  const id = existingUser?.id ?? providerId;

  if (!id) {
    throw new Error("Google account did not provide a stable user id.");
  }

  const role = existingUser?.role ?? "user";

  const { error: upsertError } = await admin.from("users").upsert(
    {
      id,
      email,
      name: existingUser?.name || displayName,
      role,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (upsertError) {
    throw upsertError;
  }

  return {
    id,
    email,
    name: existingUser?.name || displayName,
    role,
  };
}
```

- [ ] **Step 2: Run TypeScript check**

Run:

```powershell
npx.cmd tsc --noEmit
```

Expected: fails only if the project needs import/type adjustments. Fix those before continuing.

- [ ] **Step 3: Commit the helper**

Run:

```powershell
git add utils/auth/googleProfile.ts
git commit -m "Add Google profile sync helper"
```

## Task 2: Wire Google Provider Into NextAuth

**Files:**
- Modify: `auth.ts`

- [ ] **Step 1: Add imports and provider availability**

Update the top of `auth.ts`:

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { upsertGoogleUserProfile, type AppAuthUser } from "@/utils/auth/googleProfile";

type User = AppAuthUser;

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
```

- [ ] **Step 2: Add Google provider before credentials providers**

Inside `providers: [`, insert this spread before the first `Credentials(...)` provider:

```ts
    ...(googleClientId && googleClientSecret
      ? [
          Google({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
```

- [ ] **Step 3: Update callbacks to sync Google users**

Change the callback block to pass `account` into `jwt` and sync Google profiles:

```ts
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "google") {
        const googleProfile = profile as {
          sub?: string;
          email?: string;
          name?: string;
        };
        const authUser = await upsertGoogleUserProfile({
          id: googleProfile.sub ?? user?.id,
          email: googleProfile.email ?? user?.email,
          name: googleProfile.name ?? user?.name,
        });

        token.sub = authUser.id;
        token.email = authUser.email;
        token.name = authUser.name;
        token.role = authUser.role;
        return token;
      }

      if (user) {
        const authUser = user as User;
        token.sub = authUser.id;
        token.email = authUser.email;
        token.name = authUser.name;
        token.role = authUser.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const sessionUser = session.user as typeof session.user & {
          id?: string;
          role?: string;
        };

        sessionUser.id = token.sub as string;
        sessionUser.email = token.email as string;
        sessionUser.name = token.name as string;
        sessionUser.role = token.role as string | undefined;
      }

      return session;
    },
  },
```

- [ ] **Step 4: Run TypeScript check**

Run:

```powershell
npx.cmd tsc --noEmit
```

Expected: pass.

- [ ] **Step 5: Commit NextAuth wiring**

Run:

```powershell
git add auth.ts
git commit -m "Add Google provider to NextAuth"
```

## Task 3: Add Shared Google Sign-In Button

**Files:**
- Create: `app/components/GoogleSignInButton.tsx`

- [ ] **Step 1: Create the client component**

Use `apply_patch` to create `app/components/GoogleSignInButton.tsx`:

```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@radix-ui/themes";
import { useI18n } from "../i18n";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

export default function GoogleSignInButton({
  redirectTo = "/overview",
}: {
  redirectTo?: string;
}) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    setLoading(true);
    await signIn("google", { callbackUrl: redirectTo });
  }

  return (
    <Button
      type="button"
      size="3"
      variant="outline"
      disabled={loading}
      onClick={handleGoogleSignIn}
      className="min-h-11 w-full justify-center gap-2 border-gray-300 bg-white text-gray-900 shadow-sm transition hover:border-[#d73f09] hover:bg-orange-50 focus-visible:ring-2 focus-visible:ring-[#d73f09] focus-visible:ring-offset-2"
    >
      <GoogleIcon />
      <span>{loading ? t("common.loading") : t("auth.continueWithGoogle")}</span>
    </Button>
  );
}
```

- [ ] **Step 2: Run TypeScript check**

Run:

```powershell
npx.cmd tsc --noEmit
```

Expected: fail because `auth.continueWithGoogle` is not translated yet. Keep this red result as the expected test signal for Task 4.

## Task 4: Add I18n Keys For Google Auth

**Files:**
- Modify: `app/i18n.tsx`

- [ ] **Step 1: Add English keys**

In the `en` dictionary near existing `auth.*` entries, add:

```ts
    "auth.continueWithGoogle": "Continue with Google",
    "auth.orContinueWithEmail": "or continue with email",
```

- [ ] **Step 2: Add Traditional Chinese keys**

In the `zh` dictionary near existing `auth.*` entries, add:

```ts
    "auth.continueWithGoogle": "使用 Google 繼續",
    "auth.orContinueWithEmail": "或使用 Email 繼續",
```

- [ ] **Step 3: Add Simplified Chinese keys**

In `zhCnDictionary` near existing `auth.*` entries, add:

```ts
  "auth.continueWithGoogle": "使用 Google 继续",
  "auth.orContinueWithEmail": "或使用 Email 继续",
```

- [ ] **Step 4: Run TypeScript check**

Run:

```powershell
npx.cmd tsc --noEmit
```

Expected: pass.

- [ ] **Step 5: Commit Google button and translations**

Run:

```powershell
git add app/components/GoogleSignInButton.tsx app/i18n.tsx
git commit -m "Add Google sign-in CTA component"
```

## Task 5: Add Google CTA To Login And Signup Dialogs

**Files:**
- Modify: `app/components/LoginModal.tsx`
- Modify: `app/components/SignUpModal.tsx`

- [ ] **Step 1: Import the shared button**

Add this import to both modal files:

```tsx
import GoogleSignInButton from "./GoogleSignInButton";
```

- [ ] **Step 2: Add helper divider markup in LoginModal**

Inside `Dialog.Content`, before `<form onSubmit={onSubmit}>`, add:

```tsx
          <div className="mt-4 space-y-4">
            <GoogleSignInButton redirectTo={redirectTo} />
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <span className="h-px flex-1 bg-gray-200" />
              <span>{t("auth.orContinueWithEmail")}</span>
              <span className="h-px flex-1 bg-gray-200" />
            </div>
          </div>
```

Then change the form's `<Flex direction="column" gap="3" mt="4">` to:

```tsx
            <Flex direction="column" gap="3" mt="4">
```

Keep the form fields and submit button unchanged.

- [ ] **Step 3: Add the same divider markup in SignUpModal**

Inside `Dialog.Content`, after `<Dialog.Title>{t("auth.signup")}</Dialog.Title>` and before the `<form>`, add:

```tsx
          <div className="mt-4 space-y-4">
            <GoogleSignInButton redirectTo={redirectTo} />
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <span className="h-px flex-1 bg-gray-200" />
              <span>{t("auth.orContinueWithEmail")}</span>
              <span className="h-px flex-1 bg-gray-200" />
            </div>
          </div>
```

Keep the existing signup fields and submit button unchanged.

- [ ] **Step 4: Run TypeScript check**

Run:

```powershell
npx.cmd tsc --noEmit
```

Expected: pass.

- [ ] **Step 5: Commit modal integration**

Run:

```powershell
git add app/components/LoginModal.tsx app/components/SignUpModal.tsx
git commit -m "Add Google sign-in to auth dialogs"
```

## Task 6: Add Environment Documentation

**Files:**
- Modify: `.env.example` if present
- Otherwise modify: `README.md`

- [ ] **Step 1: Check whether `.env.example` exists**

Run:

```powershell
Test-Path .env.example
```

Expected:
- If `True`, update `.env.example`.
- If `False`, update `README.md` under the setup/environment section.

- [ ] **Step 2: Add Google OAuth variables**

Add this environment block to the selected file:

```env
# Google OAuth for NextAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# NextAuth callback base URL
# Local example: http://localhost:3000
# Production example: https://osutrade.com
NEXTAUTH_URL=
```

Also add this setup note:

```md
Google OAuth redirect URIs:
- Local: `http://localhost:3000/api/auth/callback/google`
- Production: `https://osutrade.com/api/auth/callback/google`
```

- [ ] **Step 3: Commit docs**

Run:

```powershell
git add .env.example README.md
git commit -m "Document Google OAuth setup"
```

If only one of those files exists or changed, stage only that file.

## Task 7: Full Local Verification

**Files:**
- No code changes expected.

- [ ] **Step 1: Run static checks and tests**

Run:

```powershell
npx.cmd tsc --noEmit
npm.cmd test -- --run
git diff --check
$env:NEXT_TELEMETRY_DISABLED='1'; npx.cmd next build --debug
```

Expected:
- TypeScript exits 0.
- Vitest reports 2 files and 3 tests passed.
- `git diff --check` has no whitespace errors. CRLF warnings are acceptable.
- Next build exits 0.

- [ ] **Step 2: Run Playwright local browser checks**

Start a clean dev server on an unused port, for example 3001:

```powershell
New-Item -ItemType Directory -Force -Path output\playwright | Out-Null
$out = Resolve-Path output\playwright
$p = Start-Process -FilePath npm.cmd -ArgumentList @('run','dev','--','-p','3001') -WorkingDirectory (Get-Location) -WindowStyle Hidden -RedirectStandardOutput (Join-Path $out 'google-dev-3001.out.log') -RedirectStandardError (Join-Path $out 'google-dev-3001.err.log') -PassThru
```

Use Playwright CLI from the skill:

```powershell
npx.cmd --yes --package @playwright/cli playwright-cli -s=osutrade-google open http://localhost:3001
npx.cmd --yes --package @playwright/cli playwright-cli -s=osutrade-google snapshot
npx.cmd --yes --package @playwright/cli playwright-cli -s=osutrade-google click "Login"
npx.cmd --yes --package @playwright/cli playwright-cli -s=osutrade-google snapshot
npx.cmd --yes --package @playwright/cli playwright-cli -s=osutrade-google console
npx.cmd --yes --package @playwright/cli playwright-cli -s=osutrade-google screenshot --filename "output/playwright/google-login-modal.png" --full-page
```

Expected:
- Login dialog opens.
- `Continue with Google` appears.
- Email/password fields remain visible.
- Console has no React runtime errors. A missing `favicon.ico` 404 is acceptable.

- [ ] **Step 3: Verify signup dialog**

Run:

```powershell
npx.cmd --yes --package @playwright/cli playwright-cli -s=osutrade-google close
npx.cmd --yes --package @playwright/cli playwright-cli -s=osutrade-google-signup open http://localhost:3001
npx.cmd --yes --package @playwright/cli playwright-cli -s=osutrade-google-signup click "Sign Up"
npx.cmd --yes --package @playwright/cli playwright-cli -s=osutrade-google-signup snapshot
npx.cmd --yes --package @playwright/cli playwright-cli -s=osutrade-google-signup console
npx.cmd --yes --package @playwright/cli playwright-cli -s=osutrade-google-signup screenshot --filename "output/playwright/google-signup-modal.png" --full-page
```

Expected:
- Signup dialog opens.
- `Continue with Google` appears.
- Username/email/password signup remains visible.

- [ ] **Step 4: Stop the dev server**

Run:

```powershell
Stop-Process -Id $p.Id -ErrorAction SilentlyContinue
npx.cmd --yes --package @playwright/cli playwright-cli close-all
```

Expected: no Playwright sessions remain open.

## Task 8: PR, Review, And Merge

**Files:**
- No code changes expected beyond previous commits.

- [ ] **Step 1: Confirm the feature branch is ready**

Run:

```powershell
git status --short --branch
```

Expected:
- Branch is `codex/google-login`.
- No uncommitted code changes remain.
- Untracked local verification artifacts such as `output/` are not staged.

- [ ] **Step 2: Push branch**

Run:

```powershell
git push -u origin codex/google-login
```

- [ ] **Step 3: Create PR**

Run:

```powershell
gh pr create --base master --head codex/google-login --title "Add Google third-party login" --body "## Summary`n- Add Google provider to NextAuth.`n- Automatically sync Google users into Supabase profiles.`n- Add Google sign-in CTA to login and signup dialogs.`n- Document Google OAuth setup.`n`n## Validation`n- npx.cmd tsc --noEmit`n- npm.cmd test -- --run`n- git diff --check`n- NEXT_TELEMETRY_DISABLED=1 npx.cmd next build --debug`n- Playwright local checks for login and signup dialogs"
```

- [ ] **Step 4: Request Copilot review and wait for checks**

Run:

```powershell
$prNumber = gh pr view codex/google-login --json number --jq ".number"
gh pr comment $prNumber --body "@copilot review"
gh pr checks $prNumber --watch --interval 10
gh pr view $prNumber --json comments,reviews,reviewDecision,mergeStateStatus,state,mergeable
```

Expected:
- Vercel passes.
- Copilot has no actionable comments, or all actionable comments are fixed in follow-up commits.

- [ ] **Step 5: Merge**

Run:

```powershell
gh pr merge $prNumber --squash --delete-branch --subject "Add Google third-party login"
git status --short --branch
```

Expected:
- PR merged.
- Local branch fast-forwards to `master...origin/master`.
- No uncommitted code changes remain.
