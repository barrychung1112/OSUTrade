import { createAdminClient } from "@/utils/supabase/admin";
import type { AuthUser } from "@supabase/supabase-js";

export type AppAuthUser = {
  id: string;
  email: string;
  name?: string;
  role?: string;
};

type GoogleProfileInput = {
  email?: string | null;
  emailVerified?: boolean | null;
  name?: string | null;
};

type SupabaseAdminClient = ReturnType<typeof createAdminClient>;

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function getDisplayName(email: string, name?: string | null) {
  const trimmedName = String(name ?? "").trim();
  return trimmedName || email.split("@")[0] || "User";
}

function isExistingAuthUserError(error: {
  code?: string;
  status?: number;
  name?: string;
  message?: string;
}) {
  const code = String(error.code ?? "").toLowerCase();

  if (code) {
    return (
      code === "email_exists" ||
      code === "user_already_exists" ||
      /email.*(exist|registered)|user.*(exist|registered)/.test(code)
    );
  }

  if (
    error.status &&
    [400, 409, 422].includes(error.status) &&
    /auth/i.test(error.name ?? "")
  ) {
    return /already.*registered|already.*exists|email.*exists/i.test(
      error.message ?? ""
    );
  }

  return /already.*registered|already.*exists|email.*exists/i.test(
    error.message ?? ""
  );
}

function isUniqueNameConflict(error: {
  code?: string;
  message?: string;
  details?: string;
}) {
  const text = `${error.message ?? ""} ${error.details ?? ""}`;
  return error.code === "23505" && /name/i.test(text);
}

function getShortAuthId(authUserId: string) {
  const shortId = authUserId.replace(/-/g, "").slice(0, 8);

  if (!shortId) {
    throw new Error("Cannot generate a unique display name without a user id.");
  }

  return shortId;
}

async function findAuthUserIdByEmail(
  admin: SupabaseAdminClient,
  email: string
) {
  const maxPages = 100;
  const perPage = 1000;
  let page = 1;
  const visitedPages = new Set<number>();

  while (true) {
    if (visitedPages.has(page)) {
      throw new Error("Supabase Auth user pagination repeated a page.");
    }

    if (visitedPages.size >= maxPages) {
      throw new Error("Supabase Auth user lookup exceeded the page limit.");
    }

    visitedPages.add(page);

    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const users = data.users as AuthUser[];
    const user = users.find(
      (candidate) => candidate.email?.toLowerCase() === email
    );

    if (user?.id) {
      return user.id;
    }

    const nextPage = "nextPage" in data ? data.nextPage : null;

    if (!nextPage) {
      return null;
    }

    if (nextPage <= page) {
      throw new Error("Supabase Auth user pagination did not progress.");
    }

    page = nextPage;
  }
}

async function getOrCreateAuthUserId(
  admin: SupabaseAdminClient,
  email: string,
  displayName: string
) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      name: displayName,
      full_name: displayName,
      auth_provider: "google",
    },
  });

  if (!error) {
    if (!data.user?.id) {
      throw new Error("Supabase Auth did not return a user id.");
    }

    return data.user.id;
  }

  if (!isExistingAuthUserError(error)) {
    throw error;
  }

  const fallbackAuthUserId = await findAuthUserIdByEmail(admin, email);

  if (!fallbackAuthUserId) {
    throw new Error(
      "Supabase Auth reports this email exists, but no matching user was found."
    );
  }

  return fallbackAuthUserId;
}

async function isDisplayNameTaken(
  admin: SupabaseAdminClient,
  candidateName: string
) {
  const { data, error } = await admin
    .from("users")
    .select("id")
    .ilike("name", escapeLikePattern(candidateName))
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

async function getAvailableDisplayName(
  admin: SupabaseAdminClient,
  baseName: string,
  authUserId: string
) {
  if (!(await isDisplayNameTaken(admin, baseName))) {
    return baseName;
  }

  const shortId = getShortAuthId(authUserId);
  const suffixedName = `${baseName}-${shortId}`;

  if (!(await isDisplayNameTaken(admin, suffixedName))) {
    return suffixedName;
  }

  throw new Error("Could not generate an available display name.");
}

async function upsertPublicUserProfile(
  admin: SupabaseAdminClient,
  user: AppAuthUser
) {
  const { error } = await admin.from("users").upsert(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  return error;
}

export async function upsertGoogleUserProfile(
  profile: GoogleProfileInput
): Promise<AppAuthUser> {
  const email = String(profile.email ?? "").trim().toLowerCase();

  if (!email) {
    throw new Error("Google account did not provide an email address.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Google account did not provide a valid email address.");
  }

  if (profile.emailVerified === false) {
    throw new Error("Google account email is not verified.");
  }

  const admin = createAdminClient();
  const displayName = getDisplayName(email, profile.name);

  const { data: existingUser, error: lookupError } = await admin
    .from("users")
    .select("id, email, name, role")
    .ilike("email", escapeLikePattern(email))
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  const id =
    existingUser?.id ?? (await getOrCreateAuthUserId(admin, email, displayName));
  const name =
    existingUser?.name ??
    (await getAvailableDisplayName(admin, displayName, id));
  const role = existingUser?.role ?? "user";
  const user = { id, email, name, role };
  const upsertError = await upsertPublicUserProfile(admin, user);

  if (upsertError) {
    if (!existingUser && isUniqueNameConflict(upsertError)) {
      const fallbackName = `${displayName}-${getShortAuthId(id)}`;

      if (fallbackName !== name) {
        const retryError = await upsertPublicUserProfile(admin, {
          ...user,
          name: fallbackName,
        });

        if (!retryError) {
          return {
            id,
            email,
            name: fallbackName,
            role,
          };
        }

        if (isUniqueNameConflict(retryError)) {
          throw new Error("Could not generate an available display name.");
        }

        throw retryError;
      }

      throw new Error("Could not generate an available display name.");
    }

    throw upsertError;
  }

  return {
    id,
    email,
    name,
    role,
  };
}
