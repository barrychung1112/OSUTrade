// components/ProductCard.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, Text, Heading, Button } from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import { useI18n } from "../i18n";
import type { ProductNameTranslations } from "../lib/productTranslations";

interface ProductCardProps {
  productId: string | number;
  name: string;
  displayName?: string;
  nameTranslations?: ProductNameTranslations | null;
  price: number;
  imageUrl: string;
  category?: string | null;
  quantity?: number | null;
}

const currency = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function ProductCard({
  productId,
  name,
  displayName,
  nameTranslations,
  price,
  imageUrl,
  category,
  quantity,
}: ProductCardProps) {
  const { t } = useI18n();
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

  return (
    <Card className="app-card flex min-h-[430px] flex-col overflow-hidden p-0 transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/product/${productId}`} className="relative block h-52 w-full bg-gray-100">
        <Image src={imageUrl} alt={displayName || name} fill className="object-cover" />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-gray-800 shadow-sm">
          {t("product.stock", { quantity: quantity ?? 1 })}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link href={`/product/${productId}`} className="min-w-0">
          <Heading size="4" weight="bold" className="line-clamp-2 min-h-[48px] text-gray-950">
            {displayName || name}
          </Heading>
        </Link>

        <Text size="5" weight="bold" className="mt-3 block text-[#d73f09]">
          {currency(price)}
        </Text>

        <div className="mt-4 grid gap-2 text-sm text-gray-700">
          <div className="flex items-center justify-between gap-3 rounded-md bg-orange-50/80 px-3 py-2">
            <span className="font-medium">{t("marketplace.category")}</span>
            <span className="text-right capitalize">
              {t(`common.category.${category || "general"}` as any)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-md bg-gray-50 px-3 py-2">
            <span className="font-medium">{t("product.availability")}</span>
            <span className="text-right">
              {t("product.stock", { quantity: quantity ?? 1 })}
            </span>
          </div>
        </div>

        <div className="mt-auto pt-4">
          <Button
            size="3"
            highContrast
            className="flex w-full items-center justify-center gap-2"
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
