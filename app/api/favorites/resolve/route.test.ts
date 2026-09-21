import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@/utils/supabase/server", () => ({ createClient: mocks.createClient }));

import { POST } from "./route";

function request(productIds: unknown[]) {
  return new Request("https://osutrade.com/api/favorites/resolve", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ productIds }),
  });
}

describe("favorite resolver API", () => {
  beforeEach(() => vi.clearAllMocks());

  test("resolves only public in-stock products in supplied favorite order", async () => {
    const query = {
      select: vi.fn(),
      in: vi.fn(),
      eq: vi.fn(),
      gt: vi.fn().mockResolvedValue({
        data: [
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
        ],
        error: null,
      }),
    };
    query.select.mockReturnValue(query);
    query.in.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    mocks.createClient.mockResolvedValue({ from: vi.fn().mockReturnValue(query) });

    const response = await POST(request(["sold-1", "lamp-1"]));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.map((product: { id: string }) => product.id)).toEqual(["lamp-1"]);
    expect(query.eq).toHaveBeenCalledWith("status", "available");
    expect(query.gt).toHaveBeenCalledWith("quantity", 0);
  });
});
