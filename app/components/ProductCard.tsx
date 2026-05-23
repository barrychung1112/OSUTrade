// components/ProductCard.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, Text, Heading, Button } from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import { useI18n } from "../i18n";

interface ProductCardProps {
  productId: string | number;
  name: string;
  price: number;
  imageUrl: string;
  category?: string | null;
  quantity?: number | null;
}

export default function ProductCard({
  productId,
  name,
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
    <Card className="flex flex-col overflow-hidden border border-orange-200 bg-white/80 shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/product/${productId}`} className="relative block w-full h-52">
        <Image src={imageUrl} alt={name} fill className="object-cover" />
      </Link>
      <div className="flex flex-col justify-between p-4 flex-1">
        <Link href={`/product/${productId}`} className="mb-4 min-w-0">
          <Heading size="4" weight="bold" className="text-[#d73f09] truncate">
            {name}
          </Heading>
        </Link>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-[#d73f09]">
            {t(`common.category.${category || "general"}` as any)}
          </span>
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
            {t("product.stock", { quantity: quantity ?? 1 })}
          </span>
        </div>
        <div className="mt-auto flex justify-between items-center">
          <Button
            size="2"
            variant="outline"
            className="border-[#d73f09] text-[#d73f09] flex items-center gap-2"
            onClick={addToCart}
            disabled={adding}
          >
            <PlusIcon /> <span>{adding ? t("product.adding") : t("product.addToCart")}</span>
          </Button>
          <Text size="3" weight="medium" className="text-gray-700">
            ${price}
          </Text>
        </div>
        <p
          className={`mt-3 min-h-5 text-xs ${
            feedback?.tone === "error" ? "text-red-600" : "text-green-700"
          }`}
          aria-live="polite"
        >
          {feedback?.message}
        </p>
        {feedback?.tone === "success" && (
          <Link
            href="/cart"
            className="mt-1 inline-flex text-sm font-medium text-[#d73f09] underline-offset-4 hover:underline"
          >
            {t("product.viewCart")}
          </Link>
        )}
      </div>
    </Card>
  );
}
