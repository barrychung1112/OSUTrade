import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPublicProduct: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));
vi.mock("next/image", () => ({
  default: ({ fill: _fill, unoptimized: _unoptimized, priority: _priority, ...props }: Record<string, unknown>) => (
    <img {...props} />
  ),
}));
vi.mock("@radix-ui/themes", () => ({
  Theme: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/app/components/Header", () => ({ default: () => <header>Header</header> }));
vi.mock("@/app/lib/publicProduct", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/lib/publicProduct")>()),
  getPublicProduct: mocks.getPublicProduct,
}));
vi.mock("./ProductRequestActions", () => ({
  default: () => <button>Add to request cart</button>,
}));

import LocalizedProductPage from "./page";

const product = {
  id: "p-1",
  name: "Desk",
  description: "A study desk",
  nameTranslations: { en: "Desk", zhTw: "書桌", zhCn: "书桌" },
  descriptionTranslations: { en: "A study desk", zhTw: "一張書桌", zhCn: "一张书桌" },
  price: 25,
  category: "home",
  imageUrl: "https://example.com/desk.jpg",
  imageUrls: ["https://example.com/desk.jpg"],
  status: "available",
  quantity: 1,
};

describe("localized product page", () => {
  test("renders the localized product name in initial HTML", async () => {
    mocks.getPublicProduct.mockResolvedValue(product);

    const page = await LocalizedProductPage({
      params: Promise.resolve({ locale: "zh-tw", id: "p-1" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("<h1");
    expect(html).toContain("書桌");
    expect(html).toContain("一張書桌");
  });
});
