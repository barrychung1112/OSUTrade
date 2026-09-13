import type { MetadataRoute } from "next";

import { SITE_URL } from "./lib/productMetadata";
import { listPublicProducts } from "./lib/publicProduct";
import { productPath, publicLocales } from "./lib/publicLocale";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await listPublicProducts();

  return [
    { url: new URL("/", SITE_URL).toString() },
    { url: new URL("/overview", SITE_URL).toString() },
    ...products.flatMap((product) =>
      publicLocales.map((locale) => ({
        url: new URL(productPath(locale, product.id), SITE_URL).toString(),
      }))
    ),
  ];
}
