import { describe, expect, it } from "vitest";
import {
  GA_MEASUREMENT_ID,
  shouldEnableGoogleAnalytics,
} from "./googleAnalytics";

describe("Google Analytics configuration", () => {
  it("uses the OSUTrade GA4 measurement ID", () => {
    expect(GA_MEASUREMENT_ID).toBe("G-EE1HLRT49M");
  });

  it("enables analytics only for production deployments", () => {
    expect(shouldEnableGoogleAnalytics("production")).toBe(true);
    expect(shouldEnableGoogleAnalytics("preview")).toBe(false);
    expect(shouldEnableGoogleAnalytics("development")).toBe(false);
    expect(shouldEnableGoogleAnalytics(undefined)).toBe(false);
  });
});
