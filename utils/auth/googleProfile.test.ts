import { beforeEach, describe, expect, test, vi } from "vitest";
import { upsertGoogleUserProfile } from "./googleProfile";
import { createAdminClient } from "@/utils/supabase/admin";

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

type MaybeSingleResult = {
  data: Record<string, unknown> | null;
  error: Record<string, unknown> | null;
};

type UpsertResult = {
  error: Record<string, unknown> | null;
};

function createMockAdmin({
  maybeSingleResults,
  upsertResults,
  createUserResult,
  listUsersResults = [],
}: {
  maybeSingleResults: MaybeSingleResult[];
  upsertResults: UpsertResult[];
  createUserResult?: {
    data: Record<string, unknown>;
    error: Record<string, unknown> | null;
  };
  listUsersResults?: Array<{
    data: Record<string, unknown>;
    error: Record<string, unknown> | null;
  }>;
}) {
  const ilikeCalls: Array<{ column: string; pattern: string }> = [];
  const upsertCalls: Array<{ payload: unknown; options: unknown }> = [];

  const admin = {
    auth: {
      admin: {
        createUser: vi.fn(async () => createUserResult),
        listUsers: vi.fn(async () => listUsersResults.shift()),
      },
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        ilike: vi.fn((column: string, pattern: string) => {
          ilikeCalls.push({ column, pattern });
          return {
            maybeSingle: vi.fn(async () => maybeSingleResults.shift()),
          };
        }),
      })),
      upsert: vi.fn(async (payload: unknown, options: unknown) => {
        upsertCalls.push({ payload, options });
        return upsertResults.shift();
      }),
    })),
  };

  vi.mocked(createAdminClient).mockReturnValue(admin as never);

  return {
    admin,
    ilikeCalls,
    upsertCalls,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("upsertGoogleUserProfile", () => {
  test("preserves an existing public user and escapes the email lookup", async () => {
    const { admin, ilikeCalls, upsertCalls } = createMockAdmin({
      maybeSingleResults: [
        {
          data: {
            id: "existing-id",
            email: "Student_%@OSU.edu",
            name: "BuckeyeSeller",
            role: "admin",
          },
          error: null,
        },
      ],
      upsertResults: [{ error: null }],
    });

    const result = await upsertGoogleUserProfile({
      email: "Student_%@OSU.edu",
      name: "Ignored Google Name",
    });

    expect(result).toEqual({
      id: "existing-id",
      email: "student_%@osu.edu",
      name: "BuckeyeSeller",
      role: "admin",
    });
    expect(ilikeCalls[0]).toEqual({
      column: "email",
      pattern: "student\\_\\%@osu.edu",
    });
    expect(admin.auth.admin.createUser).not.toHaveBeenCalled();
    expect(upsertCalls[0].payload).toMatchObject({
      id: "existing-id",
      email: "student_%@osu.edu",
      name: "BuckeyeSeller",
      role: "admin",
    });
  });

  test("creates a first-time Auth user and uses its UUID for the public profile", async () => {
    const authId = "12345678-1234-4234-9234-123456789abc";
    const { admin, upsertCalls } = createMockAdmin({
      maybeSingleResults: [
        { data: null, error: null },
        { data: null, error: null },
      ],
      upsertResults: [{ error: null }],
      createUserResult: {
        data: { user: { id: authId } },
        error: null,
      },
    });

    const result = await upsertGoogleUserProfile({
      email: "NewStudent@osu.edu",
      name: "New Student",
    });

    expect(admin.auth.admin.createUser).toHaveBeenCalledWith({
      email: "newstudent@osu.edu",
      email_confirm: true,
      user_metadata: {
        name: "New Student",
        full_name: "New Student",
        auth_provider: "google",
      },
    });
    expect(admin.auth.admin.listUsers).not.toHaveBeenCalled();
    expect(upsertCalls[0].payload).toMatchObject({
      id: authId,
      email: "newstudent@osu.edu",
      name: "New Student",
      role: "user",
    });
    expect(result.id).toBe(authId);
  });

  test("falls back to guarded listUsers on structured duplicate auth email errors", async () => {
    const authId = "87654321-1234-4234-9234-123456789abc";
    const { admin, upsertCalls } = createMockAdmin({
      maybeSingleResults: [
        { data: null, error: null },
        { data: null, error: null },
      ],
      upsertResults: [{ error: null }],
      createUserResult: {
        data: {},
        error: {
          code: "email_exists",
          status: 422,
          name: "AuthApiError",
          message: "Different provider already owns this email",
        },
      },
      listUsersResults: [
        {
          data: {
            users: [
              { id: "wrong-id", email: "studentx@osu.edu" },
              { id: authId, email: "Student@OSU.edu" },
            ],
            nextPage: null,
          },
          error: null,
        },
      ],
    });

    const result = await upsertGoogleUserProfile({
      email: "student@osu.edu",
      name: "Student",
    });

    expect(admin.auth.admin.listUsers).toHaveBeenCalledWith({
      page: 1,
      perPage: 1000,
    });
    expect(upsertCalls[0].payload).toMatchObject({
      id: authId,
      email: "student@osu.edu",
      name: "Student",
    });
    expect(result.id).toBe(authId);
  });

  test("uses a stable suffix when a display name is already taken", async () => {
    const authId = "abcdef12-1234-4234-9234-123456789abc";
    const { ilikeCalls, upsertCalls } = createMockAdmin({
      maybeSingleResults: [
        { data: null, error: null },
        { data: { id: "other-user" }, error: null },
        { data: null, error: null },
      ],
      upsertResults: [{ error: null }],
      createUserResult: {
        data: { user: { id: authId } },
        error: null,
      },
    });

    const result = await upsertGoogleUserProfile({
      email: "same_name@osu.edu",
      name: "Same_Name%",
    });

    expect(ilikeCalls).toEqual([
      { column: "email", pattern: "same\\_name@osu.edu" },
      { column: "name", pattern: "Same\\_Name\\%" },
      { column: "name", pattern: "Same\\_Name\\%-abcdef12" },
    ]);
    expect(upsertCalls[0].payload).toMatchObject({
      id: authId,
      name: "Same_Name%-abcdef12",
    });
    expect(result.name).toBe("Same_Name%-abcdef12");
  });

  test("retries with a stable suffix when the public upsert hits a duplicate name", async () => {
    const authId = "fedcba98-1234-4234-9234-123456789abc";
    const { upsertCalls } = createMockAdmin({
      maybeSingleResults: [
        { data: null, error: null },
        { data: null, error: null },
      ],
      upsertResults: [
        {
          error: {
            code: "23505",
            message: "duplicate key value violates unique constraint",
            details: "Key (lower(name))=(racer) already exists.",
          },
        },
        { error: null },
      ],
      createUserResult: {
        data: { user: { id: authId } },
        error: null,
      },
    });

    const result = await upsertGoogleUserProfile({
      email: "racer@osu.edu",
      name: "Racer",
    });

    expect(upsertCalls).toHaveLength(2);
    expect(upsertCalls[0].payload).toMatchObject({ name: "Racer" });
    expect(upsertCalls[1].payload).toMatchObject({ name: "Racer-fedcba98" });
    expect(result.name).toBe("Racer-fedcba98");
  });
});
