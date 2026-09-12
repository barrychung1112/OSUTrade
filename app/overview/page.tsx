import MarketplaceClient from "./MarketplaceClient";
import { listPublicProducts } from "../lib/publicProduct";
import {
  getPublicProductList,
  parsePublicProductListParams,
} from "../lib/publicProductList";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProductListPage({ searchParams }: PageProps) {
  const params = parsePublicProductListParams(await searchParams);
  const products = await listPublicProducts();
  const initialResponse = getPublicProductList(products, params);

  return <MarketplaceClient initialParams={params} initialResponse={initialResponse} />;
}
