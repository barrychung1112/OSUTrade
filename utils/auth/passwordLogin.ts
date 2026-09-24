import { createClient } from "@supabase/supabase-js";
import { checkDisposableEmailStrict } from "@/utils/auth/disposableEmail";
import { createAdminClient } from "@/utils/supabase/admin";
import type { AppAuthUser } from "./googleProfile";

type LoginErrorCode =
  | "INVALID_CREDENTIALS"
  | "UNCONFIRMED_EMAIL"
  | "MISSING_CREDENTIALS"
  | "LOGIN_FAILED";

export class AuthLoginError extends Error {
  code: LoginErrorCode;
  status: number;

  constructor(code: LoginErrorCode, message: string, status: number) {
    super(message);
    this.name = "AuthLoginError";
    this.code = code;
    this.status = status;
  }
}

function createPasswordAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new AuthLoginError(
      "LOGIN_FAILED",
      "Supabase login credentials are not configured.",
      500
    );
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function mapSupabaseLoginError(error: { message?: string; status?: number }) {
  const message = error.message ?? "Unable to log in.";

  if (message.includes("Invalid login credentials")) {
    return new AuthLoginError(
      "INVALID_CREDENTIALS",
      "The email or password you entered is incorrect.",
      401
    );
  }

  if (message.includes("Email not confirmed")) {
    return new AuthLoginError(
      "UNCONFIRMED_EMAIL",
      "Please confirm your email address before logging in.",
      403
    );
  }

  return new AuthLoginError("LOGIN_FAILED", message, error.status || 500);
}

export async function authenticateWithPassword(
  email: string,
  password: string
): Promise<AppAuthUser> {
  if (!email || !password) {
    throw new AuthLoginError(
      "MISSING_CREDENTIALS",
      "Email and password are required.",
      400
    );
  }

  let admin: ReturnType<typeof createAdminClient>;
  let blocked: boolean;

  try {
    admin = createAdminClient();
    ({ blocked } = await checkDisposableEmailStrict(
      email,
      admin
    ));
  } catch {
    throw new AuthLoginError(
      "LOGIN_FAILED",
      "Login is temporarily unavailable. Please try again later.",
      503
    );
  }

  if (blocked) {
    throw new AuthLoginError(
      "LOGIN_FAILED",
      "The email or password you entered is incorrect.",
      401
    );
  }

  const supabase = createPasswordAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw mapSupabaseLoginError(error);
  }

  const user = data.user;

  if (!user?.id || !user.email) {
    throw new AuthLoginError(
      "LOGIN_FAILED",
      "Supabase did not return a valid user.",
      500
    );
  }

  const metadataName =
    user.user_metadata?.full_name ?? user.email.split("@")[0] ?? "User";
  let name = metadataName;

  try {
    const { data: profile, error: profileError } = await admin
      .from("users")
      .select("name")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (typeof profile?.name === "string" && profile.name.trim()) {
      name = profile.name;

      if (name !== metadataName) {
        const { error: metadataError } = await admin.auth.admin.updateUserById(
          user.id,
          {
            user_metadata: { name, full_name: name },
          }
        );
        if (metadataError) throw metadataError;
      }
    }
  } catch (error) {
    console.warn("Could not synchronize the public display name during login.", error);
  }

  return {
    id: user.id,
    email: user.email,
    name,
    role: user.user_metadata?.role ?? "user",
  };
}
