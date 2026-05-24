export type Product = {
  id: string | number;
  name: string;
  description?: string | null;
  nameTranslations?: {
    en?: string | null;
    zhTw?: string | null;
    zhCn?: string | null;
  } | null;
  price: number;
  category?: string | null;
  imageUrl?: string | null;
  sellerId?: string | null;
  status?: string | null;
  quantity?: number | null;
  sellerContact?: SellerContact | null;
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

export async function fetchProducts(signal?: AbortSignal): Promise<Product[]> {
  const res = await fetch("/api/products", {
    signal,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to load products: HTTP ${res.status}`);
  }

  const payload = (await res.json()) as ProductListResponse;
  return payload.data ?? [];
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
