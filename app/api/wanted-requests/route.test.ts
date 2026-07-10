import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

import { DELETE, GET, PATCH, POST } from "./route";

function request(method: string, body?: Record<string, unknown>, url = "https://osutrade.com/api/wanted-requests") {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function selectQuery(data: unknown[], error = null) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn().mockResolvedValue({ data, error }),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

function mutationQuery(data: unknown, error = null) {
  const query = {
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn().mockResolvedValue({ data, error }),
  };
  query.insert.mockReturnValue(query);
  query.update.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

describe("wanted requests API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "buyer-1" } });
  });

  test("requires login", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  test("lists wanted requests for the current user", async () => {
    const query = selectQuery([
      {
        wanted_request_id: "wanted-1",
        user_id: "buyer-1",
        query: "monitor",
        max_price: 40,
        category: "electronics",
        description: null,
        email_subscribed: true,
        status: "active",
        created_at: "2026-07-09T00:00:00Z",
        updated_at: "2026-07-09T00:00:00Z",
      },
    ]);
    const from = vi.fn().mockReturnValue(query);
    mocks.createAdminClient.mockReturnValue({ from });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toEqual([
      expect.objectContaining({
        id: "wanted-1",
        query: "monitor",
        maxPrice: 40,
        emailSubscribed: true,
        status: "active",
      }),
    ]);
    expect(query.eq).toHaveBeenCalledWith("user_id", "buyer-1");
  });

  test("creates a wanted request", async () => {
    const insert = mutationQuery({
      wanted_request_id: "wanted-1",
      user_id: "buyer-1",
      query: "mini fridge",
      max_price: 85,
      category: "home",
      description: "before move-in",
      email_subscribed: true,
      status: "active",
      created_at: "2026-07-09T00:00:00Z",
      updated_at: "2026-07-09T00:00:00Z",
    });
    const from = vi.fn().mockReturnValue(insert);
    mocks.createAdminClient.mockReturnValue({ from });

    const response = await POST(
      request("POST", {
        query: "mini fridge",
        maxPrice: "85",
        category: "home",
        description: "before move-in",
        emailSubscribed: true,
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(insert.insert).toHaveBeenCalledWith({
      user_id: "buyer-1",
      query: "mini fridge",
      max_price: 85,
      category: "home",
      description: "before move-in",
      email_subscribed: true,
      status: "active",
    });
    expect(payload.data.id).toBe("wanted-1");
  });

  test("updates status and subscription", async () => {
    const update = mutationQuery({
      wanted_request_id: "wanted-1",
      user_id: "buyer-1",
      query: "monitor",
      max_price: 40,
      category: "electronics",
      description: null,
      email_subscribed: false,
      status: "paused",
      created_at: "2026-07-09T00:00:00Z",
      updated_at: "2026-07-09T00:00:00Z",
    });
    const from = vi.fn().mockReturnValue(update);
    mocks.createAdminClient.mockReturnValue({ from });

    const response = await PATCH(
      request("PATCH", {
        id: "wanted-1",
        status: "paused",
        emailSubscribed: false,
      })
    );

    expect(response.status).toBe(200);
    expect(update.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "paused",
        email_subscribed: false,
      })
    );
    expect(update.eq).toHaveBeenNthCalledWith(1, "wanted_request_id", "wanted-1");
    expect(update.eq).toHaveBeenNthCalledWith(2, "user_id", "buyer-1");
  });

  test("soft deletes a wanted request", async () => {
    const update = mutationQuery({
      wanted_request_id: "wanted-1",
      user_id: "buyer-1",
      query: "monitor",
      max_price: 40,
      category: "electronics",
      description: null,
      email_subscribed: true,
      status: "deleted",
      created_at: "2026-07-09T00:00:00Z",
      updated_at: "2026-07-09T00:00:00Z",
    });
    const from = vi.fn().mockReturnValue(update);
    mocks.createAdminClient.mockReturnValue({ from });

    const response = await DELETE(
      request(
        "DELETE",
        undefined,
        "https://osutrade.com/api/wanted-requests?id=wanted-1"
      )
    );

    expect(response.status).toBe(200);
    expect(update.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "deleted" })
    );
  });
});
