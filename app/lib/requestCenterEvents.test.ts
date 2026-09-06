import { describe, expect, it } from "vitest";
import {
  getActionableRequestEvent,
  shouldAutoOpenRequestCenter,
} from "./requestCenterEvents";

describe("request center events", () => {
  it("routes incoming and buyer status notifications to the right audience", () => {
    expect(
      getActionableRequestEvent({
        id: "notification-1",
        type: "request_created",
        requestId: "request-1",
        readAt: null,
      })
    ).toEqual({
      notificationId: "notification-1",
      requestId: "request-1",
      audience: "seller",
    });

    expect(
      getActionableRequestEvent({
        id: "notification-2",
        type: "request_accepted",
        requestId: "request-2",
        readAt: null,
      })
    ).toEqual({
      notificationId: "notification-2",
      requestId: "request-2",
      audience: "buyer",
    });
  });

  it("ignores read, informational, and request-less notifications", () => {
    expect(
      getActionableRequestEvent({
        id: "notification-1",
        type: "price_changed",
        requestId: "request-1",
        readAt: null,
      })
    ).toBeNull();
    expect(
      getActionableRequestEvent({
        id: "notification-2",
        type: "request_created",
        requestId: null,
        readAt: null,
      })
    ).toBeNull();
    expect(
      getActionableRequestEvent({
        id: "notification-3",
        type: "request_created",
        requestId: "request-3",
        readAt: "2026-08-31T12:00:00Z",
      })
    ).toBeNull();
  });

  it("opens only unseen events when the UI is not blocked", () => {
    expect(
      shouldAutoOpenRequestCenter({ alreadyShown: false, blockingUi: false })
    ).toBe(true);
    expect(
      shouldAutoOpenRequestCenter({ alreadyShown: true, blockingUi: false })
    ).toBe(false);
    expect(
      shouldAutoOpenRequestCenter({ alreadyShown: false, blockingUi: true })
    ).toBe(false);
  });
});
