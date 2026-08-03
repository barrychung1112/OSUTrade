import { describe, expect, it } from "vitest";
import { selectRandomHomeHeroProducts } from "./homeHeroProducts";

const products = [
  { id: "1", name: "Desk", price: 20, imageUrl: "/desk.jpg", status: "available", quantity: 1 },
  { id: "2", name: "Lamp", price: 10, imageUrl: "/lamp.jpg", status: "available", quantity: 2 },
  { id: "3", name: "Bike", price: 80, imageUrl: "/bike.jpg", status: "available", quantity: 1 },
  { id: "4", name: "Chair", price: 15, imageUrl: null, status: "available", quantity: 1 },
  { id: "5", name: "Sold", price: 5, imageUrl: "/sold.jpg", status: "sold", quantity: 1 },
];

describe("selectRandomHomeHeroProducts", () => {
  it("returns only available in-stock products with images", () => {
    const selected = selectRandomHomeHeroProducts(products, () => 0.5, 3);

    expect(selected).toHaveLength(3);
    expect(selected.every((product) => product.status === "available")).toBe(true);
    expect(selected.every((product) => Boolean(product.imageUrl))).toBe(true);
  });

  it("uses the supplied random source when shuffling", () => {
    const first = selectRandomHomeHeroProducts(products, () => 0, 3);
    const second = selectRandomHomeHeroProducts(products, () => 0.99, 3);

    expect(first.map((product) => product.id)).not.toEqual(
      second.map((product) => product.id)
    );
  });
});
