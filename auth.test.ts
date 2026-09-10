import { describe, expect, test, vi } from "vitest";
import { AuthLoginError } from "@/utils/auth/passwordLogin";

const authenticateWithPassword = vi.hoisted(() => vi.fn());
const nextAuth = vi.hoisted(() =>
  vi.fn(() => ({
    auth: vi.fn(),
    handlers: { GET: vi.fn(), POST: vi.fn() },
  }))
);
const credentialsProvider = vi.hoisted(() => vi.fn((config) => config));
const CredentialsSignin = vi.hoisted(
  () =>
    class CredentialsSignin extends Error {
      code = "credentials";
    }
);

vi.mock("next-auth", () => ({
  default: nextAuth,
  CredentialsSignin,
}));
vi.mock("next-auth/providers/credentials", () => ({
  default: credentialsProvider,
}));
vi.mock("next-auth/providers/google", () => ({
  default: vi.fn((config) => config),
}));
vi.mock("@/utils/auth/passwordLogin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/utils/auth/passwordLogin")>()),
  authenticateWithPassword,
}));

await import("./auth");

function getLoginAuthorize() {
  const loginProvider = credentialsProvider.mock.calls
    .map(([config]) => config)
    .find((config) => config.id === "login");

  if (!loginProvider) {
    throw new Error("Login Credentials provider was not configured.");
  }

  return loginProvider.authorize as (credentials: {
    email: string;
    password: string;
  }) => Promise<unknown>;
}

describe("Credentials login provider", () => {
  test("propagates a safe unavailable code when strict blocklist verification fails", async () => {
    authenticateWithPassword.mockRejectedValue(
      new AuthLoginError(
        "LOGIN_FAILED",
        "Login is temporarily unavailable. Please try again later.",
        503
      )
    );

    await expect(
      getLoginAuthorize()({
        email: "student@osu.edu",
        password: "password",
      })
    ).rejects.toMatchObject({
      code: "login_unavailable",
    });

    expect(authenticateWithPassword).toHaveBeenCalledWith(
      "student@osu.edu",
      "password"
    );
  });

  test("keeps a blocklisted-domain rejection indistinguishable from invalid credentials", async () => {
    authenticateWithPassword.mockRejectedValue(
      new AuthLoginError(
        "LOGIN_FAILED",
        "The email or password you entered is incorrect.",
        401
      )
    );

    await expect(
      getLoginAuthorize()({
        email: "returning@hutdot.com",
        password: "password",
      })
    ).resolves.toBeNull();
  });
});
