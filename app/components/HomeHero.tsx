"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Plus, ShieldCheck } from "lucide-react";
import { useI18n } from "../i18n";

export default function HomeHero({
  onSell,
  disabled,
}: {
  onSell: () => void;
  disabled: boolean;
}) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();

  const reveal = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.45, ease: "easeOut" as const },
      };

  return (
    <section className="home-hero-scene" aria-labelledby="home-title">
      <div className="home-hero-grid" aria-hidden="true" />
      <div className="home-hero-copy">
        <motion.p {...reveal} className="home-hero-kicker">
          {t("home.heroKicker")}
        </motion.p>
        <motion.h1
          {...reveal}
          transition={{ duration: 0.45, delay: reduceMotion ? 0 : 0.06 }}
          id="home-title"
          className="home-hero-title"
        >
          OSUTrade
        </motion.h1>
        <motion.p
          {...reveal}
          transition={{ duration: 0.45, delay: reduceMotion ? 0 : 0.12 }}
          className="home-hero-description"
        >
          {t("home.description")}
        </motion.p>

        <motion.div
          {...reveal}
          transition={{ duration: 0.45, delay: reduceMotion ? 0 : 0.18 }}
          className="home-hero-actions"
        >
          <Link href="/overview" className="home-hero-primary">
            {t("home.browseDeals")}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={onSell}
            disabled={disabled}
            className="home-hero-secondary"
          >
            <Plus className="h-4 w-4" />
            {t("marketplace.listItem")}
          </button>
        </motion.div>

        <motion.div
          {...reveal}
          transition={{ duration: 0.45, delay: reduceMotion ? 0 : 0.24 }}
          className="home-hero-trust"
        >
          <ShieldCheck className="h-4 w-4" />
          <span>{t("home.safetyNote")}</span>
        </motion.div>
      </div>

      <div className="home-product-scene" aria-hidden="true">
        <motion.div
          className="home-product-tile home-product-tile-monitor"
          initial={reduceMotion ? false : { opacity: 0, x: 32, rotate: 0 }}
          animate={{ opacity: 1, x: 0, rotate: -4 }}
          transition={{ duration: 0.6, delay: reduceMotion ? 0 : 0.12 }}
          whileHover={reduceMotion ? undefined : { y: -6, rotate: -2 }}
        >
          <Image src="/images/DellMonitor_0.jpg" alt="" fill sizes="360px" priority />
          <span>$30</span>
        </motion.div>
        <motion.div
          className="home-product-tile home-product-tile-bike"
          initial={reduceMotion ? false : { opacity: 0, y: 28, rotate: 0 }}
          animate={{ opacity: 1, y: 0, rotate: 5 }}
          transition={{ duration: 0.6, delay: reduceMotion ? 0 : 0.22 }}
          whileHover={reduceMotion ? undefined : { y: -8, rotate: 3 }}
        >
          <Image src="/images/Bike_0.jpg" alt="" fill sizes="280px" priority />
          <span>$85</span>
        </motion.div>
        <motion.div
          className="home-product-tile home-product-tile-lamp"
          initial={reduceMotion ? false : { opacity: 0, x: -18, y: 24 }}
          animate={{ opacity: 1, x: 0, y: 0, rotate: -2 }}
          transition={{ duration: 0.6, delay: reduceMotion ? 0 : 0.32 }}
          whileHover={reduceMotion ? undefined : { y: -6, rotate: 0 }}
        >
          <Image src="/images/LED lamp_0.jpg" alt="" fill sizes="220px" priority />
          <span>$18</span>
        </motion.div>
      </div>

      <div className="home-hero-next" aria-hidden="true">
        <span>{t("home.liveMarket")}</span>
      </div>
    </section>
  );
}
