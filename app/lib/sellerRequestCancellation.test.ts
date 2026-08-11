import { describe, expect, test } from "vitest";
import { buildAcceptedRequestCancellation } from "./sellerRequestCancellation";

describe("accepted request cancellation", () => {
  test("restores reserved inventory and makes a pending listing available", () => {
    expect(
      buildAcceptedRequestCancellation({
        requestStatus: "accepted",
        productStatus: "pending",
        currentQuantity: 0,
        requestQuantity: 2,
      })
    ).toEqual({
      ok: true,
      quantity: 2,
      status: "available",
    });
  });

  test("adds reserved inventory to units that remained available", () => {
    expect(
      buildAcceptedRequestCancellation({
        requestStatus: "accepted",
        productStatus: "available",
        currentQuantity: 3,
        requestQuantity: 1,
      })
    ).toEqual({
      ok: true,
      quantity: 4,
      status: "available",
    });
  });

  test("rejects repeated or invalid request transitions", () => {
    expect(
      buildAcceptedRequestCancellation({
        requestStatus: "cancelled",
        productStatus: "available",
        currentQuantity: 1,
        requestQuantity: 1,
      })
    ).toEqual({
      ok: false,
      message: "Only accepted requests can be restored.",
    });
  });

  test.each(["sold", "removed"])(
    "does not reopen a %s listing",
    (productStatus) => {
      expect(
        buildAcceptedRequestCancellation({
          requestStatus: "accepted",
          productStatus,
          currentQuantity: 0,
          requestQuantity: 1,
        })
      ).toEqual({
        ok: false,
        message: "Sold or removed listings cannot be restored automatically.",
      });
    }
  );
});
