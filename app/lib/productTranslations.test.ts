import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  pickProductDescription,
  translateProductDescription,
  translateProductName,
} from "./productTranslations";

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

test("pickProductDescription returns the locale description with fallbacks", () => {
  const translations = {
    en: "Fishing hook set",
    zhTw: "帶鉤子",
    zhCn: "带钩子",
  };

  expect(pickProductDescription("帶鉤子", translations, "en")).toBe(
    "Fishing hook set"
  );
  expect(pickProductDescription("帶鉤子", translations, "zh")).toBe("帶鉤子");
  expect(pickProductDescription("帶鉤子", translations, "zhCn")).toBe("带钩子");
});

test("translateProductDescription requests structured description translations", async () => {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => ({
    ok: true,
    json: async () => ({
      output: [
        {
          content: [
            {
              type: "output_text",
              text: JSON.stringify({
                en: "Includes fishing hooks.",
                zhTw: "包含釣魚鉤。",
                zhCn: "包含钓鱼钩。",
              }),
            },
          ],
        },
      ],
    }),
  } as Response));
  vi.stubGlobal("fetch", fetchMock);

  const result = await translateProductDescription("帶鉤子");

  expect(result).toEqual({
    en: "Includes fishing hooks.",
    zhTw: "包含釣魚鉤。",
    zhCn: "包含钓鱼钩。",
  });
  const requestBody = fetchMock.mock.calls[0]?.[1]?.body;
  expect(typeof requestBody).toBe("string");
  const body = JSON.parse(requestBody as string);
  expect(body.text.format).toMatchObject({
    type: "json_schema",
    name: "product_description_translations",
    strict: true,
  });
  expect(body.input[0].content).toContain("marketplace item descriptions");
});
