import type { Metadata } from "next";

import type { Product } from "./products";

export const SITE_URL = new URL("https://osutrade.com");
export const DEFAULT_SHARE_IMAGE = "/images/DellMonitor_0.jpg";
export const DEFAULT_SHARE_DESCRIPTION =
  "Buy and sell useful campus goods with the OSU community.";

const DEFAULT_SHARE_TITLE = "OSUTrade | Campus Marketplace";
const DESCRIPTION_LIMIT = 160;

function formatPrice(price: number) {
  if (price === 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

function shareDescription(value?: string | null) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (!normalized) return DEFAULT_SHARE_DESCRIPTION;
  if (normalized.length <= DESCRIPTION_LIMIT) return normalized;
  return `${normalized.slice(0, DESCRIPTION_LIMIT - 1).trimEnd()}…`;
}

function firstProductImage(product: Product) {
  return (
    product.imageUrls?.find((url) => typeof url === "string" && url.trim()) ||
    product.imageUrl?.trim() ||
    DEFAULT_SHARE_IMAGE
  );
}

export function buildProductMetadata(product: Product | null): Metadata {
  if (!product) {
    return {
      title: DEFAULT_SHARE_TITLE,
      description: DEFAULT_SHARE_DESCRIPTION,
      alternates: { canonical: "/" },
      openGraph: {
        title: DEFAULT_SHARE_TITLE,
        description: DEFAULT_SHARE_DESCRIPTION,
        url: "/",
        siteName: "OSUTrade",
        type: "website",
        images: [{ url: DEFAULT_SHARE_IMAGE }],
      },
      twitter: {
        card: "summary_large_image",
        title: DEFAULT_SHARE_TITLE,
        description: DEFAULT_SHARE_DESCRIPTION,
        images: [DEFAULT_SHARE_IMAGE],
      },
    };
  }

  const title = `${product.name} · ${formatPrice(product.price)} | OSUTrade`;
  const description = shareDescription(product.description);
  const url = `/product/${encodeURIComponent(String(product.id))}`;
  const image = firstProductImage(product);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "OSUTrade",
      type: "website",
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
