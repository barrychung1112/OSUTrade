import { describe, expect, test } from "vitest";
import {
  buildWantedRequestEmail,
  findWantedRequestMatches,
  normalizeWantedRequestInput,
} from "./wantedRequests";

const product = {
  product_id: "product-1",
  name: "Acer Computer Monitor",
  name_en: "Acer Computer Monitor",
  name_zh_tw: "電腦螢幕",
  name_zh_cn: "电脑显示器",
  description: "24 inch display with HDMI cable",
  description_en: "24 inch display with HDMI cable",
  description_zh_tw: "24 吋螢幕，附 HDMI 線",
  description_zh_cn: "24 寸显示器，附 HDMI 线",
  price: 30,
  category: "electronics",
};

describe("wanted request matching", () => {
  test("matches products by keyword across translated names and descriptions", () => {
    const matches = findWantedRequestMatches(product, [
      {
        wanted_request_id: "wanted-1",
        user_id: "buyer-1",
        query: "螢幕",
        max_price: 40,
        category: "electronics",
        description: null,
        email_subscribed: true,
        status: "active",
      },
    ]);

    expect(matches).toEqual([
      expect.objectContaining({
        wantedRequestId: "wanted-1",
        userId: "buyer-1",
        score: expect.any(Number),
      }),
    ]);
    expect(matches[0]?.score).toBeGreaterThanOrEqual(2);
  });

  test("does not match inactive, unsubscribed, over-budget, or wrong-category requests", () => {
    const matches = findWantedRequestMatches(product, [
      {
        wanted_request_id: "paused",
        user_id: "buyer-1",
        query: "monitor",
        max_price: 40,
        category: "electronics",
        description: null,
        email_subscribed: true,
        status: "paused",
      },
      {
        wanted_request_id: "unsubscribed",
        user_id: "buyer-2",
        query: "monitor",
        max_price: 40,
        category: "electronics",
        description: null,
        email_subscribed: false,
        status: "active",
      },
      {
        wanted_request_id: "budget",
        user_id: "buyer-3",
        query: "monitor",
        max_price: 20,
        category: "electronics",
        description: null,
        email_subscribed: true,
        status: "active",
      },
      {
        wanted_request_id: "category",
        user_id: "buyer-4",
        query: "monitor",
        max_price: 40,
        category: "books",
        description: null,
        email_subscribed: true,
        status: "active",
      },
    ]);

    expect(matches).toEqual([]);
  });

  test("normalizes form input for API persistence", () => {
    expect(
      normalizeWantedRequestInput({
        query: "  mini fridge  ",
        maxPrice: "85",
        category: " home ",
        description: " Need it before move-in ",
        emailSubscribed: false,
      })
    ).toEqual({
      ok: true,
      values: {
        query: "mini fridge",
        max_price: 85,
        category: "home",
        description: "Need it before move-in",
        email_subscribed: false,
      },
    });
  });

  test("rejects empty query and invalid budgets", () => {
    expect(normalizeWantedRequestInput({ query: "" })).toEqual({
      ok: false,
      message: "Wanted item is required.",
    });
    expect(
      normalizeWantedRequestInput({ query: "bike", maxPrice: "-1" })
    ).toEqual({
      ok: false,
      message: "Budget must be greater than 0.",
    });
  });
});

describe("wanted request email", () => {
  test("builds clear email copy for a matching product", () => {
    const email = buildWantedRequestEmail({
      wantedQuery: "monitor under $40",
      productName: "Acer Computer Monitor",
      productPrice: 30,
      productUrl: "https://osutrade.com/product/product-1",
    });

    expect(email.subject).toBe(
      "[OSUTrade] New listing matches your wanted item: Acer Computer Monitor"
    );
    expect(email.text).toContain("Wanted item: monitor under $40");
    expect(email.text).toContain("Matched listing: Acer Computer Monitor");
    expect(email.text).toContain("Price: $30.00");
    expect(email.text).toContain("https://osutrade.com/product/product-1");
  });
});
