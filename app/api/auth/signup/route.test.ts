import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  checkDisposableEmail: vi.fn(),
  createAdminClient: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("@/utils/auth/disposableEmail", () => ({
  checkDisposableEmail: mocks.checkDisposableEmail,
}));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));
vi.mock("@/utils/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import { POST } from "./route";

function signupRequest(email: string) {
  return new NextRequest("https://osutrade.example/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password: "password123",
      username: "new-user",
    }),
  });
}

function usernameLookup() {
  const query = {
    select: vi.fn(),
    ilike: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  query.select.mockReturnValue(query);
  query.ilike.mockReturnValue(query);
  return query;
}

describe("signup disposable email protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a blocked domain before username lookup or Auth signup", async () => {
    const signUp = vi.fn();
    const from = vi.fn();
    mocks.createClient.mockResolvedValue({ auth: { signUp } });
    mocks.createAdminClient.mockReturnValue({ from });
    mocks.checkDisposableEmail.mockResolvedValue({ blocked: true });

    const response = await POST(signupRequest("user@hutdot.com"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      errorCode: "DISPOSABLE_EMAIL_NOT_ALLOWED",
      message: "Please use an email address that you can access long term.",
    });
    expect(from).not.toHaveBeenCalled();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("continues the existing signup flow for an allowed domain", async () => {
    const lookup = usernameLookup();
    const signUp = vi.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    });
    mocks.createClient.mockResolvedValue({ auth: { signUp } });
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue(lookup),
    });
    mocks.checkDisposableEmail.mockResolvedValue({ blocked: false });

    const response = await POST(signupRequest("student@oregonstate.edu"));

    expect(response.status).toBe(202);
    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: "student@oregonstate.edu" })
    );
  });
});
