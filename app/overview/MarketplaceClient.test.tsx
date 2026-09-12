import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

vi.mock("../components/Header", () => ({ default: () => <header /> }));
vi.mock("../components/EmptyState", () => ({
  default: ({ title }: { title: string }) => <p>{title}</p>,
}));
vi.mock("../components/ProductCard", () => ({
  default: ({ name }: { name: string }) => <article>{name}</article>,
}));
vi.mock("../hook/useProducts", () => ({
  useProducts: () => ({
    products: [], loading: false, loadingMore: false, error: null,
    total: 0, refetch: vi.fn(), loadMore: vi.fn(), hasMore: false,
  }),
}));

import MarketplaceClient from "./MarketplaceClient";
import { I18nProvider } from "../i18n";

describe("MarketplaceClient", () => {
  test("renders a semantic marketplace H1 in the initial page markup", () => {
    render(
      <I18nProvider>
        <MarketplaceClient
          initialResponse={{ data: [], total: 0, page: 1, limit: 12 }}
          initialParams={{
            page: 1, limit: 12, name: undefined, category: undefined,
            sort: undefined, discounted: false, clearance: false,
          }}
        />
      </I18nProvider>
    );

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Find campus deals faster."
    );
  });
});
