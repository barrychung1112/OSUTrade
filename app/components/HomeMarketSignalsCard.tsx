"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Boxes, Clock3, Layers3, Sparkles } from "lucide-react";
import { useI18n } from "../i18n";
import { buildHomeMarketSignals } from "../lib/homeMarketSignals";
import type { ProductListResponse } from "../lib/products";

type Product = ProductListResponse["data"][number];

export default function HomeMarketSignalsCard() {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/products?limit=100&sort=desc", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<ProductListResponse>;
      })
      .then((payload) => {
        setProducts(payload.data ?? []);
        setTotal(payload.total ?? 0);
      })
      .catch((err) => {
        if ((err as Error).name !== "AbortError") setError(true);
      })
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, []);

  const signals = useMemo(() => buildHomeMarketSignals(products), [products]);
  const category = signals.popularCategory
    ? t(`common.category.${signals.popularCategory}` as any)
    : "--";
  const items = [
    { icon: Layers3, label: t("home.activeListings"), value: total || signals.activeListings },
    { icon: Boxes, label: t("home.availableItems"), value: signals.availableItems },
    { icon: Clock3, label: t("home.addedThisWeek"), value: signals.addedThisWeek },
    { icon: Sparkles, label: t("home.popularCategory"), value: category },
  ];

  return (
    <section className="home-signals" aria-labelledby="market-signals-title">
      <div className="home-section-heading">
        <p>
          {error
            ? t("home.marketSignalsUnavailable")
            : t("home.marketSignalsSubtitle")}
        </p>
        <h2 id="market-signals-title">{t("home.marketSignalsTitle")}</h2>
      </div>
      <div className="home-signal-grid">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={false}
              whileHover={reduceMotion ? undefined : { y: -3 }}
              transition={{ duration: 0.18, delay: reduceMotion ? 0 : index * 0.02 }}
              className="home-signal-item"
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
              <strong>{loading || error ? "--" : item.value}</strong>
            </motion.div>
          );
        })}
      </div>
      {signals.recentlyAddedName && (
        <p className="home-recent-item">
          {t("home.recentlyAdded", { item: signals.recentlyAddedName })}
        </p>
      )}
    </section>
  );
}
