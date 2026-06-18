import { describe, expect, test } from "vitest";
import { detectEmbeddedAuthBrowser } from "./embeddedBrowser";

describe("detectEmbeddedAuthBrowser", () => {
  test("detects LINE in-app browser user agents", () => {
    expect(
      detectEmbeddedAuthBrowser(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Line/15.0.0 Mobile/15E148"
      )
    ).toMatchObject({
      isEmbedded: true,
      appName: "LINE",
    });
  });

  test("detects Instagram in-app browser user agents", () => {
    expect(
      detectEmbeddedAuthBrowser(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Instagram 335.0.0.31.91 Mobile"
      )
    ).toMatchObject({
      isEmbedded: true,
      appName: "Instagram",
    });
  });

  test("does not flag regular Safari or Chrome", () => {
    expect(
      detectEmbeddedAuthBrowser(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Mobile/15E148 Safari/604.1"
      )
    ).toMatchObject({
      isEmbedded: false,
      appName: null,
    });

    expect(
      detectEmbeddedAuthBrowser(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36"
      )
    ).toMatchObject({
      isEmbedded: false,
      appName: null,
    });
  });
});
