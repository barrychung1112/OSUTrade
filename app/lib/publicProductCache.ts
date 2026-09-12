import { revalidatePath, revalidateTag } from "next/cache";

import { productPath, publicLocales } from "./publicLocale";

export const publicProductsCacheTag = "public-products";

export function productCacheTag(id: string | number) {
  return `public-product:${String(id)}`;
}

export function publicProductPaths(id: string | number) {
  return publicLocales.map((locale) => productPath(locale, id));
}

export function publicProductInvalidationTargets(id: string | number) {
  return {
    tags: [publicProductsCacheTag, productCacheTag(id)],
    paths: ["/sitemap.xml", ...publicProductPaths(id)],
  };
}

export function revalidatePublicProduct(id: string | number) {
  const { tags, paths } = publicProductInvalidationTargets(id);
  tags.forEach((tag) => revalidateTag(tag));
  paths.forEach((path) => revalidatePath(path));
}
