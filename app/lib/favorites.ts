export const favoriteStorageKey = "osutrade:favorite-product-ids";

export function normalizeFavoriteProductIds(
  values: unknown,
  limit = 100
): string[] {
  if (!Array.isArray(values) || limit <= 0) {
    return [];
  }

  const productIds: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const productId = String(value ?? "").trim();

    if (!productId || seen.has(productId)) {
      continue;
    }

    productIds.push(productId);
    seen.add(productId);

    if (productIds.length === limit) {
      break;
    }
  }

  return productIds;
}

export function isPublicFavoriteProduct(product: {
  status?: string | null;
  quantity?: number | string | null;
}): boolean {
  const quantity = Number(product.quantity);

  return product.status === "available" && Number.isFinite(quantity) && quantity > 0;
}
