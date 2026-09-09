import { describe, expect, test } from "vitest";
import {
  getTradeMessageAccess,
  getUnreadCountByRequest,
  isTradeMessagesEnabled,
  loadTradeMessageAccess,
  loadTradeMessageUnreadCounts,
} from "./tradeMessages";

const buyerId = "11111111-1111-4111-8111-111111111111";
const sellerId = "22222222-2222-4222-8222-222222222222";

describe("isTradeMessagesEnabled", () => {
  test("enables chat only for an explicit true flag", () => {
    expect(isTradeMessagesEnabled({ TRADE_MESSAGES_ENABLED: "true" })).toBe(true);
    expect(isTradeMessagesEnabled({ TRADE_MESSAGES_ENABLED: "TRUE" })).toBe(false);
    expect(isTradeMessagesEnabled({})).toBe(false);
  });
});

describe("getTradeMessageAccess", () => {
  const acceptedRequest = {
    requestId: "33333333-3333-4333-8333-333333333333",
    buyerId,
    status: "accepted",
    acceptedAt: "2026-09-08T12:00:00.000Z",
  };

  test("allows both participants after the request is accepted", () => {
    expect(
      getTradeMessageAccess({ request: acceptedRequest, sellerId, userId: buyerId })
    ).toMatchObject({ allowed: true, role: "buyer", otherParticipantId: sellerId });
    expect(
      getTradeMessageAccess({ request: acceptedRequest, sellerId, userId: sellerId })
    ).toMatchObject({ allowed: true, role: "seller", otherParticipantId: buyerId });
  });

  test("rejects a nonparticipant", () => {
    expect(
      getTradeMessageAccess({
        request: acceptedRequest,
        sellerId,
        userId: "44444444-4444-4444-8444-444444444444",
      })
    ).toMatchObject({ allowed: false, reason: "not_participant" });
  });

  test("rejects a request whose listing no longer has a seller", () => {
    expect(
      getTradeMessageAccess({
        request: acceptedRequest,
        sellerId: null,
        userId: buyerId,
      })
    ).toMatchObject({ allowed: false, reason: "not_participant" });
  });

  test("rejects a request that was never accepted", () => {
    expect(
      getTradeMessageAccess({
        request: { ...acceptedRequest, status: "sent", acceptedAt: null },
        sellerId,
        userId: buyerId,
      })
    ).toMatchObject({ allowed: false, reason: "not_accepted" });
  });

  test("keeps an accepted conversation available after completion or cancellation", () => {
    for (const status of ["completed", "cancelled"]) {
      expect(
        getTradeMessageAccess({
          request: { ...acceptedRequest, status },
          sellerId,
          userId: buyerId,
        })
      ).toMatchObject({ allowed: true, role: "buyer" });
    }
  });
});

describe("getUnreadCountByRequest", () => {
  test("counts only newer messages sent by the other participant", () => {
    const counts = getUnreadCountByRequest({
      userId: buyerId,
      messages: [
        { requestId: "request-1", senderId: sellerId, createdAt: "2026-09-08T12:01:00.000Z" },
        { requestId: "request-1", senderId: sellerId, createdAt: "2026-09-08T12:03:00.000Z" },
        { requestId: "request-1", senderId: buyerId, createdAt: "2026-09-08T12:04:00.000Z" },
        { requestId: "request-2", senderId: sellerId, createdAt: "2026-09-08T12:04:00.000Z" },
      ],
      readAtByRequest: new Map([["request-1", "2026-09-08T12:02:00.000Z"]]),
    });

    expect(counts).toEqual(new Map([["request-1", 1], ["request-2", 1]]));
  });
});

describe("loadTradeMessageAccess", () => {
  test("loads the request and verifies the buyer against the product seller", async () => {
    const requestQuery = {
      select: () => requestQuery,
      eq: () => requestQuery,
      maybeSingle: async () => ({
        data: {
          request_id: "33333333-3333-4333-8333-333333333333",
          product_id: "product-1",
          buyer_id: buyerId,
          status: "accepted",
          accepted_at: "2026-09-08T12:00:00.000Z",
        },
        error: null,
      }),
    };
    const productQuery = {
      select: () => productQuery,
      eq: () => productQuery,
      maybeSingle: async () => ({ data: { seller_id: sellerId }, error: null }),
    };
    const from = (table: string) =>
      table === "trade_requests" ? requestQuery : productQuery;

    const result = await loadTradeMessageAccess({
      supabase: { from },
      requestId: "33333333-3333-4333-8333-333333333333",
      userId: buyerId,
    });

    expect(result).toMatchObject({
      allowed: true,
      role: "buyer",
      otherParticipantId: sellerId,
      request: { requestId: "33333333-3333-4333-8333-333333333333" },
    });
  });
});

describe("loadTradeMessageUnreadCounts", () => {
  test("uses the batch count function once for the visible request IDs", async () => {
    const rpc = async (name: string, args: Record<string, unknown>) => {
      expect(name).toBe("get_trade_message_unread_counts");
      expect(args).toEqual({
        p_request_ids: ["request-1", "request-2"],
        p_user_id: buyerId,
      });
      return {
        data: [
          { request_id: "request-1", unread_count: 2 },
          { request_id: "request-2", unread_count: "1" },
        ],
        error: null,
      };
    };

    await expect(
      loadTradeMessageUnreadCounts({
        supabase: { rpc },
        requestIds: ["request-1", "request-2"],
        userId: buyerId,
      })
    ).resolves.toEqual(new Map([["request-1", 2], ["request-2", 1]]));
  });
});
