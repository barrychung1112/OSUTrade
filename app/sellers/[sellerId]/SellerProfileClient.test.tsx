import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { I18nProvider } from "../../i18n";

vi.mock("../../components/Header", () => ({ default: () => <header /> }));
vi.mock("../../components/ProductCard", () => ({
  default: ({ name }: { name: string }) => <article>{name}</article>,
}));

import SellerProfileClient from "./SellerProfileClient";

describe("SellerProfileClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  test("renders only the seller display name and available product cards", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          seller: { id: "seller-1", name: "Campus Seller" },
          data: [
            {
              id: "desk-1",
              name: "Desk",
              price: 30,
              category: "home",
              sellerId: "seller-1",
              quantity: 1,
            },
          ],
        }),
        { status: 200 }
      )
    );

    render(
      <I18nProvider>
        <SellerProfileClient sellerId="seller-1" />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
        "Campus Seller's listings"
      );
    });
    expect(screen.getByText("Desk")).toBeTruthy();
    expect(screen.queryByText("private@example.com")).toBeNull();
  });

  test("shows a safe not-found state for a missing seller", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Seller not found." }), { status: 404 })
    );

    render(
      <I18nProvider>
        <SellerProfileClient sellerId="missing" />
      </I18nProvider>
    );

    expect(await screen.findByText("This seller was not found.")).toBeTruthy();
  });
});
