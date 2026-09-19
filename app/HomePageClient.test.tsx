import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));

vi.mock("@radix-ui/themes", () => ({
  Theme: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("lucide-react", () => ({
  ArrowRight: () => null,
  Github: () => null,
  Heart: () => null,
  MessageCircle: () => null,
  Search: () => null,
  Send: () => null,
  Handshake: () => null,
}));

vi.mock("./components/Header", () => ({ default: () => null }));
vi.mock("./components/NewStudentWelcome", () => ({ default: () => null }));
vi.mock("./components/HomeHero", () => ({
  default: () => <div data-testid="home-hero" />,
}));
vi.mock("./components/HomeSeasonalCategories", () => ({
  default: () => <div data-testid="home-seasonal-categories" />,
}));
vi.mock("./components/HomeDiscoverySections", () => ({
  default: () => <div data-testid="home-discovery-sections" />,
}));
vi.mock("./components/HomeMarketSignalsCard", () => ({ default: () => null }));
vi.mock("./components/LoginModal", () => ({ default: () => null }));
vi.mock("./components/SignUpModal", () => ({ default: () => null }));
vi.mock("./i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("./lib/homeCtaAccess", () => ({
  getHomeCtaAction: () => ({ type: "navigate", path: "/sell" }),
}));

import HomePageClient from "./HomePageClient";

describe("HomePageClient", () => {
  test("places seasonal categories immediately after the hero and before discovery", () => {
    render(
      <HomePageClient
        products={[]}
        heroProducts={[]}
        season="move-in"
      />
    );

    const hero = screen.getByTestId("home-hero");
    const seasonalCategories = screen.getByTestId("home-seasonal-categories");
    const discoverySections = screen.getByTestId("home-discovery-sections");

    expect(hero.nextElementSibling?.firstElementChild).toBe(seasonalCategories);
    expect(seasonalCategories.nextElementSibling).toBe(discoverySections);
  });
});
