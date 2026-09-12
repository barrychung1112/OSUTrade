import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

vi.mock("@/app/i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

import ProductRequestActions from "./ProductRequestActions";

describe("product request actions", () => {
  test("adds the server-loaded product to the request cart", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ProductRequestActions
        product={{
          id: "p-1", name: "Desk", price: 20, category: "home",
          imageUrl: "https://example.com/desk.jpg", quantity: 1,
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "product.addToCart" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/cart",
        expect.objectContaining({ method: "POST" })
      );
    });
  });
});
