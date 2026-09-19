import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@radix-ui/themes", () => ({
  Theme: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/app/components/Header", () => ({
  default: () => <header>Header</header>,
}));

import LocalizedGuidesPage, { generateMetadata } from "./page";

describe("localized guides parent page", () => {
  test("renders the Traditional Chinese guide choices with localized links", async () => {
    const page = await LocalizedGuidesPage({
      params: Promise.resolve({ locale: "zh-tw" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('lang="zh-Hant"');
    expect(html).toContain("搬遷指南");
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
    expect(html).toContain('href="/zh-tw/guides/move-in"');
    expect(html).toContain('href="/zh-tw/guides/move-out"');
  });

  test("generates the localized canonical and rejects invalid locales", async () => {
    await expect(
      generateMetadata({ params: Promise.resolve({ locale: "zh-cn" }) })
    ).resolves.toMatchObject({
      alternates: { canonical: "/zh-cn/guides" },
    });

    await expect(
      LocalizedGuidesPage({ params: Promise.resolve({ locale: "fr" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalledTimes(1);
  });
});
