import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  requireActiveUser: vi.fn(),
  AccountAccessError: class AccountAccessError extends Error {
    constructor(public readonly status: number, message: string) {
      super(message);
    }
  },
}));

vi.mock("@/utils/auth/requireActiveUser", () => ({
  requireActiveUser: mocks.requireActiveUser,
  AccountAccessError: mocks.AccountAccessError,
}));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

import { GET, PATCH } from "./route";

const currentUser = { id: "user-1" };

function request(name: unknown) {
  return new Request("https://osutrade.com/api/account/display-name", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

function createProfileQuery({ existing = null, updated = currentUser }: { existing?: unknown; updated?: unknown } = {}) {
  const duplicateQuery = {
    select: vi.fn(),
    ilike: vi.fn(),
    neq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: existing, error: null }),
  };
  duplicateQuery.select.mockReturnValue(duplicateQuery);
  duplicateQuery.ilike.mockReturnValue(duplicateQuery);
  duplicateQuery.neq.mockReturnValue(duplicateQuery);

  const updateQuery = {
    update: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: updated, error: null }),
  };
  updateQuery.update.mockReturnValue(updateQuery);
  updateQuery.eq.mockReturnValue(updateQuery);
  updateQuery.select.mockReturnValue(updateQuery);

  return { duplicateQuery, updateQuery };
}

describe("display-name API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireActiveUser.mockResolvedValue({ user: currentUser });
  });

  test("requires an active account", async () => {
    mocks.requireActiveUser.mockRejectedValue(
      new mocks.AccountAccessError(401, "You must be logged in.")
    );

    const response = await PATCH(request("Campus Seller"));

    expect(response.status).toBe(401);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  test("returns the canonical public display name for an active account", async () => {
    const profileQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { name: "Canonical Profile Name" },
        error: null,
      }),
    };
    profileQuery.select.mockReturnValue(profileQuery);
    profileQuery.eq.mockReturnValue(profileQuery);
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue(profileQuery),
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: { name: "Canonical Profile Name" },
    });
    expect(profileQuery.eq).toHaveBeenCalledWith("id", "user-1");
  });

  test("rejects invalid display names before reading the database", async () => {
    const response = await PATCH(request("A"));

    expect(response.status).toBe(400);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  test("rejects a case-insensitive name owned by another account", async () => {
    const { duplicateQuery } = createProfileQuery({ existing: { id: "user-2" } });
    mocks.createAdminClient.mockReturnValue({ from: vi.fn().mockReturnValue(duplicateQuery) });

    const response = await PATCH(request("Campus Seller"));

    expect(response.status).toBe(409);
    expect(duplicateQuery.ilike).toHaveBeenCalledWith("name", "Campus Seller");
    expect(duplicateQuery.neq).toHaveBeenCalledWith("id", "user-1");
  });

  test("updates only the active profile and the matching Auth metadata", async () => {
    const { duplicateQuery, updateQuery } = createProfileQuery({
      updated: { id: "user-1", name: "Campus Seller" },
    });
    const from = vi.fn().mockReturnValueOnce(duplicateQuery).mockReturnValueOnce(updateQuery);
    const updateUserById = vi.fn().mockResolvedValue({ error: null });
    mocks.createAdminClient.mockReturnValue({
      from,
      auth: { admin: { updateUserById } },
    });

    const response = await PATCH(request("  Campus   Seller  "));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(updateQuery.eq).toHaveBeenCalledWith("id", "user-1");
    expect(updateUserById).toHaveBeenCalledWith("user-1", {
      user_metadata: { name: "Campus Seller", full_name: "Campus Seller" },
    });
    expect(payload).toEqual({ data: { name: "Campus Seller" } });
  });
});
