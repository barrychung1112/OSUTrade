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

import LocalizedGuidePage, { generateMetadata } from "./page";

describe("localized seasonal guide page", () => {
  test("generates canonical English move-out metadata with localized alternates", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "en", guide: "move-out" }),
    });

    expect(metadata).toMatchObject({
      title: "Move-out guide for Corvallis and Oregon State students | OSUTrade",
      description: expect.stringContaining("move-out guide"),
      alternates: {
        canonical: "/en/guides/move-out",
        languages: {
          en: "/en/guides/move-out",
          "zh-TW": "/zh-tw/guides/move-out",
          "zh-CN": "/zh-cn/guides/move-out",
          "x-default": "/en/guides/move-out",
        },
      },
    });
  });

  test("returns empty metadata for invalid locale or guide segments", async () => {
    await expect(
      generateMetadata({
        params: Promise.resolve({ locale: "fr", guide: "move-in" }),
      })
    ).resolves.toEqual({});
    await expect(
      generateMetadata({
        params: Promise.resolve({ locale: "en", guide: "graduation" }),
      })
    ).resolves.toEqual({});
  });

  test("renders the Traditional Chinese move-in guide into initial HTML", async () => {
    const page = await LocalizedGuidePage({
      params: Promise.resolve({ locale: "zh-tw", guide: "move-in" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Corvallis 入住指南");
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
    expect(html).toContain('application/ld+json');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain('"item":"https://osutrade.com/"');
    expect(html).toContain('href="/"');
    expect(html).toContain('"item":"https://osutrade.com/zh-tw/guides/move-in"');
    expect(html).toContain('href="/overview?category=home"');
    expect(html).toContain('href="/overview"');
    expect(html).toContain('href="/sell"');
    expect(html).toContain('href="/zh-tw/guides/move-out"');
  });

  test("uses notFound for invalid locale and guide segments", async () => {
    await expect(
      LocalizedGuidePage({
        params: Promise.resolve({ locale: "fr", guide: "move-in" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(
      LocalizedGuidePage({
        params: Promise.resolve({ locale: "en", guide: "graduation" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mocks.notFound).toHaveBeenCalledTimes(2);
  });
});
