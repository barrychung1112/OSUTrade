import type { Product } from "./products";

export function selectRandomHomeHeroProducts(
  products: Product[],
  random: () => number = Math.random,
  count = 3
) {
  const candidates = products.filter(
    (product) =>
      product.status === "available" &&
      Number(product.quantity ?? 0) > 0 &&
      Boolean(product.imageUrl)
  );

  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [candidates[index], candidates[swapIndex]] = [
      candidates[swapIndex],
      candidates[index],
    ];
  }

  return candidates.slice(0, count);
}
