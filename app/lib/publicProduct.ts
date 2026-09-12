import { unstable_cache } from "next/cache";

import { createPublicClient } from "@/utils/supabase/public";

import { productCacheTag, publicProductsCacheTag } from "./publicProductCache";
import { toProductRecord, type ProductRow } from "./productRecord";
import type { Product } from "./products";
import type { PublicLocale } from "./publicLocale";

type PublicEligibility = {
  status?: string | null;
  quantity?: number | null;
};

type LocalizedText = {
  en?: string | null;
  zhTw?: string | null;
  zhCn?: string | null;
};

type LocalizableProduct = Pick<
  Product,
  "name" | "description" | "nameTranslations" | "descriptionTranslations"
>;

function firstText(...values: Array<string | null | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim() ?? "";
}

export function isPublicProduct(product: PublicEligibility) {
  return product.status === "available" && Number(product.quantity) > 0;
}

export function localizedProductText(
  translations: LocalizedText | null | undefined,
  fallback: string | null | undefined,
  locale: PublicLocale
) {
  if (locale === "zh-tw") {
    return firstText(translations?.zhTw, translations?.en, fallback);
  }

  if (locale === "zh-cn") {
    return firstText(translations?.zhCn, translations?.en, fallback);
  }

  return firstText(translations?.en, fallback);
}

export function localizedProduct(product: LocalizableProduct, locale: PublicLocale) {
  return {
    name: localizedProductText(product.nameTranslations, product.name, locale),
    description: localizedProductText(
      product.descriptionTranslations,
      product.description,
      locale
    ),
  };
}

export async function getPublicProduct(id: string | number) {
  const productId = String(id);
  return unstable_cache(
    async () => {
      const supabase = createPublicClient();
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("product_id", productId)
        .maybeSingle();

      if (error) throw error;
      if (!data || !isPublicProduct(data)) return null;

      return toProductRecord(data as ProductRow);
    },
    ["public-product", productId],
    { tags: [publicProductsCacheTag, productCacheTag(productId)], revalidate: 300 }
  )();
}

async function queryPublicProducts() {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("status", "available")
    .gt("quantity", 0);

  if (error) throw error;

  return (data ?? [])
    .filter(isPublicProduct)
    .map((product) => toProductRecord(product as ProductRow));
}

export async function listLivePublicProducts() {
  return queryPublicProducts();
}

export async function listPublicProducts() {
  return unstable_cache(
    queryPublicProducts,
    ["public-products"],
    { tags: [publicProductsCacheTag], revalidate: 300 }
  )();
}
