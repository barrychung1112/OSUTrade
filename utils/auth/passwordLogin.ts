import { createClient } from "@supabase/supabase-js";
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

  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name ?? user.email.split("@")[0] ?? "User",
    role: user.user_metadata?.role ?? "user",
  };
}
