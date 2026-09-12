import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const productState = vi.hoisted(() => ({
  value: {
    products: [], loading: false, loadingMore: false, error: null,
    total: 0, page: 1, limit: 20, refetch: vi.fn(), hasMore: false,
  },
}));

vi.mock("../components/Header", () => ({ default: () => <header /> }));
vi.mock("../components/EmptyState", () => ({
  default: ({ title }: { title: string }) => <p>{title}</p>,
}));
vi.mock("../components/ProductCard", () => ({
  default: ({ name }: { name: string }) => <article>{name}</article>,
}));
vi.mock("../hook/useProducts", () => ({
  useProducts: () => productState.value,
}));

import MarketplaceClient from "./MarketplaceClient";
import { I18nProvider } from "../i18n";

describe("MarketplaceClient", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
    productState.value = {
      products: [], loading: false, loadingMore: false, error: null,
      total: 0, page: 1, limit: 20, refetch: vi.fn(), hasMore: false,
    };
    window.history.replaceState({}, "", "/overview");
  });

  test("renders a semantic marketplace H1 in the initial page markup", () => {
    render(
      <I18nProvider>
        <MarketplaceClient
          initialResponse={{ data: [], total: 0, page: 1, limit: 20 }}
          initialParams={{
            page: 1, limit: 20, name: undefined, category: undefined,
            sort: undefined, discounted: false, clearance: false,
          }}
        />
      </I18nProvider>
    );

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Find campus deals faster."
    );
  });

  test("removes a stale page parameter after filters reset results to page one", async () => {
    window.history.replaceState({}, "", "/overview?page=2");
    productState.value = { ...productState.value, page: 2 };

    render(
      <I18nProvider>
        <MarketplaceClient
          initialResponse={{ data: [], total: 0, page: 2, limit: 20 }}
          initialParams={{
            page: 2, limit: 20, name: undefined, category: undefined,
            sort: undefined, discounted: false, clearance: false,
          }}
        />
      </I18nProvider>
    );

    productState.value = { ...productState.value, page: 1 };
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "desk" } });

    await waitFor(() => {
      const url = new URL(window.location.href);
      expect(url.searchParams.get("page")).toBeNull();
      expect(url.searchParams.get("q")).toBe("desk");
    });
  });
});
