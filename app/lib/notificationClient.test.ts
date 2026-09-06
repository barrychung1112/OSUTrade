import { describe, expect, test } from "vitest";
import { getNewActionableRequestEvent, getUnreadIncrease } from "./notificationClient";

describe("notification client state", () => {
  test("detects newly unread notifications after the first load", () => {
    expect(getUnreadIncrease(null, 3)).toBe(0);
    expect(getUnreadIncrease(1, 3)).toBe(2);
    expect(getUnreadIncrease(3, 1)).toBe(0);
  });
});

describe("request notification polling", () => {
  const notifications = [
    {
      id: "new-request",
      type: "request_created",
      requestId: "request-1",
      readAt: null,
    },
    {
      id: "price-only",
      type: "price_changed",
      requestId: "request-2",
      readAt: null,
    },
  ];

  test("does not open old notifications on the initial load", () => {
    expect(getNewActionableRequestEvent(null, notifications)).toBeNull();
  });

  test("returns only a newly observed actionable request event", () => {
    expect(
      getNewActionableRequestEvent(new Set(["price-only"]), notifications)
    ).toEqual({
      notificationId: "new-request",
      requestId: "request-1",
      audience: "seller",
    });
    expect(
      getNewActionableRequestEvent(
        new Set(["new-request", "price-only"]),
        notifications
      )
    ).toBeNull();
  });
});
