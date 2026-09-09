import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  createAdminClient: vi.fn(),
  notifyTradeEvent: vi.fn(),
  isTradeMessagesEnabled: vi.fn(),
  loadTradeMessageAccess: vi.fn(),
  loadTradeMessageUnreadCounts: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));
vi.mock("@/app/lib/notifications", () => ({
  notifyTradeEvent: mocks.notifyTradeEvent,
}));
vi.mock("@/app/lib/tradeMessages", () => ({
  isTradeMessagesEnabled: mocks.isTradeMessagesEnabled,
  loadTradeMessageAccess: mocks.loadTradeMessageAccess,
  loadTradeMessageUnreadCounts: mocks.loadTradeMessageUnreadCounts,
}));

import { GET, POST } from "./route";

const requestId = "33333333-3333-4333-8333-333333333333";
const clientMessageId = "44444444-4444-4444-8444-444444444444";

const context = { params: Promise.resolve({ requestId }) };

function messageQuery(result: unknown) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    limit: vi.fn(),
    order: vi.fn(),
    insert: vi.fn(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.gte.mockReturnValue(query);
  query.limit.mockResolvedValue(result);
  query.order.mockResolvedValue(result);
  query.maybeSingle.mockResolvedValue(result);
  query.insert.mockReturnValue(query);
  query.single.mockResolvedValue(result);
  return query;
}

describe("trade message API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "buyer-1" } });
    mocks.isTradeMessagesEnabled.mockReturnValue(true);
    mocks.loadTradeMessageAccess.mockResolvedValue({
      allowed: true,
      role: "buyer",
      otherParticipantId: "seller-1",
      request: {
        requestId,
        buyerId: "buyer-1",
        productId: "product-1",
        quantity: 1,
        note: null,
        status: "accepted",
        acceptedAt: "2026-09-09T12:00:00.000Z",
      },
      product: {
        id: "product-1",
        sellerId: "seller-1",
        name: "Desk lamp",
        price: 20,
      },
    });
  });

  test("requires login before reading messages", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await GET(
      new Request(`https://osutrade.com/api/requests/${requestId}/messages`),
      context
    );

    expect(response.status).toBe(401);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  test("writes a new message once and creates an in-app-only alert", async () => {
    const duplicateQuery = messageQuery({ data: null, error: null });
    const rateLimitQuery = messageQuery({ data: [], error: null });
    const insertQuery = messageQuery({
      data: {
        message_id: "message-1",
        request_id: requestId,
        sender_id: "buyer-1",
        body: "Can you meet near the library?",
        client_message_id: clientMessageId,
        created_at: "2026-09-09T12:30:00.000Z",
      },
      error: null,
    });
    const from = vi
      .fn()
      .mockReturnValueOnce(duplicateQuery)
      .mockReturnValueOnce(rateLimitQuery)
      .mockReturnValueOnce(insertQuery);
    mocks.createAdminClient.mockReturnValue({ from });

    const response = await POST(
      new Request(`https://osutrade.com/api/requests/${requestId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          body: "Can you meet near the library?",
          clientMessageId,
        }),
      }),
      context
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.data).toMatchObject({
      id: "message-1",
      body: "Can you meet near the library?",
      senderId: "buyer-1",
    });
    expect(insertQuery.insert).toHaveBeenCalledWith({
      request_id: requestId,
      sender_id: "buyer-1",
      body: "Can you meet near the library?",
      client_message_id: clientMessageId,
    });
    expect(mocks.notifyTradeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          type: "trade_message_received",
          recipientId: "seller-1",
          messageRecipientAudience: "seller",
        }),
        recipientEmail: undefined,
      })
    );
  });

  test("rejects an unaccepted request before it queries messages", async () => {
    mocks.loadTradeMessageAccess.mockResolvedValue({
      allowed: false,
      reason: "not_accepted",
    });

    const response = await POST(
      new Request(`https://osutrade.com/api/requests/${requestId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: "Hello", clientMessageId }),
      }),
      context
    );

    expect(response.status).toBe(403);
    expect(mocks.createAdminClient).toHaveBeenCalledTimes(1);
  });

  test("does not insert or notify when a client retries an existing message", async () => {
    const duplicateQuery = messageQuery({
      data: {
        message_id: "message-1",
        request_id: requestId,
        sender_id: "buyer-1",
        body: "Can you meet near the library?",
        client_message_id: clientMessageId,
        created_at: "2026-09-09T12:30:00.000Z",
      },
      error: null,
    });
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => duplicateQuery) });

    const response = await POST(
      new Request(`https://osutrade.com/api/requests/${requestId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          body: "Can you meet near the library?",
          clientMessageId,
        }),
      }),
      context
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.idempotent).toBe(true);
    expect(duplicateQuery.insert).not.toHaveBeenCalled();
    expect(mocks.notifyTradeEvent).not.toHaveBeenCalled();
  });

  test("rejects malformed message data before it queries the database", async () => {
    const response = await POST(
      new Request(`https://osutrade.com/api/requests/${requestId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: " ", clientMessageId: "not-a-uuid" }),
      }),
      context
    );

    expect(response.status).toBe(400);
  });

  test("limits each participant to ten messages per request per minute", async () => {
    const duplicateQuery = messageQuery({ data: null, error: null });
    const rateLimitQuery = messageQuery({
      data: Array.from({ length: 10 }, (_, index) => ({ message_id: `message-${index}` })),
      error: null,
    });
    const from = vi
      .fn()
      .mockReturnValueOnce(duplicateQuery)
      .mockReturnValueOnce(rateLimitQuery);
    mocks.createAdminClient.mockReturnValue({ from });

    const response = await POST(
      new Request(`https://osutrade.com/api/requests/${requestId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: "One more message", clientMessageId }),
      }),
      context
    );

    expect(response.status).toBe(429);
    expect(mocks.notifyTradeEvent).not.toHaveBeenCalled();
  });
});
