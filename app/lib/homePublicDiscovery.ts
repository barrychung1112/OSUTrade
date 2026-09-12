import { isClearanceDiscoveryProduct } from "./productClearance";
import type { Product } from "./products";

function newestFirst(left: Product, right: Product) {
  const timestamp = String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? ""));
  return timestamp || String(right.id).localeCompare(String(left.id));
}

export function getHomePublicDiscovery(products: Product[]) {
  const publicProducts = products
    .filter((product) => product.status === "available" && Number(product.quantity) > 0)
    .sort(newestFirst);

  return {
    recent: publicProducts.slice(0, 4),
    clearance: publicProducts.filter(isClearanceDiscoveryProduct).slice(0, 4),
  };
}
