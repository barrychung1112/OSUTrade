import { describe, expect, test, vi } from "vitest";
import {
  buildTradeNotification,
  getActivePriceChangeRecipients,
  notifyTradeEvent,
  type TradeNotificationInput,
} from "./notifications";

const baseInput: TradeNotificationInput = {
  type: "request_created",
  recipientId: "seller-1",
  actorId: "buyer-1",
  request: {
    id: "request-1",
    quantity: 2,
    note: "Can meet near the library.",
    priceAtRequest: 35,
  },
  product: {
    id: "product-1",
    name: "Desk lamp",
    price: 35,
  },
};

describe("trade notifications", () => {
  test("builds a seller notification when a buyer sends a request", () => {
    const notification = buildTradeNotification(baseInput);

    expect(notification).toMatchObject({
      type: "request_created",
      recipientId: "seller-1",
      actorId: "buyer-1",
      title: "New request for Desk lamp",
      actionHref: "/seller",
      requestId: "request-1",
      productId: "product-1",
    });
    expect(notification.body).toContain("2");
    expect(notification.emailSubject).toContain("[OSUTrade] New request");
    expect(notification.payload).toMatchObject({
      productName: "Desk lamp",
      quantity: 2,
      priceAtRequest: 35,
    });
  });

  test("builds clear seller email copy for new requests", () => {
    const notification = buildTradeNotification(baseInput);

    expect(notification.emailSubject).toBe("[OSUTrade] New request for Desk lamp");
    expect(notification.emailText).toContain(
      "You received a new buyer request on OSUTrade."
    );
    expect(notification.emailText).toContain("Item: Desk lamp");
    expect(notification.emailText).toContain("Quantity: 2");
    expect(notification.emailText).toContain(
      "Buyer note: Can meet near the library."
    );
    expect(notification.emailText).toContain(
      "Next step: Open your Seller Dashboard to accept or decline this request."
    );
    expect(notification.emailText).toContain("https://osutrade.com/seller");
  });

  test("builds clear buyer email copy for accepted requests", () => {
    const notification = buildTradeNotification({
      ...baseInput,
      type: "request_accepted",
    });

    expect(notification.emailSubject).toBe(
      "[OSUTrade] Your request was accepted: Desk lamp"
    );
    expect(notification.emailText).toContain(
      "Good news. The seller accepted your request."
    );
    expect(notification.emailText).toContain("Item: Desk lamp");
    expect(notification.emailText).toContain("Quantity: 2");
    expect(notification.emailText).toContain(
      "Next step: Open My Requests to view contact details and arrange pickup."
    );
    expect(notification.emailText).toContain("https://osutrade.com/requests");
  });

  test("tells the buyer when the seller closes an incomplete trade", () => {
    const notification = buildTradeNotification({
      ...baseInput,
      type: "request_cancelled_by_seller",
      recipientId: "buyer-1",
      actorId: "seller-1",
    });

    expect(notification).toMatchObject({
      type: "request_cancelled_by_seller",
      recipientId: "buyer-1",
      title: "Trade did not complete for Desk lamp",
      actionHref: "/requests",
    });
    expect(notification.emailSubject).toBe(
      "[OSUTrade] Trade did not complete: Desk lamp"
    );
    expect(notification.emailText).toContain(
      "The seller marked this trade as not completed."
    );
    expect(notification.emailText).toContain(
      "The reserved quantity has been returned to the marketplace."
    );
  });

  test("records email errors without failing the trade flow", async () => {
    const insert = vi.fn().mockResolvedValue({
      data: { notification_id: "notification-1" },
      error: null,
    });
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const from = vi.fn((table: string) => {
      if (table === "notifications") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: insert,
            }),
          }),
          update,
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });
    const sendEmail = vi.fn().mockRejectedValue(new Error("provider down"));

    await expect(
      notifyTradeEvent({
        supabase: { from },
        input: baseInput,
        recipientEmail: "seller@example.edu",
        sendEmail,
      })
    ).resolves.toEqual({
      notificationId: "notification-1",
      emailSent: false,
      emailError: "provider down",
    });

    expect(update).toHaveBeenCalledWith({
      email_error: "provider down",
    });
  });

  test("selects only active sent requests for price change notifications", () => {
    const now = new Date("2026-06-18T12:00:00.000Z");
    const rows = [
      {
        request_id: "active",
        buyer_id: "buyer-1",
        status: "sent",
        created_at: "2026-06-18T11:00:00.000Z",
        price_at_request: 25,
      },
      {
        request_id: "accepted",
        buyer_id: "buyer-2",
        status: "accepted",
        created_at: "2026-06-18T11:00:00.000Z",
        price_at_request: 25,
      },
      {
        request_id: "expired",
        buyer_id: "buyer-3",
        status: "sent",
        created_at: "2026-06-15T11:00:00.000Z",
        price_at_request: 25,
      },
      {
        request_id: "same-price",
        buyer_id: "buyer-4",
        status: "sent",
        created_at: "2026-06-18T11:00:00.000Z",
        price_at_request: 30,
      },
    ];

    expect(getActivePriceChangeRecipients(rows, 30, now)).toEqual([
      {
        requestId: "active",
        buyerId: "buyer-1",
        oldPrice: 25,
        newPrice: 30,
      },
    ]);
  });
});
