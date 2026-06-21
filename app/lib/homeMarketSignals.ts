import type { Product } from "./products";

export type HomeMarketSignals = {
  activeListings: number;
  availableItems: number;
  addedThisWeek: number;
  popularCategory: string | null;
  recentlyAddedName: string | null;
};

const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

function getCreatedTime(product: Product) {
  if (!product.createdAt) return 0;
  const time = new Date(product.createdAt).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function buildHomeMarketSignals(
  products: Product[],
  now: Date = new Date()
): HomeMarketSignals {
  const categoryCounts = new Map<string, number>();
  const nowTime = now.getTime();

  let availableItems = 0;
  let addedThisWeek = 0;

  for (const product of products) {
    availableItems += Math.max(0, product.quantity ?? 1);

    const category = product.category?.trim();
    if (category) {
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }

    const createdTime = getCreatedTime(product);
    if (createdTime > 0 && nowTime - createdTime <= oneWeekMs) {
      addedThisWeek += 1;
    }
  }

  const popularCategory =
    [...categoryCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ??
    null;

  const recentlyAddedName =
    [...products].sort((a, b) => getCreatedTime(b) - getCreatedTime(a))[0]?.name ?? null;

  return {
    activeListings: products.length,
    availableItems,
    addedThisWeek,
    popularCategory,
    recentlyAddedName,
  };
}
