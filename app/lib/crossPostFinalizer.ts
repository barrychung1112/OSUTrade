import type {
  CrossPostCopy,
  CrossPostPlatform,
} from "./crossPostCopy";

export type PublishedCrossPostProduct = {
  clientId: string;
  productId: string;
  name: string;
  productUrl: string;
};

const linkHeadings: Record<CrossPostPlatform, string> = {
  facebook: "OSUTrade listings",
  craigslist: "OSUTrade listings",
  line: "OSUTrade 商品連結",
  wechat: "OSUTrade 商品链接",
  discord: "OSUTrade listings",
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export function mergePublishedCrossPostProducts(
  current: PublishedCrossPostProduct[],
  incoming: PublishedCrossPostProduct[]
) {
  const result: PublishedCrossPostProduct[] = [];
  const seen = new Set<string>();

  for (const product of [...current, ...incoming]) {
    const productId = clean(product.productId);
    const productUrl = clean(product.productUrl);
    if (!productId || !productUrl || seen.has(productId)) continue;
    seen.add(productId);
    result.push({
      clientId: clean(product.clientId),
      productId,
      name: clean(product.name) || productId,
      productUrl,
    });
  }

  return result;
}

export function buildManagedLinkSection(
  platform: CrossPostPlatform,
  products: PublishedCrossPostProduct[]
) {
  const uniqueProducts = mergePublishedCrossPostProducts([], products);
  if (uniqueProducts.length === 0) return "";

  return [
    linkHeadings[platform],
    ...uniqueProducts.map(
      (product) => `- ${product.name}: ${product.productUrl}`
    ),
  ].join("\n");
}

export function composeCrossPostClipboardText(
  copy: CrossPostCopy,
  products: PublishedCrossPostProduct[]
) {
  const linkSection = buildManagedLinkSection(copy.platform, products);
  return [clean(copy.title), clean(copy.body), linkSection]
    .filter(Boolean)
    .join("\n\n");
}
