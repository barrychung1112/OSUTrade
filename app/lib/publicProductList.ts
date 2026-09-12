import { isClearanceDiscoveryProduct } from "./productClearance";
import type { Product, ProductListResponse } from "./products";

const categories = new Set(["electronics", "clothing", "books", "home", "general"]);
const defaultLimit = 12;
const maximumLimit = 48;

export type PublicProductListParams = {
  page: number;
  limit: number;
  name?: string;
  category?: string;
  sort?: "asc" | "desc";
  discounted: boolean;
  clearance: boolean;
};

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInteger(value: string | undefined, fallback: number, maximum: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

export function parsePublicProductListParams(searchParams: SearchParams): PublicProductListParams {
  const name = firstValue(searchParams.name)?.trim() || undefined;
  const categoryValue = firstValue(searchParams.category)?.trim();
  const sortValue = firstValue(searchParams.sort);
  const discounted =
    firstValue(searchParams.sale) === "1" ||
    firstValue(searchParams.discounted) === "true";
  const clearance = !discounted && firstValue(searchParams.clearance) === "1";

  return {
    page: positiveInteger(firstValue(searchParams.page), 1, Number.MAX_SAFE_INTEGER),
    limit: positiveInteger(firstValue(searchParams.limit), defaultLimit, maximumLimit),
    name,
    category: categoryValue && categories.has(categoryValue) ? categoryValue : undefined,
    sort: sortValue === "asc" || sortValue === "desc" ? sortValue : undefined,
    discounted,
    clearance,
  };
}

function hasName(product: Product, name: string) {
  const query = name.toLocaleLowerCase();
  return [
    product.name,
    product.nameTranslations?.en,
    product.nameTranslations?.zhTw,
    product.nameTranslations?.zhCn,
  ].some((value) => value?.toLocaleLowerCase().includes(query));
}

function newestFirst(left: Product, right: Product) {
  const timestamp = String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? ""));
  return timestamp || String(right.id).localeCompare(String(left.id));
}

export function getPublicProductList(
  products: Product[],
  params: PublicProductListParams
): ProductListResponse {
  let matches = products.filter((product) => {
    if (product.status !== "available" || Number(product.quantity) <= 0) return false;
    if (params.name && !hasName(product, params.name)) return false;
    if (params.category && product.category !== params.category) return false;
    if (params.discounted && !(Number(product.discountPercent) > 0 && !product.isClearance)) {
      return false;
    }
    if (params.clearance && !isClearanceDiscoveryProduct(product)) return false;
    return true;
  });

  matches = [...matches].sort((left, right) => {
    if (params.sort) {
      const priceDifference = Number(left.price) - Number(right.price);
      if (priceDifference) return params.sort === "asc" ? priceDifference : -priceDifference;
    }
    return newestFirst(left, right);
  });

  const start = (params.page - 1) * params.limit;
  return {
    data: matches.slice(start, start + params.limit),
    total: matches.length,
    page: params.page,
    limit: params.limit,
  };
}
