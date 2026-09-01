import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  createAdminClient: vi.fn(),
  notifyTradeEvent: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));
vi.mock("@/app/lib/notifications", () => ({
  notifyTradeEvent: mocks.notifyTradeEvent,
}));

import { PATCH } from "./route";

function chain<T>(result: T) {
  const query = {
    select: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.update.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.in.mockReturnValue(query);
  return query;
}

describe("seller accepted request cancellation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "seller-1" } });
    mocks.notifyTradeEvent.mockResolvedValue({
      notificationId: "notification-1",
      emailSent: true,
      emailError: null,
    });
  });

  test("restores reserved inventory when an accepted trade does not complete", async () => {
    const product = {
      product_id: "product-1",
      seller_id: "seller-1",
      name: "Desk lamp",
      price: 20,
      image_url: null,
      quantity: 0,
      status: "pending",
    };
    const acceptedRequest = {
      request_id: "request-1",
      product_id: "product-1",
      buyer_id: "buyer-1",
      quantity: 2,
      note: null,
      status: "accepted",
      created_at: "2026-08-10T12:00:00.000Z",
    };
    const cancelledRequest = { ...acceptedRequest, status: "cancelled" };
    const restoredProduct = { ...product, quantity: 2, status: "available" };

    const sellerProductsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [product], error: null }),
    };
    const lookupQuery = chain({ data: acceptedRequest, error: null });
    const requestUpdateQuery = chain({ data: cancelledRequest, error: null });
    const productUpdateQuery = chain({ data: restoredProduct, error: null });
    const from = vi
      .fn()
      .mockReturnValueOnce(sellerProductsQuery)
      .mockReturnValueOnce(lookupQuery)
      .mockReturnValueOnce(productUpdateQuery)
      .mockReturnValueOnce(requestUpdateQuery);

    mocks.createAdminClient.mockReturnValue({
      from,
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({
            data: { user: { email: "buyer@example.edu" } },
            error: null,
          }),
        },
      },
    });

    const response = await PATCH(
      new Request("https://osutrade.com/api/seller/requests", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestId: "request-1",
          status: "cancelled",
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(productUpdateQuery.update.mock.invocationCallOrder[0]).toBeLessThan(
      requestUpdateQuery.update.mock.invocationCallOrder[0]
    );
    expect(requestUpdateQuery.eq).toHaveBeenCalledWith("status", "accepted");
    expect(productUpdateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        quantity: 2,
        status: "available",
      })
    );
    expect(productUpdateQuery.eq).toHaveBeenCalledWith("quantity", 0);
    expect(productUpdateQuery.in).toHaveBeenCalledWith("status", [
      "available",
      "pending",
    ]);
    expect(mocks.notifyTradeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          type: "request_cancelled_by_seller",
          recipientId: "buyer-1",
        }),
        recipientEmail: "buyer@example.edu",
      })
    );
    expect(payload.request.status).toBe("cancelled");
  });

  test("restores the product when closing the accepted request conflicts", async () => {
    const product = {
      product_id: "product-1",
      seller_id: "seller-1",
      name: "Desk lamp",
      price: 20,
      image_url: null,
      quantity: 0,
      status: "pending",
    };
    const acceptedRequest = {
      request_id: "request-1",
      product_id: "product-1",
      buyer_id: "buyer-1",
      quantity: 1,
      note: null,
      status: "accepted",
      created_at: "2026-08-10T12:00:00.000Z",
    };
    const sellerProductsQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [product], error: null }),
    };
    const lookupQuery = chain({ data: acceptedRequest, error: null });
    const restoredProduct = { ...product, quantity: 1, status: "available" };
    const productUpdateQuery = chain({ data: restoredProduct, error: null });
    const requestUpdateQuery = chain({ data: null, error: null });
    const compensationQuery = chain({ data: product, error: null });
    const from = vi
      .fn()
      .mockReturnValueOnce(sellerProductsQuery)
      .mockReturnValueOnce(lookupQuery)
      .mockReturnValueOnce(productUpdateQuery)
      .mockReturnValueOnce(requestUpdateQuery)
      .mockReturnValueOnce(compensationQuery);

    mocks.createAdminClient.mockReturnValue({ from });

    const response = await PATCH(
      new Request("https://osutrade.com/api/seller/requests", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestId: "request-1",
          status: "cancelled",
        }),
      })
    );

    expect(response.status).toBe(409);
    expect(compensationQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 0, status: "pending" })
    );
    expect(compensationQuery.eq).toHaveBeenCalledWith("quantity", 1);
    expect(compensationQuery.eq).toHaveBeenCalledWith("status", "available");
    expect(mocks.notifyTradeEvent).not.toHaveBeenCalled();
  });
});

describe("atomic seller request actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "seller-1" } });
    mocks.notifyTradeEvent.mockResolvedValue({
      notificationId: "notification-1",
      emailSent: true,
      emailError: null,
    });
  });

  test("completes an accepted request through the transactional RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        request: {
          request_id: "request-1",
          product_id: "product-1",
          buyer_id: "buyer-1",
          quantity: 1,
          note: null,
          status: "completed",
          created_at: "2026-08-10T12:00:00.000Z",
        },
        product: {
          product_id: "product-1",
          seller_id: "seller-1",
          name: "Desk lamp",
          price: 20,
          image_url: null,
          quantity: 0,
          status: "pending",
        },
      },
      error: null,
    });
    mocks.createAdminClient.mockReturnValue({
      rpc,
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({
            data: { user: { email: "buyer@example.edu" } },
            error: null,
          }),
        },
      },
    });

    const response = await PATCH(
      new Request("https://osutrade.com/api/seller/requests", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId: "request-1", action: "complete" }),
      })
    );
    const payload = await response.json();

    expect(rpc).toHaveBeenCalledWith(
      "transition_seller_trade_request",
      expect.objectContaining({
        p_request_id: "request-1",
        p_seller_id: "seller-1",
        p_action: "complete",
        p_now: expect.any(String),
      })
    );
    expect(response.status).toBe(200);
    expect(payload.request.status).toBe("completed");
    expect(mocks.notifyTradeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({ type: "request_completed" }),
      })
    );
  });

  test("maps an invalid atomic transition to a conflict", async () => {
    mocks.createAdminClient.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "INVALID_TRANSITION" },
      }),
    });

    const response = await PATCH(
      new Request("https://osutrade.com/api/seller/requests", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId: "request-1", action: "complete" }),
      })
    );

    expect(response.status).toBe(409);
    expect(mocks.notifyTradeEvent).not.toHaveBeenCalled();
  });
});
