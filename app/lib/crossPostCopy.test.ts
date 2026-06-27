import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  buildFallbackCrossPostCopies,
  generateCrossPostCopies,
  platformLanguage,
  type CrossPostListing,
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

const secondProduct = {
  id: "product-2",
  name: "Desk Lamp",
  description: "Warm LED light.",
  nameTranslations: {
    en: "Desk Lamp",
    zhTw: "書桌燈",
    zhCn: "书桌灯",
  },
  descriptionTranslations: {
    en: "Warm LED light.",
    zhTw: "暖色 LED 燈光。",
    zhCn: "暖色 LED 灯光。",
  },
  price: 18,
  category: "home",
  quantity: 2,
  imageUrl: "https://example.com/lamp.jpg",
  sellerContact: {
    phone: "541-555-0199",
    lineId: "second-line",
    wechatId: "second-wechat",
  },
};

const listings: CrossPostListing[] = [
  {
    product,
    productUrl: "https://osutrade.example/product/product-1",
  },
  {
    product: secondProduct,
    productUrl: "https://osutrade.example/product/product-2",
  },
];

const aiCopies = [
  {
    platform: "facebook",
    title: "Campus Moving Sale",
    introduction: "Two useful items ready for a new home.",
  },
  {
    platform: "craigslist",
    title: "Campus Moving Sale",
    introduction: "Two campus items available now.",
  },
  {
    platform: "line",
    title: "校園搬家出清",
    introduction: "兩件實用物品一起出售。",
  },
  {
    platform: "wechat",
    title: "校园搬家出清",
    introduction: "两件实用物品一起出售。",
  },
  {
    platform: "discord",
    title: "Campus Moving Sale",
    introduction: "Two items available near campus.",
  },
];

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

  test("builds ordered localized item blocks with every listing URL and no contacts", () => {
    const copies = buildFallbackCrossPostCopies(listings);

    expect(copies).toHaveLength(5);
    for (const copy of copies) {
      expect(copy.body).toContain(listings[0].productUrl);
      expect(copy.body).toContain(listings[1].productUrl);
      expect(copy.body.indexOf(listings[0].productUrl)).toBeLessThan(
        copy.body.indexOf(listings[1].productUrl)
      );
      expect(copy.body).not.toContain("541-555-0101");
      expect(copy.body).not.toContain("seller-line");
      expect(copy.body).not.toContain("seller-wechat");
    }

    expect(copies.find((copy) => copy.platform === "line")?.body).toContain(
      "分類：電子產品"
    );
    expect(copies.find((copy) => copy.platform === "line")?.body).toContain(
      "書桌燈"
    );
    expect(copies.find((copy) => copy.platform === "wechat")?.body).toContain(
      "分类：家居"
    );
    expect(copies.find((copy) => copy.platform === "wechat")?.body).toContain(
      "书桌灯"
    );
  });

  test("uses AI only for titles and introductions while preserving deterministic item blocks", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        ({
          ok: true,
          json: async () => ({
            output_text: JSON.stringify({ copies: aiCopies }),
          }),
        }) as Response
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateCrossPostCopies(listings);

    expect(result.source).toBe("ai");
    expect(result.copies.find((copy) => copy.platform === "facebook")).toMatchObject({
      language: "en",
      title: "Campus Moving Sale",
    });
    expect(result.copies.find((copy) => copy.platform === "facebook")?.body).toContain(
      "Two useful items ready for a new home."
    );
    for (const copy of result.copies) {
      expect(copy.body).toContain(listings[0].productUrl);
      expect(copy.body).toContain(listings[1].productUrl);
    }

    const requestBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    const serializedRequest = JSON.stringify(requestBody);
    expect(requestBody.text.format).toMatchObject({
      type: "json_schema",
      name: "cross_post_copies",
      strict: true,
    });
    expect(requestBody.text.format.schema.properties.copies.items.required).toEqual([
      "platform",
      "title",
      "introduction",
    ]);
    expect(serializedRequest).not.toContain("sellerContact");
    expect(serializedRequest).not.toContain("seller-line");
    expect(serializedRequest).not.toContain("seller-wechat");
    expect(serializedRequest).not.toContain("541-555-0101");
  });

  test("falls back for every platform when AI output is incomplete", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          output_text: JSON.stringify({ copies: aiCopies.slice(0, 4) }),
        }),
      }))
    );

    const result = await generateCrossPostCopies(listings);

    expect(result.source).toBe("fallback");
    expect(result.copies.find((copy) => copy.platform === "facebook")?.title).not.toBe(
      "Campus Moving Sale"
    );
  });

  test("falls back to deterministic batch copy when AI generation fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({}),
      }))
    );

    const result = await generateCrossPostCopies(listings);

    expect(result.source).toBe("fallback");
    expect(result.copies.find((copy) => copy.platform === "facebook")?.body).toContain(
      "Good condition. Pickup near campus."
    );
    expect(result.copies.find((copy) => copy.platform === "facebook")?.body).toContain(
      "Warm LED light."
    );
  });
});
