import "server-only";
import { auth } from "@/auth";
import { checkDisposableEmail } from "@/utils/auth/disposableEmail";
import { createAdminClient } from "@/utils/supabase/admin";

export type AccountAccessErrorCode =
  | "UNAUTHENTICATED"
  | "ACCOUNT_BANNED"
  | "EMAIL_BLOCKED"
  | "AUTH_LOOKUP_UNAVAILABLE";

export class AccountAccessError extends Error {
  constructor(
    public readonly status: 401 | 403 | 503,
    public readonly code: AccountAccessErrorCode,
    message: string
  ) {
    super(message);
    this.name = "AccountAccessError";
  }
}

function isFutureBan(bannedUntil: string | null | undefined) {
  if (!bannedUntil) return false;

  const bannedAt = Date.parse(bannedUntil);
  return Number.isFinite(bannedAt) && bannedAt > Date.now();
}

export async function requireActiveUser() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new AccountAccessError(
      401,
      "UNAUTHENTICATED",
      "You must be logged in."
    );
  }

  const admin = createAdminClient();
  let authUser: { email?: string | null; banned_until?: string | null } | null;

  try {
    const { data, error } = await admin.auth.admin.getUserById(session.user.id);

    if (error || !data.user) {
      throw new Error(error?.message ?? "Supabase Auth user was not found.");
    }

    authUser = data.user;
  } catch {
    throw new AccountAccessError(
      503,
      "AUTH_LOOKUP_UNAVAILABLE",
      "Unable to verify your account. Please try again."
    );
  }

  if (isFutureBan(authUser.banned_until)) {
    throw new AccountAccessError(
      403,
      "ACCOUNT_BANNED",
      "This account is banned."
    );
  }

  if (!authUser.email) {
    throw new AccountAccessError(
      503,
      "AUTH_LOOKUP_UNAVAILABLE",
      "Unable to verify your account. Please try again."
    );
  }

  const { blocked } = await checkDisposableEmail(authUser.email, admin);
  if (blocked) {
    throw new AccountAccessError(
      403,
      "EMAIL_BLOCKED",
      "This email address is not allowed."
    );
  }

  return session;
}
