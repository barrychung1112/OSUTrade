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

import { DELETE, GET, POST } from "./route";

function request(method: string, body?: Record<string, unknown>) {
  return new Request("https://osutrade.com/api/favorites", {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function favoriteQuery(data: unknown[] = [], error = null) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn().mockResolvedValue({ data, error }),
    upsert: vi.fn().mockResolvedValue({ error }),
    delete: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.delete.mockReturnValue(query);
  return query;
}

function productQuery(data: unknown[] = [], error = null) {
  const query = {
    select: vi.fn(),
    in: vi.fn(),
    eq: vi.fn(),
    gt: vi.fn().mockResolvedValue({ data, error }),
  };
  query.select.mockReturnValue(query);
  query.in.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

describe("favorites API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireActiveUser.mockResolvedValue({ user: { id: "user-1" } });
  });

  test("requires an active account before reading favorites", async () => {
    mocks.requireActiveUser.mockRejectedValue(
      new mocks.AccountAccessError(401, "You must be logged in.")
    );

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  test("returns only currently available favorites in the saved order", async () => {
    const favorites = favoriteQuery([{ product_id: "desk-1" }, { product_id: "lamp-1" }]);
    const products = productQuery([
      {
        product_id: "lamp-1",
        name: "Lamp",
        price: 12,
        category: "home",
        image_url: null,
        seller_id: "seller-1",
        status: "available",
        quantity: 1,
      },
      {
        product_id: "desk-1",
        name: "Desk",
        price: 30,
        category: "home",
        image_url: null,
        seller_id: "seller-1",
        status: "available",
        quantity: 1,
      },
    ]);
    const from = vi.fn().mockReturnValueOnce(favorites).mockReturnValueOnce(products);
    mocks.createAdminClient.mockReturnValue({ from });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.map((product: { id: string }) => product.id)).toEqual([
      "desk-1",
      "lamp-1",
    ]);
    expect(products.eq).toHaveBeenCalledWith("status", "available");
    expect(products.gt).toHaveBeenCalledWith("quantity", 0);
  });

  test("batch syncs unique local favorites for the active account", async () => {
    const favorites = favoriteQuery();
    mocks.createAdminClient.mockReturnValue({ from: vi.fn().mockReturnValue(favorites) });

    const response = await POST(
      request("POST", { productIds: ["desk-1", "desk-1", " lamp-1 "] })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(favorites.upsert).toHaveBeenCalledWith(
      [
        { user_id: "user-1", product_id: "desk-1" },
        { user_id: "user-1", product_id: "lamp-1" },
      ],
      { onConflict: "user_id,product_id", ignoreDuplicates: true }
    );
    expect(payload.data).toEqual(["desk-1", "lamp-1"]);
  });

  test("removes one favorite only for the active account", async () => {
    const favorites = favoriteQuery();
    mocks.createAdminClient.mockReturnValue({ from: vi.fn().mockReturnValue(favorites) });

    const response = await DELETE(request("DELETE", { productId: "desk-1" }));

    expect(response.status).toBe(200);
    expect(favorites.eq).toHaveBeenNthCalledWith(1, "user_id", "user-1");
    expect(favorites.eq).toHaveBeenNthCalledWith(2, "product_id", "desk-1");
  });
});
