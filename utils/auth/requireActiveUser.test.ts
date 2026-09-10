import { beforeEach, describe, expect, test, vi } from "vitest";
import { auth } from "@/auth";
import { checkDisposableEmail } from "@/utils/auth/disposableEmail";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  AccountAccessError,
  requireActiveUser,
} from "./requireActiveUser";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));
vi.mock("@/utils/auth/disposableEmail", () => ({
  checkDisposableEmail: vi.fn(),
}));

const session = {
  user: {
    id: "session-user-id",
    email: "stale-session@example.com",
    name: "Student",
  },
  expires: "2026-10-01T00:00:00.000Z",
};

const authoritativeUser = {
  id: "session-user-id",
  email: "student@oregonstate.edu",
  banned_until: null,
};

function mockAuthUser({
  user = authoritativeUser,
  error = null,
}: {
  user?: typeof authoritativeUser | null;
  error?: { message: string } | null;
} = {}) {
  const admin = {
    auth: {
      admin: {
        getUserById: vi.fn().mockResolvedValue({ data: { user }, error }),
      },
    },
  };

  vi.mocked(createAdminClient).mockReturnValue(admin as never);
  return admin;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue(session as never);
  vi.mocked(checkDisposableEmail).mockResolvedValue({ blocked: false });
});

describe("requireActiveUser", () => {
  test("rejects a missing session as unauthorized", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    await expect(requireActiveUser()).rejects.toMatchObject({
      name: "AccountAccessError",
      status: 401,
      code: "UNAUTHENTICATED",
    } satisfies Partial<AccountAccessError>);

    expect(createAdminClient).not.toHaveBeenCalled();
  });

  test("rejects an account with a future authoritative ban", async () => {
    const admin = mockAuthUser({
      user: {
        ...authoritativeUser,
        banned_until: "2099-01-01T00:00:00.000Z",
      },
    });

    await expect(requireActiveUser()).rejects.toMatchObject({
      name: "AccountAccessError",
      status: 403,
      code: "ACCOUNT_BANNED",
    } satisfies Partial<AccountAccessError>);

    expect(admin.auth.admin.getUserById).toHaveBeenCalledWith("session-user-id");
    expect(checkDisposableEmail).not.toHaveBeenCalled();
  });

  test("rejects an account whose authoritative email is blocklisted", async () => {
    const admin = mockAuthUser();
    vi.mocked(checkDisposableEmail).mockResolvedValue({ blocked: true });

    await expect(requireActiveUser()).rejects.toMatchObject({
      name: "AccountAccessError",
      status: 403,
      code: "EMAIL_BLOCKED",
    } satisfies Partial<AccountAccessError>);

    expect(checkDisposableEmail).toHaveBeenCalledWith(
      "student@oregonstate.edu",
      admin
    );
  });

  test("allows an account whose authoritative ban has expired", async () => {
    mockAuthUser({
      user: {
        ...authoritativeUser,
        banned_until: "2020-01-01T00:00:00.000Z",
      },
    });

    await expect(requireActiveUser()).resolves.toBe(session);
  });

  test("allows an account with no authoritative ban", async () => {
    mockAuthUser();

    await expect(requireActiveUser()).resolves.toBe(session);
  });

  test("rejects an unavailable authoritative Auth lookup", async () => {
    mockAuthUser({ error: { message: "Supabase unavailable" } });

    await expect(requireActiveUser()).rejects.toMatchObject({
      name: "AccountAccessError",
      status: 503,
      code: "AUTH_LOOKUP_UNAVAILABLE",
    } satisfies Partial<AccountAccessError>);

    expect(checkDisposableEmail).not.toHaveBeenCalled();
  });
});
