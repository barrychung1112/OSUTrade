import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@/utils/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import { GET } from "./route";

describe("cart pricing refresh", () => {
  beforeEach(() => vi.clearAllMocks());

  test("refreshes a cookie item to a free clearance price", async () => {
    const query = {
      select: vi.fn(),
      in: vi.fn().mockResolvedValue({
        data: [
          {
            product_id: "desk-1",
            price: 30,
            discount_percent: 20,
            clearance_price: 0,
            effective_price: 0,
            quantity: 1,
            status: "available",
          },
        ],
        error: null,
      }),
    };
    query.select.mockReturnValue(query);
    mocks.createClient.mockResolvedValue({
      from: vi.fn().mockReturnValue(query),
    });

    const cookie = encodeURIComponent(
      JSON.stringify([
        { id: "desk-1", name: "Desk", price: 30, quantity: 1, availableQuantity: 1 },
      ])
    );
    const request = new NextRequest("https://osutrade.example/api/cart", {
      headers: { cookie: `osutrade_cart=${cookie}` },
    });

    const response = await GET(request);
    const payload = await response.json();

    expect(payload.data[0].price).toBe(0);
  });
});
