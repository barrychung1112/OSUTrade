"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { useI18n } from "@/app/i18n";
import type { Product } from "@/app/lib/products";

const fallbackImage = "https://placehold.co/1000x750/f9fafb/d73f09?text=OSUTrade";

type Props = {
  product: Pick<
    Product,
    | "id"
    | "name"
    | "nameTranslations"
    | "price"
    | "imageUrl"
    | "category"
    | "quantity"
  >;
};

export default function ProductRequestActions({ product }: Props) {
  const { t } = useI18n();
  const [adding, setAdding] = useState(false);
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null);
  const available = (product.quantity ?? 0) > 0;

  async function addToCart() {
    setAdding(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: product.id,
          name: product.name,
          nameTranslations: product.nameTranslations,
          price: product.price,
          imageUrl: product.imageUrl || fallbackImage,
          category: product.category,
          availableQuantity: product.quantity ?? 1,
        }),
      });

      if (!response.ok) throw new Error("Failed to add item");
      setFeedback("success");
    } catch {
      setFeedback("error");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="mt-auto pt-8">
      <button
        type="button"
        onClick={addToCart}
        disabled={adding || !available}
        className="app-action-primary h-12 w-full"
      >
        <ShoppingCart size={20} />
        {adding
          ? t("product.adding")
          : available
            ? t("product.addToCart")
            : t("product.statusUnavailable")}
      </button>

      {feedback ? (
        <div
          className={`mt-3 rounded-md px-3 py-2 text-sm ${
            feedback === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
          }`}
          aria-live="polite"
        >
          <p>{t(feedback === "success" ? "product.addedDetail" : "product.addErrorDetail")}</p>
          {feedback === "success" ? (
            <Link href="/cart" className="mt-1 inline-flex font-medium underline underline-offset-4">
              {t("product.viewCart")}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
