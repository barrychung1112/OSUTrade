"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BadgePercent } from "lucide-react";
import { useI18n } from "../i18n";
import { HOME_SALE_PRODUCTS_URL } from "../lib/homeSaleProducts";
import { pickProductName } from "../lib/productTranslations";
import type { ProductListResponse } from "../lib/products";

type Listing = ProductListResponse["data"][number];

const currency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

export default function ProductListCard() {
  const { t, locale } = useI18n();
  const reduceMotion = useReducedMotion();
  const [products, setProducts] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSaleListings() {
      try {
        setLoading(true);
        setError(false);
        const response = await fetch(HOME_SALE_PRODUCTS_URL, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as ProductListResponse;
        setProducts(payload.data ?? []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadSaleListings();
    return () => controller.abort();
  }, []);

  return (
    <section className="home-sale-section" aria-labelledby="sale-title">
      <div className="home-section-heading home-section-heading-row">
        <div>
          <p>{t("home.saleSubtitle")}</p>
          <h2 id="sale-title">{t("home.onSale")}</h2>
        </div>
        <Link href="/overview?sale=1">
          {t("home.viewAll")} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {loading ? (
        <div className="home-sale-grid" aria-label={t("home.loadingListings")}>
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="home-sale-skeleton" />
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="home-sale-grid">
          {products.map((product, index) => (
            <motion.article
              key={product.id}
              initial={false}
              transition={{ duration: 0.2, delay: reduceMotion ? 0 : index * 0.03 }}
              whileHover={reduceMotion ? undefined : { y: -5 }}
              className="home-sale-card"
            >
              <Link href={`/product/${product.id}`} className="home-sale-image">
                <Image
                  src={product.imageUrl || "/images/Bike_0.jpg"}
                  alt={pickProductName(product.name, product.nameTranslations, locale)}
                  fill
                  sizes="(max-width: 640px) 86vw, (max-width: 1024px) 44vw, 24vw"
                />
                <span className="home-sale-badge">
                  <BadgePercent className="h-3.5 w-3.5" />
                  {product.discountPercent}% OFF
                </span>
              </Link>
              <div className="home-sale-content">
                <Link href={`/product/${product.id}`}>
                  <h3>{pickProductName(product.name, product.nameTranslations, locale)}</h3>
                </Link>
                <div className="home-sale-price">
                  <strong>{currency(product.price)}</strong>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span>{currency(product.originalPrice)}</span>
                  )}
                </div>
                <p>{t("product.stock", { quantity: product.quantity ?? 1 })}</p>
              </div>
            </motion.article>
          ))}
        </div>
      ) : (
        <div className="home-sale-empty">
          <BadgePercent className="h-6 w-6" />
          <div>
            <strong>{error ? t("home.listingsUnavailable") : t("home.noSaleTitle")}</strong>
            <p>{t("home.noSaleBody")}</p>
          </div>
        </div>
      )}
    </section>
  );
}
