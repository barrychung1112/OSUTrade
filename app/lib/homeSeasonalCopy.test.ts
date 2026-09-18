import { describe, expect, it } from "vitest";

import { homeGuideForSeason, homeSeasonalCopy } from "./homeSeasonalCopy";

describe("home seasonal copy", () => {
  it("maps every homepage season to its intended guide", () => {
    expect(homeGuideForSeason).toEqual({
      "move-in": "move-in",
      "move-out": "move-out",
      evergreen: "move-in",
    });
  });

  it("provides complete localized content without server dependencies", () => {
    for (const locale of ["en", "zh", "zhCn"] as const) {
      for (const season of ["move-in", "move-out", "evergreen"] as const) {
        const content = homeSeasonalCopy[locale][season];

        expect(content.guide).toBe(homeGuideForSeason[season]);
        expect(content.h1.trim()).not.toBe("");
        expect(content.body.trim()).not.toBe("");
        expect(content.browseCta.trim()).not.toBe("");
      }
    }
  });
});
