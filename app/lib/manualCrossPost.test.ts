import { describe, expect, test } from "vitest";
import {
  buildManualCrossPostPreviewItem,
  buildPublishedCrossPostProduct,
  isDirectManualPublishAllowed,
  parseCrossPostPreviewResponse,
} from "./manualCrossPost";

describe("manual cross-post flow helpers", () => {
  test("builds a preview item from listing facts without contact or image data", () => {
    const item = buildManualCrossPostPreviewItem({
      name: " Desk Lamp ",
      description: " Warm LED light ",
      price: "18",
      quantity: "2",
      category: "home",
      imageUrl: "https://example.com/private-photo.jpg",
      contactLineId: "private-line",
    });

    expect(item).toEqual({
      clientId: "manual-1",
      name: "Desk Lamp",
      description: "Warm LED light",
      price: 18,
      quantity: 2,
      category: "home",
    });
    expect(JSON.stringify(item)).not.toContain("private-line");
    expect(JSON.stringify(item)).not.toContain("private-photo");
  });

  test("rejects incomplete manual listing facts before preview", () => {
    expect(() =>
      buildManualCrossPostPreviewItem({
        name: "",
        description: "",
        price: "0",
        quantity: "1",
        category: "general",
      })
    ).toThrow("name and valid price");
  });

  test("accepts only complete five-platform preview responses", () => {
    const copies = ["facebook", "craigslist", "line", "wechat", "discord"].map(
      (platform) => ({
        platform,
        language:
          platform === "line" ? "zhTw" : platform === "wechat" ? "zhCn" : "en",
        title: `${platform} title`,
        body: `${platform} body`,
      })
    );

    expect(parseCrossPostPreviewResponse({ source: "ai", copies })).toEqual({
      source: "ai",
      copies,
    });
    expect(
      parseCrossPostPreviewResponse({ source: "ai", copies: copies.slice(1) })
    ).toBeNull();
  });

  test("builds a canonical published product link", () => {
    expect(
      buildPublishedCrossPostProduct(
        "manual-1",
        { id: "product / 1", name: "Desk Lamp", price: 18 },
        "https://osutrade.example/"
      )
    ).toEqual({
      clientId: "manual-1",
      productId: "product / 1",
      name: "Desk Lamp",
      productUrl: "https://osutrade.example/product/product%20%2F%201",
    });
  });

  test("allows direct form submission only before cross-post preview starts", () => {
    expect(isDirectManualPublishAllowed("idle")).toBe(true);
    expect(isDirectManualPublishAllowed("generating")).toBe(false);
    expect(isDirectManualPublishAllowed("reviewing")).toBe(false);
    expect(isDirectManualPublishAllowed("publishing")).toBe(false);
    expect(isDirectManualPublishAllowed("finalized")).toBe(false);
  });
});
