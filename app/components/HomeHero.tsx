"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Plus, ShieldCheck } from "lucide-react";
import { useI18n } from "../i18n";
import { selectRandomHomeHeroProducts } from "../lib/homeHeroProducts";
import { pickProductName } from "../lib/productTranslations";
import { fetchProducts, type Product } from "../lib/products";

const fallbackTiles = [
  { imageUrl: "/images/DellMonitor_0.jpg" },
  { imageUrl: "/images/Bike_0.jpg" },
  { imageUrl: "/images/LED lamp_0.jpg" },
];

const tileClasses = [
  "home-product-tile-monitor",
  "home-product-tile-bike",
  "home-product-tile-lamp",
];

const tileMotion = [
  { initial: { opacity: 0, x: 32, rotate: 0 }, rotate: -4 },
  { initial: { opacity: 0, y: 28, rotate: 0 }, rotate: 5 },
  { initial: { opacity: 0, x: -18, y: 24 }, rotate: -2 },
];

export default function HomeHero({
  onSell,
  disabled,
}: {
  onSell: () => void;
  disabled: boolean;
}) {
  const { t, locale } = useI18n();
  const reduceMotion = useReducedMotion();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    fetchProducts({ limit: 100, signal: controller.signal })
      .then((payload) => {
        setProducts(selectRandomHomeHeroProducts(payload.data));
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

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

      <div className="home-product-scene">
        {(products.length > 0 ? products : fallbackTiles).map((product, index) => {
          const liveProduct = "id" in product ? product : null;
          const name = liveProduct
            ? pickProductName(
                liveProduct.name,
                liveProduct.nameTranslations,
                locale
              )
            : "";
          const tile = (
            <motion.div
              className={`home-product-tile ${tileClasses[index]}`}
              initial={reduceMotion ? false : tileMotion[index].initial}
              animate={{ opacity: 1, x: 0, y: 0, rotate: tileMotion[index].rotate }}
              transition={{ duration: 0.6, delay: reduceMotion ? 0 : 0.12 + index * 0.1 }}
              whileHover={reduceMotion ? undefined : { y: -6, rotate: 0 }}
            >
              <Image
                src={product.imageUrl || fallbackTiles[index].imageUrl}
                alt={name}
                fill
                sizes={index === 0 ? "360px" : index === 1 ? "280px" : "220px"}
                priority
              />
              {liveProduct && <span>${Number(liveProduct.price).toFixed(2)}</span>}
            </motion.div>
          );

          return liveProduct ? (
            <Link
              key={liveProduct.id}
              href={`/product/${liveProduct.id}`}
              aria-label={`${name}, $${Number(liveProduct.price).toFixed(2)}`}
            >
              {tile}
            </Link>
          ) : (
            <div key={product.imageUrl} aria-hidden="true">
              {tile}
            </div>
          );
        })}
      </div>

      <div className="home-hero-next" aria-hidden="true">
        <span>{t("home.liveMarket")}</span>
      </div>
    </section>
  );
}
