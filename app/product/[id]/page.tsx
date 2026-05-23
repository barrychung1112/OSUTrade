"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, ShoppingCart, Store } from "lucide-react";
import { fetchProduct, type Product } from "@/app/lib/products";
import { useI18n } from "@/app/i18n";
import Header from "@/app/components/Header";

const fallbackImage = "https://placehold.co/1000x750/f9fafb/d73f09?text=OSUTrade";

type Feedback = {
  tone: "success" | "error";
  message: string;
};

export default function ProductDetailPage() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>(fallbackImage);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    if (!id) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setFeedback(null);

    fetchProduct(id, controller.signal)
      .then((data) => {
        setProduct(data);
        setSelectedImage(data.imageUrl || fallbackImage);
      })
      .catch((err: any) => {
        if (err?.name !== "AbortError") {
          setError(err instanceof Error ? err.message : "Failed to load item.");
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [id]);

  const images = useMemo(
    () => [product?.imageUrl || fallbackImage].filter(Boolean) as string[],
    [product?.imageUrl]
  );

  async function addToCart() {
    if (!product) return;

    setAdding(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl || fallbackImage,
          category: product.category,
          availableQuantity: product.quantity ?? 1,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add item");
      }

      setFeedback({
        tone: "success",
        message: t("product.addedDetail"),
      });
    } catch {
      setFeedback({
        tone: "error",
        message: t("product.addErrorDetail"),
      });
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fff8f4] px-4 py-28">
        <Header />
        <div className="mx-auto max-w-5xl rounded-lg border border-orange-100 bg-white p-8 text-center text-gray-600 shadow-sm">
          {t("product.loading")}
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="min-h-screen bg-[#fff8f4] px-4 py-28">
        <Header />
        <div className="mx-auto max-w-3xl rounded-lg border border-red-100 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">{t("product.unavailable")}</h1>
          <p className="mt-2 text-gray-600">{error || t("product.notFound")}</p>
          <Link
            href="/overview"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#d73f09] px-4 py-2 text-sm font-semibold text-white"
          >
            <ArrowLeft size={16} /> {t("product.backMarketplace")}
          </Link>
        </div>
      </main>
    );
  }

  const status = product.status || "available";
  const category = product.category || "general";
  const availableQuantity = product.quantity ?? 1;
  const isAvailable = status === "available" && availableQuantity > 0;
  const categoryLabel = t(`common.category.${category}` as any);
  const statusLabel = t(`common.status.${status}` as any);

  return (
    <main className="min-h-screen bg-[#fff8f4] px-4 py-28">
      <Header />
      <div className="mx-auto max-w-6xl">
        <Link
          href="/overview"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#d73f09] hover:text-[#b43305]"
        >
          <ArrowLeft size={16} /> {t("product.backMarketplace")}
        </Link>

        <section className="grid gap-8 rounded-xl border border-orange-100 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)] md:p-6">
          <div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-100">
              <Image
                src={selectedImage}
                alt={product.name}
                fill
                sizes="(min-width: 768px) 55vw, 100vw"
                className="object-cover"
                priority
              />
            </div>

            <div className="mt-3 flex gap-2">
              {images.map((img, idx) => (
                <button
                  key={img}
                  onClick={() => setSelectedImage(img)}
                  className={`relative h-20 w-20 overflow-hidden rounded-md border-2 bg-gray-100 ${
                    selectedImage === img ? "border-[#d73f09]" : "border-transparent"
                  }`}
                  aria-label={`View image ${idx + 1}`}
                >
                  <Image
                    src={img}
                    alt={`${product.name} thumbnail ${idx + 1}`}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#d73f09]">
                {categoryLabel}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                  isAvailable
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {statusLabel}
              </span>
            </div>

            <h1 className="text-3xl font-bold text-gray-950">{product.name}</h1>
            <p className="mt-3 text-3xl font-bold text-[#d73f09]">
              ${Number(product.price).toLocaleString()}
            </p>
            <p className="mt-2 text-sm font-medium text-gray-600">
              {t("product.stock", { quantity: availableQuantity })}
            </p>

            <div className="mt-6 rounded-lg border border-orange-100 bg-orange-50/60 p-4">
              <p className="mb-3 text-sm font-semibold text-gray-900">
                {t("product.details")}
              </p>
              <dl className="grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-gray-500">{t("product.category")}</dt>
                  <dd className="mt-1 font-medium text-gray-900">{categoryLabel}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">{t("product.availability")}</dt>
                  <dd className="mt-1 font-medium text-gray-900">{statusLabel}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">{t("sell.quantity")}</dt>
                  <dd className="mt-1 font-medium text-gray-900">
                    {t("product.stock", { quantity: availableQuantity })}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-3 text-gray-800">
                <Store size={20} className="text-[#d73f09]" />
                <div>
                  <p className="font-semibold">{t("product.seller")}</p>
                  <p className="text-sm text-gray-600">
                    {t("product.contactAfterRequest")}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3 text-sm text-gray-600">
              <div className="flex gap-2">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600" />
                <p>{t("product.stepCart")}</p>
              </div>
              <div className="flex gap-2">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600" />
                <p>{t("product.stepSeller")}</p>
              </div>
            </div>

            <div className="mt-auto pt-8">
              <button
                onClick={addToCart}
                disabled={adding || !isAvailable}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#d73f09] px-5 py-3 font-semibold text-white transition hover:bg-[#b43305] disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                <ShoppingCart size={20} />
                {adding
                  ? t("product.adding")
                  : isAvailable
                    ? t("product.addToCart")
                    : t("product.statusUnavailable")}
              </button>

              {feedback && (
                <div
                  className={`mt-3 rounded-md px-3 py-2 text-sm ${
                    feedback.tone === "error"
                      ? "bg-red-50 text-red-700"
                      : "bg-green-50 text-green-700"
                  }`}
                  aria-live="polite"
                >
                  <p>{feedback.message}</p>
                  {feedback.tone === "success" && (
                    <Link
                      href="/cart"
                      className="mt-1 inline-flex font-medium underline underline-offset-4"
                    >
                      {t("product.viewCart")}
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
