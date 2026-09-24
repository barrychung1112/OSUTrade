// components/ProductCard.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, Text, Heading, Button } from "@radix-ui/themes";
import { MagnifyingGlassIcon, PlusIcon } from "@radix-ui/react-icons";
import { Heart } from "lucide-react";
import { useI18n } from "../i18n";
import { useFavorites } from "./FavoriteProvider";
import { shouldBypassProductImageOptimization } from "../lib/productImageOptimization";
import {
  productPath,
  publicLocaleFromClientLocale,
} from "../lib/publicLocale";
import { buildSellerProfileHref } from "../lib/sellerProfileReturn";
import type { ProductNameTranslations } from "../lib/productTranslations";

interface ProductCardProps {
  productId: string | number;
  name: string;
  displayName?: string;
  nameTranslations?: ProductNameTranslations | null;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  clearancePrice?: 0 | 1 | null;
  isClearance?: boolean;
  imageUrl: string;
  category?: string | null;
  quantity?: number | null;
  sellerId?: string | null;
  returnTo?: string;
}

const currency = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function ProductCard({
  productId,
  name,
  displayName,
  nameTranslations,
  price,
  originalPrice,
  discountPercent = 0,
  clearancePrice = null,
  isClearance = false,
  imageUrl,
  category,
  quantity,
  sellerId,
  returnTo,
}: ProductCardProps) {
  const { t, locale } = useI18n();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [adding, setAdding] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  async function addToCart() {
    setAdding(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: productId,
          name,
          nameTranslations,
          price,
          imageUrl,
          availableQuantity: quantity ?? 1,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to add item");
      }
      setFeedback({
        tone: "success",
        message: t("product.added"),
      });
    } catch {
      setFeedback({
        tone: "error",
        message: t("product.addError"),
      });
    } finally {
      setAdding(false);
    }
  }

  const categoryLabel = t(`common.category.${category || "general"}` as any);
  const localizedProductPath = productPath(
    publicLocaleFromClientLocale(locale),
    productId
  );
  const productHref = returnTo
    ? `${localizedProductPath}?returnTo=${encodeURIComponent(returnTo)}`
    : localizedProductPath;
  const sellerHref = sellerId
    ? buildSellerProfileHref(sellerId, returnTo)
    : null;
  const savedAsFavorite = isFavorite(productId);

  function saveMarketplaceScroll() {
    if (!returnTo) return;
    window.sessionStorage.setItem(
      `marketplace-scroll:${returnTo}`,
      String(window.scrollY)
    );
  }

  return (
    <Card className="app-card group relative flex min-h-[430px] flex-col overflow-hidden p-0 transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
      <Link
        href={productHref}
        prefetch={false}
        onClick={saveMarketplaceScroll}
        className="relative block aspect-[4/3] w-full bg-gray-100"
      >
        <Image
          src={imageUrl}
          alt={displayName || name}
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
          unoptimized={shouldBypassProductImageOptimization(imageUrl)}
          className="object-cover transition duration-300 group-hover:scale-[1.03]"
        />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-gray-800 shadow-sm">
          {t("product.stock", { quantity: quantity ?? 1 })}
        </span>
        <span className="absolute bottom-3 left-3 rounded-full bg-[#d73f09]/95 px-2.5 py-1 text-xs font-semibold capitalize text-white shadow-sm">
          {categoryLabel}
        </span>
      </Link>
      <button
        type="button"
        aria-label={savedAsFavorite ? t("favorites.remove") : t("favorites.save")}
        aria-pressed={savedAsFavorite}
        title={savedAsFavorite ? t("favorites.remove") : t("favorites.save")}
        onClick={() => void toggleFavorite(productId)}
        className={`absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d73f09] focus-visible:ring-offset-2 ${
          savedAsFavorite
            ? "border-[#d73f09] bg-[#d73f09] text-white"
            : "border-white/80 bg-white/95 text-gray-700 hover:border-orange-200 hover:text-[#d73f09]"
        }`}
      >
        <Heart
          aria-hidden="true"
          className="h-5 w-5"
          fill={savedAsFavorite ? "currentColor" : "none"}
        />
      </button>
      <div className="flex flex-1 flex-col p-4">
        <Link
          href={productHref}
          prefetch={false}
          onClick={saveMarketplaceScroll}
          className="min-w-0"
        >
          <Heading as="h2" size="4" weight="bold" className="line-clamp-2 min-h-[48px] text-gray-950 transition hover:text-[#d73f09]">
            {displayName || name}
          </Heading>
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Text size="5" weight="bold" className="text-[#d73f09]">
            {isClearance && clearancePrice === 0 ? t("clearance.free") : currency(price)}
          </Text>
          {isClearance && originalPrice !== undefined && (
            <>
              <span className="text-sm text-gray-500 line-through">
                {currency(originalPrice)}
              </span>
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800">
                {t("clearance.badge")}
              </span>
            </>
          )}
          {!isClearance && discountPercent > 0 && originalPrice !== undefined && (
            <>
              <span className="text-sm text-gray-500 line-through">
                {currency(originalPrice)}
              </span>
              <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-bold text-red-700">
                {discountPercent}% OFF
              </span>
            </>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700">
          <span className="font-medium">{t("product.availability")}</span>
          <span className="text-right">{t("product.stock", { quantity: quantity ?? 1 })}</span>
        </div>

        {sellerHref ? (
          <Link
            href={sellerHref}
            className="mt-3 inline-flex w-fit text-sm font-medium text-gray-700 underline-offset-4 transition hover:text-[#d73f09] hover:underline"
          >
            {t("product.moreFromSeller")}
          </Link>
        ) : null}

        <div className="mt-auto grid gap-2 pt-4">
          <Link
            href={productHref}
            prefetch={false}
            onClick={saveMarketplaceScroll}
            className="app-action-secondary w-full"
          >
            <MagnifyingGlassIcon /> {t("product.details")}
          </Link>
          <Button
            size="3"
            highContrast
            className="flex h-11 w-full items-center justify-center gap-2"
            onClick={addToCart}
            disabled={adding}
          >
            <PlusIcon /> <span>{adding ? t("product.adding") : t("product.addToCart")}</span>
          </Button>
        </div>

        <p
          className={`mt-3 min-h-5 text-sm ${
            feedback?.tone === "error" ? "text-red-600" : "text-green-700"
          }`}
          aria-live="polite"
        >
          {feedback?.message}
        </p>
        {feedback?.tone === "success" && (
          <Link
            href="/cart"
            className="inline-flex text-sm font-medium text-[#d73f09] underline-offset-4 hover:underline"
          >
            {t("product.viewCart")}
          </Link>
        )}
      </div>
    </Card>
  );
}
