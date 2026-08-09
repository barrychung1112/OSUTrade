import { getProductPricing } from "./productDiscount";
import type { Product } from "./products";

export type ProductRow = {
  product_id: string | number;
  name: string;
  description?: string | null;
  description_en?: string | null;
  description_zh_tw?: string | null;
  description_zh_cn?: string | null;
  name_en?: string | null;
  name_zh_tw?: string | null;
  name_zh_cn?: string | null;
  price: number;
  discount_percent?: number | null;
  clearance_price?: number | null;
  effective_price?: number | null;
  category: string | null;
  image_url: string | null;
  image_urls?: string[] | null;
  seller_id: string | null;
  status: string | null;
  quantity: number | null;
};

function normalizeImageUrls(
  imageUrls?: string[] | null,
  imageUrl?: string | null
) {
  const urls = Array.isArray(imageUrls)
    ? imageUrls.filter((url) => typeof url === "string" && url.trim())
    : [];
  if (urls.length > 0) return urls;
  return imageUrl ? [imageUrl] : [];
}

export function toProductRecord(row: ProductRow): Product {
  const imageUrls = normalizeImageUrls(row.image_urls, row.image_url);
  const pricing = getProductPricing(row);

  return {
    id: row.product_id,
    name: row.name,
    description: row.description ?? "",
    nameTranslations: {
      en: row.name_en ?? row.name,
      zhTw: row.name_zh_tw ?? row.name,
      zhCn: row.name_zh_cn ?? row.name,
    },
    descriptionTranslations: {
      en: row.description_en ?? row.description ?? "",
      zhTw: row.description_zh_tw ?? row.description ?? "",
      zhCn: row.description_zh_cn ?? row.description ?? "",
    },
    price: pricing.effectivePrice,
    originalPrice: pricing.originalPrice,
    effectivePrice: pricing.effectivePrice,
    discountPercent: pricing.discountPercent,
    clearancePrice: pricing.clearancePrice,
    isClearance: pricing.isClearance,
    category: row.category,
    imageUrl: imageUrls[0] ?? null,
    imageUrls,
    sellerId: row.seller_id,
    status: row.status ?? "available",
    quantity: row.quantity ?? 1,
  };
}
