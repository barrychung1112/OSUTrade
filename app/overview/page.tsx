import type { Metadata } from "next";
import MarketplaceClient from "./MarketplaceClient";
import { listLivePublicProducts } from "../lib/publicProduct";
import {
  getPublicProductList,
  parsePublicProductListParams,
} from "../lib/publicProductList";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;

  return {
    title: "Browse the OSUTrade Marketplace | Oregon State Students",
    description:
      "Browse marketplace listings from Oregon State University students in Corvallis on OSUTrade.",
    alternates: { canonical: "/overview" },
    ...(Object.keys(params).length > 0
      ? { robots: { index: false, follow: true } }
      : {}),
  };
}

export default async function ProductListPage({ searchParams }: PageProps) {
  const params = parsePublicProductListParams(await searchParams);
  const products = await listLivePublicProducts();
  const initialResponse = getPublicProductList(products, params);

  return <MarketplaceClient initialParams={params} initialResponse={initialResponse} />;
}
