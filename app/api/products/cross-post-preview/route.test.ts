import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { crossPostPlatforms, platformLanguage } from "@/app/lib/crossPostCopy";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  generateCrossPostPreview: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/app/lib/crossPostPreview", async () => {
  const actual = await vi.importActual<typeof import("@/app/lib/crossPostPreview")>(
    "@/app/lib/crossPostPreview"
  );
  return {
    ...actual,
    generateCrossPostPreview: mocks.generateCrossPostPreview,
  };
});

import { maxDuration, POST } from "./route";
import { CrossPostTranslationError } from "@/app/lib/crossPostPreview";

const validItem = {
  clientId: "manual-1",
  name: "Desk Lamp",
  description: "Warm LED light",
  price: 18,
  quantity: 1,
  category: "home",
};

const fiveCopies = crossPostPlatforms.map((platform) => ({
  platform,
  language: platformLanguage[platform],
  title: `${platform} title`,
  body: `${platform} body`,
}));

function request(body: unknown) {
  return new NextRequest("https://osutrade.example/api/products/cross-post-preview", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("cross-post preview route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.generateCrossPostPreview.mockResolvedValue({
      source: "fallback",
      copies: fiveCopies,
    });
  });

  test("allows the AI request to reach its guarded fallback", () => {
    expect(maxDuration).toBe(60);
  });

  test("requires authentication before generating a preview", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await POST(request({ items: [validItem] }));

    expect(response.status).toBe(401);
    expect(mocks.generateCrossPostPreview).not.toHaveBeenCalled();
  });

  test.each([
    { contactPhone: "541-555-0101" },
    { contactLineId: "private-line" },
    { contactWechatId: "private-wechat" },
    { sellerContact: { phone: "541-555-0101" } },
    { productUrl: "https://attacker.example/product/1" },
  ])("rejects forbidden preview fields: %j", async (forbidden) => {
    mocks.auth.mockResolvedValue({ user: { id: "seller-1" } });

    const response = await POST(
      request({ items: [{ ...validItem, ...forbidden }] })
    );

    expect(response.status).toBe(400);
    expect(mocks.generateCrossPostPreview).not.toHaveBeenCalled();
  });

  test("rejects invalid item collections", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "seller-1" } });

    const empty = await POST(request({ items: [] }));
    const duplicate = await POST(
      request({ items: [validItem, validItem] })
    );
    const oversized = await POST(
      request({
        items: Array.from({ length: 11 }, (_, index) => ({
          ...validItem,
          clientId: `draft-${index}`,
        })),
      })
    );

    expect(empty.status).toBe(400);
    expect(duplicate.status).toBe(400);
    expect(oversized.status).toBe(400);
    expect(mocks.generateCrossPostPreview).not.toHaveBeenCalled();
  });

  test("normalizes items and returns five copies without database work", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "seller-1" } });

    const response = await POST(
      request({
        items: [
          {
            ...validItem,
            clientId: " manual-1 ",
            name: " Desk Lamp ",
            description: " Warm LED light ",
            category: " home ",
          },
        ],
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.generateCrossPostPreview).toHaveBeenCalledWith([validItem]);
    await expect(response.json()).resolves.toEqual({
      source: "fallback",
      copies: fiveCopies,
    });
  });

  test("returns a retryable error when platform translations are incomplete", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "seller-1" } });
    mocks.generateCrossPostPreview.mockRejectedValue(
      new CrossPostTranslationError("Incomplete platform translations.")
    );

    const response = await POST(request({ items: [validItem] }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      code: "CROSS_POST_TRANSLATION_FAILED",
      message:
        "AI could not create complete platform translations. Please try again.",
    });
  });
});
