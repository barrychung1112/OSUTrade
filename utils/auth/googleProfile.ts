import { createAdminClient } from "@/utils/supabase/admin";
import type { AuthUser } from "@supabase/supabase-js";

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

type SupabaseAdminClient = ReturnType<typeof createAdminClient>;

function getDisplayName(email: string, name?: string | null) {
  const trimmedName = String(name ?? "").trim();
  return trimmedName || email.split("@")[0] || "User";
}

function isExistingAuthUserError(error: { message?: string }) {
  return /already.*registered|already.*exists|email.*exists/i.test(
    error.message ?? ""
  );
}

async function findAuthUserIdByEmail(
  admin: SupabaseAdminClient,
  email: string
) {
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
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

    page = nextPage;
  }
}

async function getOrCreateAuthUserId(
  admin: SupabaseAdminClient,
  email: string,
  displayName: string
) {
  const existingAuthUserId = await findAuthUserIdByEmail(admin, email);

  if (existingAuthUserId) {
    return existingAuthUserId;
  }

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
    .ilike("name", candidateName)
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

  const shortId = authUserId.replace(/-/g, "").slice(0, 8);

  if (!shortId) {
    throw new Error("Cannot generate a unique display name without a user id.");
  }

  const suffixedName = `${baseName}-${shortId}`;

  if (!(await isDisplayNameTaken(admin, suffixedName))) {
    return suffixedName;
  }

  throw new Error("Could not generate an available display name.");
}

export async function upsertGoogleUserProfile(
  profile: GoogleProfileInput
): Promise<AppAuthUser> {
  const email = String(profile.email ?? "").trim().toLowerCase();

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

  const id =
    existingUser?.id ?? (await getOrCreateAuthUserId(admin, email, displayName));
  const name =
    existingUser?.name ??
    (await getAvailableDisplayName(admin, displayName, id));
  const role = existingUser?.role ?? "user";

  const { error: upsertError } = await admin.from("users").upsert(
    {
      id,
      email,
      name,
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
    name,
    role,
  };
}
