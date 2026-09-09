import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

import { GET } from "./route";

const originalTradeMessagesEnabled = process.env.TRADE_MESSAGES_ENABLED;

function query<T>(result: T) {
  const value = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
  };
  value.select.mockReturnValue(value);
  value.eq.mockReturnValue(value);
  value.in.mockReturnValue(value);
  value.order.mockResolvedValue(result);
  return value;
}

describe("GET /api/requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TRADE_MESSAGES_ENABLED = "true";
    mocks.auth.mockResolvedValue({ user: { id: "buyer-1" } });
  });

  afterEach(() => {
    if (originalTradeMessagesEnabled === undefined) {
      delete process.env.TRADE_MESSAGES_ENABLED;
    } else {
      process.env.TRADE_MESSAGES_ENABLED = originalTradeMessagesEnabled;
    }
  });

  test("adds chat eligibility and batch unread counts only when chat is enabled", async () => {
    const requestQuery = query({
      data: [
        {
          request_id: "request-1",
          product_id: "product-1",
          buyer_id: "buyer-1",
          quantity: 1,
          note: null,
          status: "accepted",
          accepted_at: "2026-09-09T12:00:00.000Z",
          created_at: "2026-09-09T11:00:00.000Z",
          price_at_request: 20,
        },
      ],
      error: null,
    });
    const productsQuery = query({
      data: [
        {
          product_id: "product-1",
          seller_id: "seller-1",
          name: "Desk lamp",
          price: 20,
          image_url: null,
          quantity: 1,
        },
      ],
      error: null,
    });
    productsQuery.in.mockResolvedValue({
      data: [
        {
          product_id: "product-1",
          seller_id: "seller-1",
          name: "Desk lamp",
          price: 20,
          image_url: null,
          quantity: 1,
        },
      ],
      error: null,
    });
    const from = vi
      .fn()
      .mockReturnValueOnce(requestQuery)
      .mockReturnValueOnce(productsQuery);
    const rpc = vi.fn().mockResolvedValue({
      data: [{ request_id: "request-1", unread_count: 2 }],
      error: null,
    });

    mocks.createAdminClient.mockReturnValue({
      from,
      rpc,
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({
            data: { user: { email: "seller@example.edu" } },
            error: null,
          }),
        },
      },
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("get_trade_message_unread_counts", {
      p_request_ids: ["request-1"],
      p_user_id: "buyer-1",
    });
    expect(payload.data[0]).toMatchObject({
      id: "request-1",
      canMessage: true,
      messageUnreadCount: 2,
    });
  });
});
