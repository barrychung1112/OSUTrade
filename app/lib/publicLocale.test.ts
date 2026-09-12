import { describe, expect, test } from "vitest";

import {
  localeInfo,
  productPath,
  publicLocaleFromClientLocale,
  publicLocaleFromSegment,
} from "./publicLocale";

describe("public product locales", () => {
  test("maps every locale to one stable product URL", () => {
    expect(productPath("en", "p 1")).toBe("/en/product/p%201");
    expect(productPath("zh-tw", "p-1")).toBe("/zh-tw/product/p-1");
    expect(productPath("zh-cn", "p-1")).toBe("/zh-cn/product/p-1");
  });

  test("rejects unsupported URL segments", () => {
    expect(publicLocaleFromSegment("fr")).toBeNull();
  });

  test("maps document language and hreflang correctly", () => {
    expect(localeInfo("zh-tw")).toEqual({
      documentLang: "zh-Hant",
      hreflang: "zh-TW",
      clientLocale: "zh",
    });
  });

  test("maps the client locale to its public URL segment", () => {
    expect(publicLocaleFromClientLocale("en")).toBe("en");
    expect(publicLocaleFromClientLocale("zh")).toBe("zh-tw");
    expect(publicLocaleFromClientLocale("zhCn")).toBe("zh-cn");
  });
});
