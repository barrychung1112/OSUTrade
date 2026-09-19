import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listPublicProducts: vi.fn(),
  getHomeSeason: vi.fn(),
  selectRandomHomeHeroProducts: vi.fn(),
  homePageClientProps: vi.fn(),
}));

vi.mock("./lib/publicProduct", () => ({
  listPublicProducts: mocks.listPublicProducts,
}));
vi.mock("./lib/homeSeason", () => ({
  getHomeSeason: mocks.getHomeSeason,
}));
vi.mock("./lib/homeHeroProducts", () => ({
  selectRandomHomeHeroProducts: mocks.selectRandomHomeHeroProducts,
}));
vi.mock("./HomePageClient", () => ({
  default: (props: {
    products: Array<{ name: string }>;
    heroProducts: Array<{ name: string }>;
    season: string;
    discoveryError?: boolean;
  }) => {
    mocks.homePageClientProps(props);
    const {
      products,
      heroProducts,
      season,
      discoveryError,
    } = props;

    return (
      <div>
        <span>{discoveryError ? "unavailable" : products.map((product) => product.name).join(", ")}</span>
        <span>{heroProducts.map((product) => product.name).join(", ")}</span>
        <span>{season}</span>
      </div>
    );
  },
}));

import HomePage, { metadata } from "./page";

describe("home page", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test("exports truthful, canonical marketplace metadata", () => {
    expect(metadata).toMatchObject({
      title: "OSUTrade | Used Furniture, Textbooks & Dorm Essentials in Corvallis",
      description: expect.stringContaining("secondhand furniture"),
      alternates: { canonical: "/" },
      openGraph: {
        title: "OSUTrade | Used Furniture, Textbooks & Dorm Essentials in Corvallis",
        description: expect.stringContaining("local pickup"),
        url: "/",
      },
      twitter: {
        title: "OSUTrade | Used Furniture, Textbooks & Dorm Essentials in Corvallis",
        description: expect.stringContaining("local pickup"),
      },
    });
  });

  test("passes server-selected listings, hero products, and season into the first render", async () => {
    const products = [{ id: "desk", name: "Desk", price: 20 }];
    const heroProducts = [{ id: "lamp", name: "Lamp", price: 15 }];
    mocks.getHomeSeason.mockReturnValue("move-in");
    mocks.listPublicProducts.mockResolvedValue(products);
    mocks.selectRandomHomeHeroProducts.mockReturnValue(heroProducts);

    render(await HomePage());

    expect(mocks.getHomeSeason).toHaveBeenCalledOnce();
    expect(mocks.listPublicProducts).toHaveBeenCalledOnce();
    expect(mocks.selectRandomHomeHeroProducts).toHaveBeenCalledWith(products);
    expect(mocks.homePageClientProps).toHaveBeenCalledWith({
      products,
      heroProducts,
      season: "move-in",
    });
    expect(screen.getByText("Desk")).toBeTruthy();
    expect(screen.getByText("Lamp")).toBeTruthy();
    expect(screen.getByText("move-in")).toBeTruthy();
  });

  test("keeps the resolved season and passes empty data when discovery loading fails", async () => {
    mocks.getHomeSeason.mockReturnValue("move-out");
    mocks.listPublicProducts.mockRejectedValue(new Error("database unavailable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(await HomePage());

    expect(mocks.getHomeSeason).toHaveBeenCalledOnce();
    expect(mocks.selectRandomHomeHeroProducts).not.toHaveBeenCalled();
    expect(mocks.homePageClientProps).toHaveBeenCalledWith({
      products: [],
      heroProducts: [],
      season: "move-out",
      discoveryError: true,
    });
    expect(screen.getByText("unavailable")).toBeTruthy();
    expect(screen.getByText("move-out")).toBeTruthy();
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});
