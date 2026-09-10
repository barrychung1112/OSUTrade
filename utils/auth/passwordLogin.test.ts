import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { authenticateWithPassword, AuthLoginError } from "./passwordLogin";
import { createAdminClient } from "@/utils/supabase/admin";
import { checkDisposableEmailStrict } from "@/utils/auth/disposableEmail";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));
vi.mock("@/utils/auth/disposableEmail", () => ({
  checkDisposableEmailStrict: vi.fn(),
}));

const signInWithPassword = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  vi.mocked(createClient).mockReturnValue({
    auth: {
      signInWithPassword,
    },
  } as never);
  vi.mocked(createAdminClient).mockReturnValue({} as never);
  vi.mocked(checkDisposableEmailStrict).mockResolvedValue({ blocked: false });
});

describe("authenticateWithPassword", () => {
  test("returns the app auth user when Supabase accepts the credentials", async () => {
    signInWithPassword.mockResolvedValue({
      data: {
        user: {
          id: "user-id",
          email: "student@example.com",
          user_metadata: {
            full_name: "Student Seller",
            role: "seller",
          },
        },
      },
      error: null,
    });

    await expect(
      authenticateWithPassword("student@example.com", "password")
    ).resolves.toEqual({
      id: "user-id",
      email: "student@example.com",
      name: "Student Seller",
      role: "seller",
    });
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "student@example.com",
      password: "password",
    });
  });

  test("rejects a blocklisted email before sending credentials to Supabase", async () => {
    vi.mocked(checkDisposableEmailStrict).mockResolvedValue({ blocked: true });

    await expect(
      authenticateWithPassword("returning@hutdot.com", "password")
    ).rejects.toMatchObject({
      code: "LOGIN_FAILED",
      status: 401,
      message: "The email or password you entered is incorrect.",
    });

    expect(checkDisposableEmailStrict).toHaveBeenCalledWith(
      "returning@hutdot.com",
      expect.anything()
    );
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  test("does not authenticate when strict blocklist verification is unavailable", async () => {
    vi.mocked(checkDisposableEmailStrict).mockRejectedValue(
      new Error("blocklist unavailable")
    );

    await expect(
      authenticateWithPassword("student@example.com", "password")
    ).rejects.toMatchObject({
      code: "LOGIN_FAILED",
      status: 503,
      message: "Login is temporarily unavailable. Please try again later.",
    });

    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  test("maps invalid credentials to a typed login error", async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: {
        message: "Invalid login credentials",
        status: 400,
      },
    });

    await expect(
      authenticateWithPassword("student@example.com", "wrong")
    ).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
      status: 401,
    });
  });

  test("maps unconfirmed email to a typed login error", async () => {
    signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: {
        message: "Email not confirmed",
        status: 400,
      },
    });

    await expect(
      authenticateWithPassword("student@example.com", "password")
    ).rejects.toMatchObject({
      code: "UNCONFIRMED_EMAIL",
      status: 403,
    });
  });

  test("rejects blank credentials before calling Supabase", async () => {
    await expect(authenticateWithPassword("", "")).rejects.toBeInstanceOf(
      AuthLoginError
    );
    expect(signInWithPassword).not.toHaveBeenCalled();
  });
});
