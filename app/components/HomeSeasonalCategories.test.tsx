import { render, screen } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import { describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ locale: "en" as "en" | "zh" }));

vi.mock("next/image", () => ({
  default: ({ fill: _fill, unoptimized: _unoptimized, ...props }: Record<string, unknown>) => (
    <img {...props} />
  ),
}));

vi.mock("../i18n", () => ({
  useI18n: () => ({ locale: mocks.locale, t: (key: string) => key }),
}));

import HomeSeasonalCategories from "./HomeSeasonalCategories";
import ProductCard from "./ProductCard";

describe("HomeSeasonalCategories", () => {
  test("renders move-in categories as a labelled section with a level-two heading", () => {
    mocks.locale = "en";
    render(<HomeSeasonalCategories season="move-in" />);

    const heading = screen.getByRole("heading", {
      name: "Browse move-in categories",
      level: 2,
    });
    const section = screen.getByRole("region", {
      name: "Browse move-in categories",
    });
    const homeLink = screen.getByRole("link", { name: "Home" });

    expect(section.contains(heading)).toBe(true);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(homeLink.getAttribute("href")).toBe("/overview?category=home");
    expect(section.classList.contains("home-seasonal-categories")).toBe(true);
    expect(homeLink.classList.contains("home-seasonal-category-card")).toBe(true);
    expect(homeLink.classList.contains("min-h-11")).toBe(true);
  });

  test("renders localized category labels and category links for a Traditional Chinese locale", () => {
    mocks.locale = "zh";
    render(<HomeSeasonalCategories season="move-in" />);

    expect(screen.getByRole("heading", { name: "瀏覽入住分類", level: 2 })).toBeTruthy();
    expect(screen.getByRole("link", { name: "居家" }).getAttribute("href"))
      .toBe("/overview?category=home");
  });

  test("renders product names as level-two headings", () => {
    render(
      <Theme>
        <ProductCard
          productId="desk"
          name="Desk"
          price={20}
          imageUrl="/desk.jpg"
        />
      </Theme>
    );

    expect(screen.getByRole("heading", { name: "Desk", level: 2 })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Desk", level: 1 })).toBeNull();
  });
});
