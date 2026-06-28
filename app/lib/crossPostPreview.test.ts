import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { crossPostPlatforms } from "./crossPostCopy";
import {
  generateCrossPostPreview,
  parseCrossPostPreviewItems,
} from "./crossPostPreview";

const originalApiKey = process.env.OPENAI_API_KEY;

const items = [
  {
    clientId: "manual-1",
    name: "Desk Lamp",
    description: "Warm LED light",
    price: 18,
    quantity: 1,
    category: "home",
  },
];

const validAiHeadings = crossPostPlatforms.map((platform) => ({
  platform,
  title:
    platform === "line"
      ? "校園好物"
      : platform === "wechat"
        ? "校园好物"
        : "Campus items",
  introduction:
    platform === "line"
      ? "商品即將上架。"
      : platform === "wechat"
        ? "商品即将上架。"
        : "These items will be listed soon.",
}));

const validAiPayload = {
  localizedItems: [
    {
      clientId: "manual-1",
      enName: "Desk Lamp",
      enDescription: "Warm LED light",
      zhTwName: "書桌燈",
      zhTwDescription: "暖色 LED 燈",
      zhCnName: "台灯",
      zhCnDescription: "暖色 LED 灯",
    },
  ],
  copies: validAiHeadings,
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

describe("cross-post preview", () => {
  test("normalizes valid items and rejects duplicate ids or invalid facts", () => {
    expect(
      parseCrossPostPreviewItems([
        {
          ...items[0],
          clientId: " manual-1 ",
          name: " Desk Lamp ",
          description: " Warm LED light ",
          category: " home ",
        },
      ])
    ).toEqual({ ok: true, items });

    expect(parseCrossPostPreviewItems([...items, items[0]])).toMatchObject({
      ok: false,
    });
    expect(
      parseCrossPostPreviewItems([{ ...items[0], price: 0 }])
    ).toMatchObject({ ok: false });
    expect(
      parseCrossPostPreviewItems([{ ...items[0], quantity: 1.5 }])
    ).toMatchObject({ ok: false });
  });

  test("uses one AI response for localized facts and five platform headings", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        ({
        ok: true,
        json: async () => ({ output_text: JSON.stringify(validAiPayload) }),
        }) as Response
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateCrossPostPreview(items);

    expect(result.source).toBe("ai");
    expect(result.copies).toHaveLength(5);
    expect(result.copies.find((copy) => copy.platform === "line")?.body).toContain(
      "書桌燈"
    );
    expect(
      result.copies.find((copy) => copy.platform === "wechat")?.body
    ).toContain("台灯");
    expect(JSON.stringify(result)).not.toContain("/product/");

    const requestBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(requestBody.text.format).toMatchObject({
      type: "json_schema",
      name: "cross_post_preview",
      strict: true,
    });
  });

  test("never sends structured contact fields or client product urls to AI", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        ({
        ok: true,
        json: async () => ({ output_text: JSON.stringify(validAiPayload) }),
        }) as Response
    );
    vi.stubGlobal("fetch", fetchMock);

    await generateCrossPostPreview([
      {
        ...items[0],
        contactPhone: "541-555-0101",
        contactLineId: "private-line",
        contactWechatId: "private-wechat",
        productUrl: "https://attacker.example/product/1",
      } as (typeof items)[number],
    ]);

    const serializedRequest = String(fetchMock.mock.calls[0]?.[1]?.body);
    expect(serializedRequest).not.toContain("541-555-0101");
    expect(serializedRequest).not.toContain("private-line");
    expect(serializedRequest).not.toContain("private-wechat");
    expect(serializedRequest).not.toContain("attacker.example");
  });

  test("falls back as one complete set when AI item ids are incomplete", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        ({
          ok: true,
          json: async () => ({
            output_text: JSON.stringify({
              localizedItems: [],
              copies: validAiHeadings,
            }),
          }),
        }) as Response
      )
    );

    const result = await generateCrossPostPreview(items);

    expect(result.source).toBe("fallback");
    expect(result.copies).toHaveLength(5);
    expect(result.copies.every((copy) => !copy.body.includes("/product/"))).toBe(
      true
    );
  });
});
