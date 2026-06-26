import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  buildFallbackCrossPostCopies,
  generateCrossPostCopies,
  platformLanguage,
} from "./crossPostCopy";

const originalApiKey = process.env.OPENAI_API_KEY;

const product = {
  id: "product-1",
  name: "Dorm Mini Fridge",
  description: "Good condition. Pickup near campus.",
  nameTranslations: {
    en: "Dorm Mini Fridge",
    zhTw: "宿舍小冰箱",
    zhCn: "宿舍小冰箱",
  },
  descriptionTranslations: {
    en: "Good condition. Pickup near campus.",
    zhTw: "狀況良好。可在校園附近取貨。",
    zhCn: "状况良好。可在校园附近取货。",
  },
  price: 95,
  category: "electronics",
  quantity: 1,
  imageUrl: "https://example.com/fridge.jpg",
  sellerContact: {
    phone: "541-555-0101",
    lineId: "seller-line",
    wechatId: "seller-wechat",
  },
};

beforeEach(() => {
  process.env.OPENAI_API_KEY = "test-key";
});

afterEach(() => {
  if (originalApiKey === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = originalApiKey;
  }
  vi.unstubAllGlobals();
});

describe("cross-post copy", () => {
  test("maps each platform to the expected default language", () => {
    expect(platformLanguage).toEqual({
      facebook: "en",
      craigslist: "en",
      line: "zhTw",
      wechat: "zhCn",
      discord: "en",
    });
  });

  test("builds fallback copy with localized listing facts", () => {
    const copies = buildFallbackCrossPostCopies(product, {
      includeContactInfo: true,
      productUrl: "https://osutrade.example/product/product-1",
    });

    expect(copies).toHaveLength(5);
    expect(copies.find((copy) => copy.platform === "facebook")).toMatchObject({
      language: "en",
      title: "Dorm Mini Fridge",
    });
    expect(copies.find((copy) => copy.platform === "line")).toMatchObject({
      language: "zhTw",
      title: "宿舍小冰箱",
    });
    expect(copies.find((copy) => copy.platform === "wechat")).toMatchObject({
      language: "zhCn",
      title: "宿舍小冰箱",
    });
    expect(copies.find((copy) => copy.platform === "line")?.body).toContain(
      "LINE: seller-line"
    );
    expect(copies.find((copy) => copy.platform === "line")?.body).toContain(
      "分類：電子產品"
    );
    expect(copies.find((copy) => copy.platform === "wechat")?.body).toContain(
      "微信: seller-wechat"
    );
    expect(copies.find((copy) => copy.platform === "wechat")?.body).toContain(
      "分类：电子产品"
    );
  });

  test("requests structured AI copy and preserves platform metadata", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => ({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          copies: [
            {
              platform: "facebook",
              title: "Dorm Mini Fridge for Sale",
              body: "Selling a dorm mini fridge for $95.",
            },
            {
              platform: "craigslist",
              title: "Dorm Mini Fridge - $95",
              body: "Item: Dorm Mini Fridge\nPrice: $95",
            },
            {
              platform: "line",
              title: "宿舍小冰箱出售",
              body: "宿舍小冰箱，價格 $95。",
            },
            {
              platform: "wechat",
              title: "宿舍小冰箱出售",
              body: "宿舍小冰箱，价格 $95。",
            },
            {
              platform: "discord",
              title: "Dorm Mini Fridge",
              body: "**Dorm Mini Fridge**\nPrice: $95",
            },
          ],
        }),
      }),
    } as Response));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateCrossPostCopies(product, {
      includeContactInfo: false,
    });

    expect(result.source).toBe("ai");
    expect(result.copies.find((copy) => copy.platform === "wechat")).toMatchObject({
      language: "zhCn",
      body: "宿舍小冰箱，价格 $95。",
    });
    const requestBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(requestBody.text.format).toMatchObject({
      type: "json_schema",
      name: "cross_post_copies",
      strict: true,
    });
    expect(requestBody.input[0].content).toContain("Use only the provided facts");
  });

  test("falls back to deterministic copy when AI generation fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({}),
      }))
    );

    const result = await generateCrossPostCopies(product, {
      includeContactInfo: false,
    });

    expect(result.source).toBe("fallback");
    expect(result.copies.find((copy) => copy.platform === "facebook")?.body).toContain(
      "Good condition. Pickup near campus."
    );
  });
});
