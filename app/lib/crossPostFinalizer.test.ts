import { describe, expect, test } from "vitest";
import type { CrossPostCopy } from "./crossPostCopy";
import {
  buildManagedLinkSection,
  composeCrossPostClipboardText,
  mergePublishedCrossPostProducts,
} from "./crossPostFinalizer";

const editedCopy: CrossPostCopy = {
  platform: "line",
  language: "zhTw",
  title: "我修改的標題",
  body: "我修改的內文",
};

const product1 = {
  clientId: "a",
  productId: "p-1",
  name: "書桌燈",
  productUrl: "https://osutrade.example/product/p-1",
};

const product2 = {
  clientId: "b",
  productId: "p-2",
  name: "螢幕",
  productUrl: "https://osutrade.example/product/p-2",
};

describe("cross-post finalizer", () => {
  test("preserves user edits and appends managed links at copy time", () => {
    const text = composeCrossPostClipboardText(editedCopy, [product1, product2]);

    expect(text).toContain("我修改的標題\n\n我修改的內文");
    expect(text).toContain("OSUTrade 商品連結");
    expect(text).toContain("https://osutrade.example/product/p-1");
    expect(text).toContain("https://osutrade.example/product/p-2");
  });

test("deduplicates retried products while preserving first success order", () => {
    const merged = mergePublishedCrossPostProducts(
      [product1],
      [product1, product2]
    );
    const section = buildManagedLinkSection("facebook", merged);

    expect(merged).toEqual([product1, product2]);
    expect(section.match(/product\/p-1/g)).toHaveLength(1);
  expect(section.indexOf("p-1")).toBeLessThan(section.indexOf("p-2"));
});

test("keeps only the first successful product for a retried client item", () => {
  const products = mergePublishedCrossPostProducts([product1], [
    {
      ...product1,
      productId: "p-retry",
      productUrl: "https://osutrade.example/product/p-retry",
    },
  ]);

  expect(products).toEqual([product1]);
});

  test("uses platform language for managed link headings", () => {
    expect(buildManagedLinkSection("facebook", [product1])).toContain(
      "OSUTrade listings"
    );
    expect(buildManagedLinkSection("line", [product1])).toContain(
      "OSUTrade 商品連結"
    );
    expect(buildManagedLinkSection("wechat", [product1])).toContain(
      "OSUTrade 商品链接"
    );
  });

  test("does not render an empty managed section before publishing", () => {
    expect(buildManagedLinkSection("wechat", [])).toBe("");
    expect(composeCrossPostClipboardText(editedCopy, [])).toBe(
      "我修改的標題\n\n我修改的內文"
    );
  });
});
