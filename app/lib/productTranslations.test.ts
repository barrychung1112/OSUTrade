import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { translateProductName } from "./productTranslations";

const originalApiKey = process.env.OPENAI_API_KEY;

beforeEach(() => {
  process.env.OPENAI_API_KEY = "test-key";
});

afterEach(() => {
  process.env.OPENAI_API_KEY = originalApiKey;
  vi.unstubAllGlobals();
});

test("translateProductName requests structured translations", async () => {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => ({
    ok: true,
    json: async () => ({
      output: [
        {
          content: [
            {
              type: "output_text",
              text: JSON.stringify({
                en: "Acer monitor",
                zhTw: "Acer 螢幕",
                zhCn: "Acer 显示器",
              }),
            },
          ],
        },
      ],
    }),
  } as Response));
  vi.stubGlobal("fetch", fetchMock);

  const result = await translateProductName("Acer 螢幕");

  expect(result).toEqual({
    en: "Acer monitor",
    zhTw: "Acer 螢幕",
    zhCn: "Acer 显示器",
  });
  const requestBody = fetchMock.mock.calls[0]?.[1]?.body;
  expect(typeof requestBody).toBe("string");
  const body = JSON.parse(requestBody as string);
  expect(body.text.format).toMatchObject({
    type: "json_schema",
    name: "product_name_translations",
    strict: true,
  });
  expect(body.text.format.schema.required).toEqual(["en", "zhTw", "zhCn"]);
});

test("translateProductName falls back to the original name when translation fails", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: false,
      json: async () => ({}),
    }))
  );

  await expect(translateProductName("Desk")).resolves.toEqual({
    en: "Desk",
    zhTw: "Desk",
    zhCn: "Desk",
  });
});
