import { fireEvent, render, screen } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import { describe, expect, test, vi } from "vitest";
import { I18nProvider } from "../i18n";

const mocks = vi.hoisted(() => ({
  isFavorite: vi.fn(),
  toggleFavorite: vi.fn(),
}));

vi.mock("./FavoriteProvider", () => ({
  useFavorites: () => ({
    isFavorite: mocks.isFavorite,
    toggleFavorite: mocks.toggleFavorite,
  }),
}));

import ProductCard from "./ProductCard";

describe("ProductCard favorites", () => {
  test("offers a separate favorite control and public seller link", () => {
    mocks.isFavorite.mockReturnValue(false);

    render(
      <I18nProvider>
        <Theme>
          <ProductCard
            productId="desk-1"
            name="Desk"
            price={30}
            imageUrl="https://example.com/desk.jpg"
            sellerId="d4a7706c-21b9-4b39-b4f6-3d355b46c0d3"
            returnTo="/overview?page=2"
          />
        </Theme>
      </I18nProvider>
    );

    const favoriteButton = screen.getByRole("button", {
      name: "Save favorite",
    });
    fireEvent.click(favoriteButton);

    expect(mocks.toggleFavorite).toHaveBeenCalledWith("desk-1");
    expect(favoriteButton.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("link", { name: "More from this seller" }).getAttribute("href")).toBe(
      "/sellers/d4a7706c-21b9-4b39-b4f6-3d355b46c0d3?returnTo=%2Foverview%3Fpage%3D2"
    );
  });
});
