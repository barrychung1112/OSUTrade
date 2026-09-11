import { describe, expect, test } from "vitest";

import { isPublicProduct, localizedProduct } from "./publicProduct";

describe("public product eligibility", () => {
  test("accepts only available rows with positive quantity", () => {
    expect(isPublicProduct({ status: "available", quantity: 1 })).toBe(true);
    expect(isPublicProduct({ status: "sold", quantity: 1 })).toBe(false);
    expect(isPublicProduct({ status: "available", quantity: 0 })).toBe(false);
    expect(isPublicProduct({ status: "removed", quantity: 3 })).toBe(false);
  });

  test("uses the requested translations with the base text as fallback", () => {
    const product = {
      name: "Desk",
      description: "A study desk",
      nameTranslations: { en: "Desk", zhTw: "書桌", zhCn: "书桌" },
      descriptionTranslations: {
        en: "A study desk",
        zhTw: "一張書桌",
        zhCn: "一张书桌",
      },
    };

    expect(localizedProduct(product, "zh-tw")).toEqual({
      name: "書桌",
      description: "一張書桌",
    });
    expect(
      localizedProduct(
        { ...product, nameTranslations: { en: "Desk", zhTw: "", zhCn: "书桌" } },
        "zh-tw"
      ).name
    ).toBe("Desk");
  });
});
