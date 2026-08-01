import { describe, expect, test } from "vitest";
import { buildSellerProductUpdate } from "./sellerProductUpdate";

describe("seller product edits", () => {
  test("builds update values for editable product fields", () => {
    const result = buildSellerProductUpdate(
      {
        status: "available",
        quantity: 3,
      },
      {
        name: "Desk lamp",
        description: "Warm light, works well",
        price: 18.5,
        discountPercent: 20,
        category: "home",
        quantity: 4,
        contactPhone: "541-555-0101",
        contactLineId: "seller-line",
        contactWechatId: "seller-wechat",
      },
      "2026-06-17T12:00:00.000Z"
    );

    expect(result).toEqual({
      ok: true,
      values: {
        name: "Desk lamp",
        description: "Warm light, works well",
        price: 18.5,
        discount_percent: 20,
        category: "home",
        quantity: 4,
        contact_phone: "541-555-0101",
        contact_line_id: "seller-line",
        contact_wechat_id: "seller-wechat",
        updated_at: "2026-06-17T12:00:00.000Z",
      },
    });
  });

  test("rejects price and quantity edits for sold products", () => {
    const result = buildSellerProductUpdate(
      {
        status: "sold",
        quantity: 0,
      },
      {
        price: 10,
        quantity: 1,
      },
      "2026-06-17T12:00:00.000Z"
    );

    expect(result).toEqual({
      ok: false,
      message: "Sold listings cannot change price or quantity.",
    });
  });

  test("rejects unsupported discounts", () => {
    const result = buildSellerProductUpdate(
      { status: "available", quantity: 1 },
      { discountPercent: 15 }
    );

    expect(result).toEqual({ ok: false, message: "Choose a valid discount." });
  });
});
