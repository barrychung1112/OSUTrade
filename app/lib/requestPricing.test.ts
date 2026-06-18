import { describe, expect, test } from "vitest";
import {
  getRequestPriceChange,
  shouldNotifyRequestPriceChange,
} from "./requestPricing";

const now = new Date("2026-06-17T12:00:00.000Z").getTime();

describe("request price change notifications", () => {
  test("notifies active sent requests when current price differs from request price", () => {
    const change = getRequestPriceChange(
      {
        status: "sent",
        created_at: "2026-06-17T11:00:00.000Z",
        price_at_request: 20,
      },
      25,
      now
    );

    expect(change).toEqual({
      changed: true,
      priceAtRequest: 20,
      currentPrice: 25,
    });
    expect(shouldNotifyRequestPriceChange(change)).toBe(true);
  });

  test("does not notify accepted requests because they are treated as completed trades", () => {
    const change = getRequestPriceChange(
      {
        status: "accepted",
        created_at: "2026-06-17T11:00:00.000Z",
        price_at_request: 20,
      },
      25,
      now
    );

    expect(change.changed).toBe(false);
    expect(shouldNotifyRequestPriceChange(change)).toBe(false);
  });

  test("does not notify expired sent requests", () => {
    const change = getRequestPriceChange(
      {
        status: "sent",
        created_at: "2026-06-14T11:00:00.000Z",
        price_at_request: 20,
      },
      25,
      now
    );

    expect(change.changed).toBe(false);
  });
});
