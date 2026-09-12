"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Boxes, Clock3, Layers3, Sparkles } from "lucide-react";
import { useI18n } from "../i18n";
import { buildHomeMarketSignals } from "../lib/homeMarketSignals";
import type { Product } from "../lib/products";

export default function HomeMarketSignalsCard({
  products,
  error = false,
}: {
  products: Product[];
  error?: boolean;
}) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();

  const signals = useMemo(() => buildHomeMarketSignals(products), [products]);
  const category = signals.popularCategory
    ? t(`common.category.${signals.popularCategory}` as any)
    : "--";
  const items = [
    { icon: Layers3, label: t("home.activeListings"), value: signals.activeListings },
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
              <strong>{error ? "--" : item.value}</strong>
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
