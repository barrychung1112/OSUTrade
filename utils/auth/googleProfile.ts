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
