"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BadgePercent, Clock3 } from "lucide-react";
import { useI18n } from "../i18n";
import {
  HOME_CLEARANCE_PRODUCTS_URL,
  HOME_RECENT_PRODUCTS_URL,
} from "../lib/homeDiscoveryProducts";
import { pickProductName } from "../lib/productTranslations";
import type { Product, ProductListResponse } from "../lib/products";

type FeedState = {
  products: Product[];
  loading: boolean;
  error: boolean;
};

const initialFeed: FeedState = { products: [], loading: true, error: false };

const currency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

async function loadFeed(url: string, signal: AbortSignal): Promise<Product[]> {
  const response = await fetch(url, { cache: "no-store", signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = (await response.json()) as ProductListResponse;
  return payload.data ?? [];
}

function DiscoverySection({
  title,
  subtitle,
  href,
  icon: Icon,
  state,
}: {
  title: string;
  subtitle: string;
  href: string;
  icon: typeof Clock3;
  state: FeedState;
}) {
  const { t, locale } = useI18n();

  return (
    <section className="home-discovery-section" aria-label={title}>
      <div className="home-discovery-heading">
        <div>
          <span><Icon className="h-4 w-4" />{subtitle}</span>
          <h2>{title}</h2>
        </div>
        <Link href={href}>{t("home.viewAll")}<ArrowRight className="h-4 w-4" /></Link>
      </div>

      {state.loading ? (
        <div className="home-discovery-grid" aria-label={t("home.loadingListings")}>
          {[0, 1, 2, 3].map((item) => <div key={item} className="home-discovery-skeleton" />)}
        </div>
      ) : state.products.length > 0 ? (
        <div className="home-discovery-grid">
          {state.products.map((product) => {
            const name = pickProductName(product.name, product.nameTranslations, locale);
            return (
              <Link key={product.id} href={`/product/${product.id}`} className="home-discovery-card">
                <span className="home-discovery-image">
                  <Image
                    src={product.imageUrl || "/images/Bike_0.jpg"}
                    alt={name}
                    fill
                    sizes="(max-width: 640px) 76vw, (max-width: 1024px) 44vw, 22vw"
                  />
                  {product.isClearance && <em>{t("clearance.badge")}</em>}
                </span>
                <span className="home-discovery-copy">
                  <strong>{name}</strong>
                  <span>
                    <b>{product.isClearance && product.clearancePrice === 0 ? t("clearance.free") : currency(product.price)}</b>
                    {product.originalPrice !== undefined && product.originalPrice > product.price && (
                      <del>{currency(product.originalPrice)}</del>
                    )}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="home-discovery-empty">
          <p>{state.error ? t("home.listingsUnavailable") : t("home.noListings")}</p>
          <Link href="/overview">{t("home.browseDeals")}<ArrowRight className="h-4 w-4" /></Link>
        </div>
      )}
    </section>
  );
}

export default function HomeDiscoverySections() {
  const { t } = useI18n();
  const [recent, setRecent] = useState<FeedState>(initialFeed);
  const [clearance, setClearance] = useState<FeedState>(initialFeed);

  useEffect(() => {
    const controller = new AbortController();
    const update = (
      url: string,
      setter: (state: FeedState) => void
    ) => {
      loadFeed(url, controller.signal)
        .then((products) => setter({ products, loading: false, error: false }))
        .catch((error: Error) => {
          if (error.name !== "AbortError") setter({ products: [], loading: false, error: true });
        });
    };

    update(HOME_RECENT_PRODUCTS_URL, setRecent);
    update(HOME_CLEARANCE_PRODUCTS_URL, setClearance);
    return () => controller.abort();
  }, []);

  return (
    <div className="home-discovery-layout">
      <DiscoverySection
        title={t("home.recentListings")}
        subtitle={t("home.recentListingsSubtitle")}
        href="/overview"
        icon={Clock3}
        state={recent}
      />
      <DiscoverySection
        title={t("home.clearanceCorner")}
        subtitle={t("home.clearanceCornerSubtitle")}
        href="/overview?clearance=1"
        icon={BadgePercent}
        state={clearance}
      />
    </div>
  );
}
