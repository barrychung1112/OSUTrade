import type { Product } from "./products";
import type { MarketplaceSort } from "./marketplaceUrlState";

export type FavoriteProductFilters = {
  name: string;
  category: string;
  sort: MarketplaceSort;
  saleOnly: boolean;
  clearanceOnly: boolean;
};

function productNames(product: Product) {
  return [
    product.name,
    product.nameTranslations?.en,
    product.nameTranslations?.zhTw,
    product.nameTranslations?.zhCn,
  ]
    .filter((name): name is string => Boolean(name?.trim()))
    .map((name) => name.toLocaleLowerCase());
}

function isClearanceProduct(product: Product) {
  return product.isClearance === true || product.price === 1;
}

function productCreatedAt(product: Product) {
  const timestamp = Date.parse(product.createdAt ?? "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function compareNewest(first: Product, second: Product) {
  const createdDifference = productCreatedAt(second) - productCreatedAt(first);
  if (createdDifference !== 0) return createdDifference;
  return String(second.id).localeCompare(String(first.id));
}

export function filterFavoriteProducts(
  products: Product[],
  filters: FavoriteProductFilters
) {
  const search = filters.name.trim().toLocaleLowerCase();

  const filtered = products.filter((product) => {
    const clearance = isClearanceProduct(product);

    if (search && !productNames(product).some((name) => name.includes(search))) {
      return false;
    }
    if (filters.category !== "all" && product.category !== filters.category) {
      return false;
    }
    if (filters.saleOnly && (clearance || !(product.discountPercent && product.discountPercent > 0))) {
      return false;
    }
    if (filters.clearanceOnly && !clearance) {
      return false;
    }

    return true;
  });

  return [...filtered].sort((first, second) => {
    if (filters.sort === "asc" && first.price !== second.price) {
      return first.price - second.price;
    }
    if (filters.sort === "desc" && first.price !== second.price) {
      return second.price - first.price;
    }
    return compareNewest(first, second);
  });
}
