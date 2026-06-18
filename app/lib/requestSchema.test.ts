import { describe, expect, it } from "vitest";
import {
  isMissingPriceAtRequestError,
  stripPriceAtRequest,
} from "./requestSchema";

describe("request schema compatibility", () => {
  it("detects Supabase schema-cache errors for missing request price snapshots", () => {
    expect(
      isMissingPriceAtRequestError({
        code: "PGRST204",
        message:
          "Could not find the 'price_at_request' column of 'trade_requests' in the schema cache",
      })
    ).toBe(true);
  });

  it("detects Postgres missing-column errors for request price snapshots", () => {
    expect(
      isMissingPriceAtRequestError({
        code: "42703",
        message: 'column "price_at_request" does not exist',
      })
    ).toBe(true);
  });

  it("does not treat unrelated Supabase errors as missing request price snapshots", () => {
    expect(
      isMissingPriceAtRequestError({
        code: "23505",
        message: "duplicate key value violates unique constraint",
      })
    ).toBe(false);
  });

  it("removes the price snapshot field while preserving request insert values", () => {
    expect(
      stripPriceAtRequest({
        product_id: "item-1",
        buyer_id: "buyer-1",
        quantity: 1,
        note: "Can meet on campus",
        price_at_request: 30,
        status: "sent",
      })
    ).toEqual({
      product_id: "item-1",
      buyer_id: "buyer-1",
      quantity: 1,
      note: "Can meet on campus",
      status: "sent",
    });
  });
});
