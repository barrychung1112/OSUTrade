import { describe, expect, it } from "vitest";

import { SITE_URL } from "./productMetadata";
import {
  buildGuideMetadata,
  getGuideContent,
  guidePaths,
  homeSeasonalCopy,
} from "./seasonalGuides";

describe("seasonal guides", () => {
  it("keeps localized guide paths in the sitemap order", () => {
    expect(guidePaths).toEqual([
      "/en/guides/move-in",
      "/en/guides/move-out",
      "/zh-tw/guides/move-in",
      "/zh-tw/guides/move-out",
      "/zh-cn/guides/move-in",
      "/zh-cn/guides/move-out",
    ]);
  });

  it("builds Traditional Chinese move-in metadata with reciprocal alternates", () => {
    const content = getGuideContent("zh-tw", "move-in");
    const metadata = buildGuideMetadata("zh-tw", "move-in");

    expect(metadata.metadataBase).toEqual(SITE_URL);
    expect(metadata).toMatchObject({
      title: content?.title,
      description: content?.description,
      alternates: {
        canonical: "/zh-tw/guides/move-in",
        languages: {
          en: "/en/guides/move-in",
          "zh-TW": "/zh-tw/guides/move-in",
          "zh-CN": "/zh-cn/guides/move-in",
          "x-default": "/en/guides/move-in",
        },
      },
      openGraph: {
        title: content?.title,
        description: content?.description,
        url: "/zh-tw/guides/move-in",
        siteName: "OSUTrade",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: content?.title,
        description: content?.description,
      },
    });
  });

  it("returns null for invalid locale or guide segments", () => {
    expect(getGuideContent("fr", "move-in")).toBeNull();
    expect(getGuideContent("en", "graduation")).toBeNull();
  });

  it("provides distinct localized guide content with actionable sections", () => {
    const allGuides = [
      getGuideContent("en", "move-in"),
      getGuideContent("en", "move-out"),
      getGuideContent("zh-tw", "move-in"),
      getGuideContent("zh-tw", "move-out"),
      getGuideContent("zh-cn", "move-in"),
      getGuideContent("zh-cn", "move-out"),
    ];

    expect(allGuides.every((guide) => guide?.sections.length >= 3)).toBe(true);
    expect(
      allGuides.every((guide) =>
        guide?.sections.every((section) => section.bullets.length > 0)
      )
    ).toBe(true);
    expect(allGuides.every((guide) => guide?.categoryLinks.length > 0)).toBe(true);
    expect(
      allGuides.flatMap((guide) => guide?.categoryLinks ?? []).every(({ href }) =>
        [
          "/overview?category=home",
          "/overview?category=books",
          "/overview?category=electronics",
          "/overview?category=general",
        ].includes(href)
      )
    ).toBe(true);
    expect(
      allGuides.every(
        (guide) =>
          guide?.requestCtaLabel.trim() &&
          guide.sellCtaLabel.trim() &&
          guide.counterpartGuide.label.trim() &&
          guide.breadcrumbs.home.trim() &&
          guide.breadcrumbs.guides.trim() &&
          guide.breadcrumbs.current.trim()
      )
    ).toBe(true);
    expect(new Set(allGuides.map((guide) => guide?.title)).size).toBe(6);
    expect(getGuideContent("en", "move-in")?.summary).toContain("Corvallis");
    expect(getGuideContent("en", "move-in")?.summary).toContain(
      "Oregon State students"
    );
    expect(
      allGuides.some((guide) =>
        /safely|安心/.test(guide?.description ?? "")
      )
    ).toBe(false);
  });

  it("maps every localized homepage season to its intended guide with UI labels", () => {
    for (const locale of ["en", "zh", "zhCn"] as const) {
      const copy = homeSeasonalCopy[locale];

      expect(copy["move-in"].guide).toBe("move-in");
      expect(copy["move-out"].guide).toBe("move-out");
      expect(copy.evergreen.guide).toBe("move-in");

      for (const season of ["move-in", "move-out", "evergreen"] as const) {
        const content = copy[season];
        expect(content.browseCta.trim()).not.toBe("");
        expect(content.rightPanelTitle.trim()).not.toBe("");
        expect(content.rightPanelRequestLabel.trim()).not.toBe("");
        expect(content.rightPanelSellLabel.trim()).not.toBe("");
        expect(content.categorySectionTitle.trim()).not.toBe("");
        expect(content.categories.length).toBeGreaterThan(0);
        expect(
          content.categories.every(({ href }) =>
            [
              "/overview?category=home",
              "/overview?category=books",
              "/overview?category=electronics",
              "/overview?category=general",
            ].includes(href)
          )
        ).toBe(true);
      }
    }
  });
});
