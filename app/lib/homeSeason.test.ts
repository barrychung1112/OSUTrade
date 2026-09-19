import { describe, expect, it } from "vitest";
import { getHomeSeason } from "./homeSeason";

describe("getHomeSeason", () => {
  it.each([
    ["2026-04-01T06:59:59Z", "evergreen"],
    ["2026-04-01T07:00:00Z", "move-out"],
    ["2026-08-01T06:59:59Z", "move-out"],
    ["2026-08-01T07:00:00Z", "move-in"],
    ["2026-12-01T07:59:59Z", "move-in"],
    ["2026-12-01T08:00:00Z", "evergreen"],
  ])("returns the expected season for %s", (dateString, expectedSeason) => {
    expect(getHomeSeason(new Date(dateString))).toBe(expectedSeason);
  });
});
