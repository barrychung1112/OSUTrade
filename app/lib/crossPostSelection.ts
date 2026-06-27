export const maxCrossPostProducts = 10;

export type SelectableProduct = {
  id: string | number;
  status?: string | null;
};

function uniqueIds(ids: Array<string | number>) {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of ids) {
    const id = String(value ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }

  return result;
}

export function selectAllAvailable(products: SelectableProduct[]) {
  return products
    .filter((product) => product.status === "available")
    .map((product) => String(product.id))
    .slice(0, maxCrossPostProducts);
}

export function reconcileCrossPostSelection(
  ids: string[],
  products: SelectableProduct[]
) {
  const availableIds = new Set(
    products
      .filter((product) => product.status === "available")
      .map((product) => String(product.id))
  );

  return uniqueIds(ids)
    .filter((id) => availableIds.has(id))
    .slice(0, maxCrossPostProducts);
}

export function toggleCrossPostSelection(
  ids: string[],
  productId: string | number,
  checked: boolean
) {
  const currentIds = uniqueIds(ids).slice(0, maxCrossPostProducts);
  const id = String(productId ?? "").trim();
  if (!id) return currentIds;

  if (!checked) {
    return currentIds.filter((currentId) => currentId !== id);
  }

  if (currentIds.includes(id) || currentIds.length >= maxCrossPostProducts) {
    return currentIds;
  }

  return [...currentIds, id];
}
