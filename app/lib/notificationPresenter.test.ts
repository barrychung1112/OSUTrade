import { describe, expect, test } from "vitest";
import { getUnreadCount, toNotification } from "./notificationPresenter";

describe("notification presenter", () => {
  test("serializes notification rows for the client", () => {
    expect(
      toNotification({
        notification_id: "notification-1",
        type: "request_created",
        title: "New request",
        body: "A buyer sent a request.",
        request_id: "request-1",
        product_id: "product-1",
        payload: { actionHref: "/seller" },
        read_at: null,
        created_at: "2026-06-18T12:00:00.000Z",
      })
    ).toEqual({
      id: "notification-1",
      type: "request_created",
      title: "New request",
      body: "A buyer sent a request.",
      requestId: "request-1",
      productId: "product-1",
      actionHref: "/seller",
      payload: { actionHref: "/seller" },
      readAt: null,
      createdAt: "2026-06-18T12:00:00.000Z",
    });
  });

  test("counts unread notifications", () => {
    expect(
      getUnreadCount([
        { read_at: null },
        { read_at: "2026-06-18T12:00:00.000Z" },
        { read_at: null },
      ])
    ).toBe(2);
  });
});
