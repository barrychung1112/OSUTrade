"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgePercent, Clock3 } from "lucide-react";
import { useI18n } from "../i18n";
import { pickProductName } from "../lib/productTranslations";
import { productPath } from "../lib/publicLocale";
import { getHomePublicDiscovery } from "../lib/homePublicDiscovery";
import type { Product } from "../lib/products";

const currency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

function DiscoverySection({
  title,
  subtitle,
  href,
  icon: Icon,
  products,
  error,
}: {
  title: string;
  subtitle: string;
  href: string;
  icon: typeof Clock3;
  products: Product[];
  error: boolean;
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

      {products.length > 0 ? (
        <div className="home-discovery-grid">
          {products.map((product) => {
            const name = pickProductName(product.name, product.nameTranslations, locale);
            return (
              <Link key={product.id} href={productPath("en", product.id)} className="home-discovery-card">
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
          <p>{error ? t("home.listingsUnavailable") : t("home.noListings")}</p>
          <Link href="/overview">{t("home.browseDeals")}<ArrowRight className="h-4 w-4" /></Link>
        </div>
      )}
    </section>
  );
}

export default function HomeDiscoverySections({
  products,
  error = false,
}: {
  products: Product[];
  error?: boolean;
}) {
  const { t } = useI18n();
  const discovery = getHomePublicDiscovery(products);

  return (
    <div className="home-discovery-layout">
      <DiscoverySection
        title={t("home.recentListings")}
        subtitle={t("home.recentListingsSubtitle")}
        href="/overview"
        icon={Clock3}
        products={discovery.recent}
        error={error}
      />
      <DiscoverySection
        title={t("home.clearanceCorner")}
        subtitle={t("home.clearanceCornerSubtitle")}
        href="/overview?clearance=1"
        icon={BadgePercent}
        products={discovery.clearance}
        error={error}
      />
    </div>
  );
}
