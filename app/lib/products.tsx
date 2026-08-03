export type Product = {
  id: string | number;
  name: string;
  description?: string | null;
  descriptionTranslations?: {
    en?: string | null;
    zhTw?: string | null;
    zhCn?: string | null;
  } | null;
  nameTranslations?: {
    en?: string | null;
    zhTw?: string | null;
    zhCn?: string | null;
  } | null;
  price: number;
  originalPrice?: number;
  effectivePrice?: number;
  discountPercent?: number;
  category?: string | null;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
  sellerId?: string | null;
  status?: string | null;
  quantity?: number | null;
  sellerContact?: SellerContact | null;
  createdAt?: string | null;
};

export type SellerContact = {
  email?: string | null;
  phone?: string | null;
  lineId?: string | null;
  wechatId?: string | null;
};

export type ProductListResponse = {
  data: Product[];
  total: number;
  page: number;
  limit: number;
};

export type ProductListOptions = {
  page?: number;
  limit?: number;
  name?: string;
  category?: string;
  sort?: "asc" | "desc";
  discounted?: boolean;
  signal?: AbortSignal;
};

function buildProductListUrl(options: ProductListOptions = {}) {
  const params = new URLSearchParams();

  if (options.page) params.set("page", String(options.page));
  if (options.limit) params.set("limit", String(options.limit));
  if (options.name?.trim()) params.set("name", options.name.trim());
  if (options.category?.trim()) params.set("category", options.category.trim());
  if (options.sort === "asc" || options.sort === "desc") {
    params.set("sort", options.sort);
  }
  if (options.discounted) params.set("discounted", "true");

  const query = params.toString();
  return query ? `/api/products?${query}` : "/api/products";
}

export async function fetchProducts(
  options: ProductListOptions = {}
): Promise<ProductListResponse> {
  const res = await fetch(buildProductListUrl(options), {
    signal: options.signal,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to load products: HTTP ${res.status}`);
  }

  const payload = (await res.json()) as ProductListResponse;
  return {
    data: payload.data ?? [],
    total: payload.total ?? 0,
    page: payload.page ?? options.page ?? 1,
    limit: payload.limit ?? options.limit ?? 12,
  };
}

export async function fetchProduct(
  id: string | number,
  signal?: AbortSignal
): Promise<Product> {
  const res = await fetch(`/api/products/${id}`, {
    signal,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to load product: HTTP ${res.status}`);
  }

  return (await res.json()) as Product;
}
