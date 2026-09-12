import { describe, expect, it } from "vitest";

import {
  DEFAULT_SHARE_DESCRIPTION,
  DEFAULT_SHARE_IMAGE,
  buildLocalizedProductMetadata,
  buildProductMetadata,
} from "./productMetadata";
import type { Product } from "./products";

const product: Product = {
  id: "product-1",
  name: "Computer Monitor",
  description: "A clear 24-inch display for a study desk.",
  price: 30,
  imageUrl: "https://example.com/fallback.jpg",
  imageUrls: [
    "https://example.com/first.jpg",
    "https://example.com/second.jpg",
  ],
};

describe("product sharing metadata", () => {
  it("builds product-specific Open Graph and Twitter metadata", () => {
    expect(buildProductMetadata(product)).toMatchObject({
      title: "Computer Monitor · $30.00 | OSUTrade",
      description: "A clear 24-inch display for a study desk.",
      alternates: { canonical: "/product/product-1" },
      openGraph: {
        title: "Computer Monitor · $30.00 | OSUTrade",
        description: "A clear 24-inch display for a study desk.",
        url: "/product/product-1",
        siteName: "OSUTrade",
        type: "website",
        images: [{ url: "https://example.com/first.jpg" }],
      },
      twitter: {
        card: "summary_large_image",
        images: ["https://example.com/first.jpg"],
      },
    });
  });

  it("formats zero-dollar products as free", () => {
    expect(buildProductMetadata({ ...product, price: 0 }).title).toBe(
      "Computer Monitor · Free | OSUTrade"
    );
  });

  it("normalizes and truncates long descriptions", () => {
    const description = `  ${"Useful study furniture ".repeat(12)}  `;
    const metadata = buildProductMetadata({ ...product, description });

    expect(metadata.description).toBeTypeOf("string");
    expect(String(metadata.description).length).toBeLessThanOrEqual(160);
    expect(metadata.description).not.toMatch(/\s{2,}/);
    expect(metadata.description).toMatch(/…$/);
  });

  it("returns safe OSUTrade defaults without product data", () => {
    expect(buildProductMetadata(null)).toMatchObject({
      title: "OSUTrade | Campus Marketplace",
      description: DEFAULT_SHARE_DESCRIPTION,
      alternates: { canonical: "/" },
      openGraph: {
        url: "/",
        images: [{ url: DEFAULT_SHARE_IMAGE }],
      },
      twitter: {
        images: [DEFAULT_SHARE_IMAGE],
      },
    });
  });

  it("uses the localized URL, content, and reciprocal alternates", () => {
    const metadata = buildLocalizedProductMetadata(
      {
        ...product,
        nameTranslations: { en: "Computer Monitor", zhTw: "電腦螢幕", zhCn: "电脑显示器" },
        descriptionTranslations: {
          en: product.description,
          zhTw: "適合書桌使用的清晰 24 吋螢幕。",
          zhCn: "适合书桌使用的清晰 24 英寸显示器。",
        },
      },
      "zh-tw"
    );

    expect(metadata).toMatchObject({
      title: "電腦螢幕 · $30.00 | OSUTrade",
      description: "適合書桌使用的清晰 24 吋螢幕。",
      alternates: {
        canonical: "/zh-tw/product/product-1",
        languages: {
          en: "/en/product/product-1",
          "zh-TW": "/zh-tw/product/product-1",
          "zh-CN": "/zh-cn/product/product-1",
          "x-default": "/en/product/product-1",
        },
      },
      openGraph: { url: "/zh-tw/product/product-1" },
    });
  });
});
