// app/components/ProductListCard.tsx
"use client";

import { Card, Heading, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { pickProductName } from "../lib/productTranslations";
import type { ProductListResponse } from "../lib/products";

type Listing = ProductListResponse["data"][number];

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ProductListCard() {
  const { t, locale } = useI18n();
  const [products, setProducts] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadListings() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/products?limit=5&sort=asc", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = (await response.json()) as ProductListResponse;
        setProducts(payload.data ?? []);
        setTotal(payload.total ?? 0);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError(err instanceof Error ? err.message : "Failed to load listings.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadListings();
    return () => controller.abort();
  }, []);

  const subtitle = useMemo(() => {
    if (loading) return t("home.loadingListings");
    if (error) return t("home.listingsUnavailable");
    if (products.length === 0) return t("home.noListings");
    return t("home.listingsCount", { total });
  }, [error, loading, products.length, t, total]);

  return (
    <Card className="border border-orange-300 bg-white/70 p-4 shadow backdrop-blur-md transition-transform hover:scale-[1.02]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <Heading size="5">{t("home.onSale")}</Heading>
          <Text size="2" color="gray">
            {subtitle}
          </Text>
        </div>
        <Link href="/overview" className="text-sm font-semibold text-[#d73f09]">
          {t("home.viewAll")}
        </Link>
      </div>

      {products.length > 0 ? (
        <ul className="space-y-2 text-sm text-gray-700">
          {products.map((product) => (
            <li key={product.id}>
              <Link
                href={`/product/${product.id}`}
                className="flex min-w-0 items-center justify-between gap-3 rounded-md bg-orange-50 px-3 py-2 transition hover:bg-orange-100"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-gray-950">
                    {pickProductName(product.name, product.nameTranslations, locale)}
                  </span>
                  <span className="text-xs text-gray-600">
                    {product.quantity ?? 1} {t("home.unitsAvailable")}
                  </span>
                </span>
                <span className="shrink-0 font-semibold text-[#d73f09]">
                  {currency(product.price)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-md bg-orange-50 px-3 py-4 text-sm text-gray-700">
          {loading ? t("home.loadingListings") : t("home.noListingsHelp")}
        </div>
      )}
    </Card>
  );
}
