import { describe, expect, test } from "vitest";
import { normalizeDisplayName } from "./displayName";

describe("normalizeDisplayName", () => {
  test("trims and collapses display-name whitespace", () => {
    expect(normalizeDisplayName("  OSU   Seller  ")).toEqual({ value: "OSU Seller" });
  });

  test("allows Unicode names while rejecting too-short and control-character values", () => {
    expect(normalizeDisplayName("北璽")).toEqual({ value: "北璽" });
    expect(normalizeDisplayName("A")).toEqual({ error: "DISPLAY_NAME_INVALID" });
    expect(normalizeDisplayName("Valid\nName")).toEqual({ error: "DISPLAY_NAME_INVALID" });
  });
});
