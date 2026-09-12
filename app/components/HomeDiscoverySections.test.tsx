import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

vi.mock("next/image", () => ({ default: (props: Record<string, unknown>) => <img {...props} /> }));
vi.mock("../i18n", () => ({
  useI18n: () => ({ locale: "zh", t: (key: string) => key }),
}));

import HomeDiscoverySections from "./HomeDiscoverySections";

describe("HomeDiscoverySections", () => {
  test("links discovery cards to the selected public product locale", () => {
    render(
      <HomeDiscoverySections
        products={[{
          id: "desk",
          name: "Desk",
          nameTranslations: { zhTw: "書桌" },
          price: 20,
          status: "available",
          quantity: 1,
          createdAt: "2026-09-12T00:00:00.000Z",
        }]}
      />
    );

    expect(screen.getByRole("link", { name: /書桌/ }).getAttribute("href")).toBe(
      "/zh-tw/product/desk"
    );
  });
});
