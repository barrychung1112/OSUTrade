import { describe, expect, test } from "vitest";
import {
  hasActiveTradeRequest,
  hasEditableProductFields,
} from "./productEditLock";

const now = Date.parse("2026-08-03T12:00:00.000Z");

describe("seller product edit lock", () => {
  test("locks products with sent or accepted requests", () => {
    expect(
      hasActiveTradeRequest(
        [{ status: "sent", created_at: "2026-08-03T10:00:00.000Z" }],
        now
      )
    ).toBe(true);
    expect(
      hasActiveTradeRequest(
        [{ status: "accepted", created_at: "2026-07-01T10:00:00.000Z" }],
        now
      )
    ).toBe(true);
  });

  test("does not lock expired sent or closed requests", () => {
    expect(
      hasActiveTradeRequest(
        [{ status: "sent", created_at: "2026-07-31T10:00:00.000Z" }],
        now
      )
    ).toBe(false);
    expect(
      hasActiveTradeRequest(
        [
          { status: "declined", created_at: "2026-08-03T10:00:00.000Z" },
          { status: "cancelled", created_at: "2026-08-03T10:00:00.000Z" },
        ],
        now
      )
    ).toBe(false);
  });

  test("distinguishes product edits from status-only updates", () => {
    expect(hasEditableProductFields({ discountPercent: 20 })).toBe(true);
    expect(hasEditableProductFields({ name: "Desk" })).toBe(true);
    expect(hasEditableProductFields({ status: "sold" })).toBe(false);
  });
});
