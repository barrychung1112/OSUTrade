import {
  crossPostPlatforms,
  platformLanguage,
  type CrossPostCopy,
  type CrossPostGenerationResult,
  type CrossPostPlatform,
} from "./crossPostCopy";
import type { PublishedCrossPostProduct } from "./crossPostFinalizer";
import {
  parseCrossPostPreviewItems,
  type CrossPostPreviewItem,
} from "./crossPostPreview";
import type { Product } from "./products";

type ManualListingFacts = {
  name: string;
  description: string;
  price: string | number;
  quantity: string | number;
  category: string;
  [key: string]: unknown;
};

export function buildManualCrossPostPreviewItem(
  values: ManualListingFacts
): CrossPostPreviewItem {
  const candidate = {
    clientId: "manual-1",
    name: values.name,
    description: values.description,
    price: Number(values.price),
    quantity: Number(values.quantity),
    category: values.category,
  };
  const parsed = parseCrossPostPreviewItems([candidate]);
  if (parsed.ok === false) throw new Error(parsed.message);
  return parsed.items[0];
}

function isValidCopy(value: unknown, platform: CrossPostPlatform) {
  if (!value || typeof value !== "object") return false;
  const copy = value as Record<string, unknown>;
  return (
    copy.platform === platform &&
    copy.language === platformLanguage[platform] &&
    typeof copy.title === "string" &&
    typeof copy.body === "string"
  );
}

export function parseCrossPostPreviewResponse(
  value: unknown
): CrossPostGenerationResult | null {
  if (!value || typeof value !== "object") return null;
  const result = value as Record<string, unknown>;
  if (result.source !== "ai" && result.source !== "fallback") return null;
  if (!Array.isArray(result.copies) || result.copies.length !== 5) return null;

  const byPlatform = new Map(
    result.copies.map((copy) => [
      (copy as Partial<CrossPostCopy>)?.platform,
      copy,
    ])
  );
  if (
    byPlatform.size !== crossPostPlatforms.length ||
    !crossPostPlatforms.every((platform) =>
      isValidCopy(byPlatform.get(platform), platform)
    )
  ) {
    return null;
  }

  return {
    source: result.source,
    copies: crossPostPlatforms.map(
      (platform) => byPlatform.get(platform) as CrossPostCopy
    ),
  };
}

export function buildPublishedCrossPostProduct(
  clientId: string,
  product: Product,
  origin: string
): PublishedCrossPostProduct {
  const productId = String(product.id);
  return {
    clientId,
    productId,
    name: product.name,
    productUrl: `${origin.replace(/\/$/, "")}/product/${encodeURIComponent(productId)}`,
  };
}
