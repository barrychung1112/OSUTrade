import { describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ listPublicProducts: vi.fn() }));

vi.mock("@/app/lib/publicProduct", () => ({
  listPublicProducts: mocks.listPublicProducts,
}));

import sitemap, { dynamic } from "./sitemap";

describe("sitemap", () => {
  test("reads current public inventory at request time", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  test("publishes public discovery and trust URLs before localized product URLs", async () => {
    mocks.listPublicProducts.mockResolvedValue([
      { id: "p-1", status: "available", quantity: 1 },
    ]);

    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toEqual([
      "https://osutrade.com/",
      "https://osutrade.com/overview",
      "https://osutrade.com/privacy",
      "https://osutrade.com/terms",
      "https://osutrade.com/contact",
      "https://osutrade.com/safety",
      "https://osutrade.com/en/product/p-1",
      "https://osutrade.com/zh-tw/product/p-1",
      "https://osutrade.com/zh-cn/product/p-1",
    ]);
    expect(urls).not.toContain("https://osutrade.com/product/p-1");
  });
});
