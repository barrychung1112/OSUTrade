import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ listPublicProducts: vi.fn() }));

vi.mock("./lib/publicProduct", () => ({
  listPublicProducts: mocks.listPublicProducts,
}));
vi.mock("./HomePageClient", () => ({
  default: ({ products, discoveryError }: { products: Array<{ name: string }>; discoveryError: boolean }) => (
    <div>{discoveryError ? "unavailable" : products.map((product) => product.name).join(", ")}</div>
  ),
}));

import HomePage from "./page";

describe("home page", () => {
  test("passes publicly available listings into the first server render", async () => {
    mocks.listPublicProducts.mockResolvedValue([{ id: "desk", name: "Desk", price: 20 }]);

    render(await HomePage());

    expect(mocks.listPublicProducts).toHaveBeenCalledOnce();
    expect(screen.getByText("Desk")).toBeTruthy();
  });
});
