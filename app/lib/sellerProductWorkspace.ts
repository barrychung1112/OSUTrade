import type { ProductNameTranslations } from "./productTranslations";

export type SellerWorkspaceStatus = "available" | "pending" | "sold" | "removed";
export type SellerWorkspaceFilter = "all" | SellerWorkspaceStatus;
export type SellerWorkspaceSort = "newest" | "priceAsc" | "priceDesc" | "stockDesc";

export type SellerWorkspaceProduct = {
  id: string | number;
  name: string;
  nameTranslations?: ProductNameTranslations | null;
  price: number;
  quantity?: number | null;
  status: SellerWorkspaceStatus;
  createdAt?: string | null;
  hasActiveRequest?: boolean;
};

export function canBatchEditSellerProduct(product: SellerWorkspaceProduct) {
  return product.status === "available" && !product.hasActiveRequest;
}

function searchableName(product: SellerWorkspaceProduct) {
  return [
    product.name,
    product.nameTranslations?.en,
    product.nameTranslations?.zhTw,
    product.nameTranslations?.zhCn,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}

export function filterAndSortSellerProducts<T extends SellerWorkspaceProduct>(
  products: T[],
  options: {
    query: string;
    status: SellerWorkspaceFilter;
    sort: SellerWorkspaceSort;
  }
) {
  const query = options.query.trim().toLocaleLowerCase();
  const result = products.filter((product) => {
    const matchesStatus =
      options.status === "all" || product.status === options.status;
    const matchesQuery = !query || searchableName(product).includes(query);
    return matchesStatus && matchesQuery;
  });

  return result.sort((a, b) => {
    if (options.sort === "priceAsc") return Number(a.price) - Number(b.price);
    if (options.sort === "priceDesc") return Number(b.price) - Number(a.price);
    if (options.sort === "stockDesc") {
      return Number(b.quantity ?? 0) - Number(a.quantity ?? 0);
    }
    return (
      new Date(b.createdAt ?? 0).getTime() -
      new Date(a.createdAt ?? 0).getTime()
    );
  });
}
