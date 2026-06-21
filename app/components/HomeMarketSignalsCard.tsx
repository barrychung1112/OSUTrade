"use client";

import { ClockIcon, HeartIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Card, Heading, Text } from "@radix-ui/themes";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { buildHomeMarketSignals } from "../lib/homeMarketSignals";
import type { ProductListResponse } from "../lib/products";

type Product = ProductListResponse["data"][number];

function formatCategory(category: string | null) {
  if (!category) return "--";
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export default function HomeMarketSignalsCard() {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSignals() {
      try {
        setLoading(true);
        setError(false);
        const response = await fetch("/api/products?limit=100&sort=desc", {
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
          setError(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadSignals();
    return () => controller.abort();
  }, []);

  const signals = useMemo(
    () => buildHomeMarketSignals(products),
    [products]
  );

  const activeListings = total || signals.activeListings;

  return (
    <Card className="app-card p-4 backdrop-blur">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[#d73f09]">
          <MagnifyingGlassIcon />
        </div>
        <div>
          <Heading size="5">{t("home.marketSignalsTitle")}</Heading>
          <Text size="2" color="gray">
            {error
              ? t("home.marketSignalsUnavailable")
              : t("home.marketSignalsSubtitle")}
          </Text>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-orange-100 bg-orange-50/70 p-3">
          <Text size="1" weight="bold" className="uppercase tracking-wide text-[#9a3412]">
            {t("home.activeListings")}
          </Text>
          <Heading size="6" className="mt-1 text-gray-950">
            {loading ? "--" : activeListings}
          </Heading>
        </div>
        <div className="rounded-md border border-orange-100 bg-white p-3">
          <Text size="1" weight="bold" className="uppercase tracking-wide text-gray-500">
            {t("home.availableItems")}
          </Text>
          <Heading size="6" className="mt-1 text-gray-950">
            {loading ? "--" : signals.availableItems}
          </Heading>
        </div>
        <div className="rounded-md border border-orange-100 bg-white p-3">
          <div className="mb-1 flex items-center gap-2 text-[#d73f09]">
            <ClockIcon />
            <Text size="1" weight="bold" className="uppercase tracking-wide">
              {t("home.addedThisWeek")}
            </Text>
          </div>
          <Heading size="6" className="text-gray-950">
            {loading ? "--" : signals.addedThisWeek}
          </Heading>
        </div>
        <div className="rounded-md border border-orange-100 bg-white p-3">
          <div className="mb-1 flex items-center gap-2 text-[#d73f09]">
            <HeartIcon />
            <Text size="1" weight="bold" className="uppercase tracking-wide">
              {t("home.popularCategory")}
            </Text>
          </div>
          <Heading size="4" className="truncate text-gray-950">
            {loading ? "--" : formatCategory(signals.popularCategory)}
          </Heading>
        </div>
      </div>

      <div className="mt-3 rounded-md border border-orange-100 bg-orange-50/60 px-3 py-2">
        <Text size="2" className="text-gray-700">
          {loading || !signals.recentlyAddedName
            ? t("home.recentlyAddedEmpty")
            : t("home.recentlyAdded", { item: signals.recentlyAddedName })}
        </Text>
      </div>
    </Card>
  );
}
