"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heading, Theme } from "@radix-ui/themes";
import { ArrowLeft } from "lucide-react";
import Header from "../../components/Header";
import ProductCard from "../../components/ProductCard";
import EmptyState from "../../components/EmptyState";
import { useI18n } from "../../i18n";
import { pickProductName } from "../../lib/productTranslations";
import type { Product } from "../../lib/products";

type SellerProfileResponse = {
  seller: { id: string; name: string };
  data: Product[];
};

type SellerProfileState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error" }
  | { status: "ready"; profile: SellerProfileResponse };

export default function SellerProfileClient({
  sellerId,
  backHref = "/overview",
}: {
  sellerId: string;
  backHref?: string;
}) {
  const { t, locale } = useI18n();
  const [state, setState] = useState<SellerProfileState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    async function loadSeller() {
      setState({ status: "loading" });

      try {
        const response = await fetch(`/api/sellers/${encodeURIComponent(sellerId)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.status === 404) {
          setState({ status: "not-found" });
          return;
        }
        if (!response.ok) {
          throw new Error(`Failed to load seller: HTTP ${response.status}`);
        }

        const profile = (await response.json()) as SellerProfileResponse;
        setState({ status: "ready", profile });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({ status: "error" });
      }
    }

    void loadSeller();

    return () => controller.abort();
  }, [sellerId]);

  const title =
    state.status === "ready"
      ? t("sellerProfile.title", { name: state.profile.seller.name })
      : t("product.seller");

  return (
    <Theme appearance="light" accentColor="orange" grayColor="sand" radius="large">
      <Header />
      <main className="app-page">
        <div className="app-container">
          <section className="app-hero flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="app-eyebrow">{t("product.seller")}</p>
              <Heading as="h1" size="8" className="app-title">
                {title}
              </Heading>
              {state.status === "ready" ? (
                <p className="app-subtitle">{t("sellerProfile.subtitle")}</p>
              ) : null}
            </div>
            <Link href={backHref} className="app-action-secondary w-fit">
              <ArrowLeft className="h-4 w-4" />
              {t("sellerProfile.backToMarketplace")}
            </Link>
          </section>

          {state.status === "loading" ? (
            <div className="rounded-lg border border-dashed border-orange-200 bg-white/90 px-6 py-12 text-center text-gray-600 shadow-sm">
              {t("marketplace.loadingListings")}
            </div>
          ) : null}

          {state.status === "not-found" || state.status === "error" ? (
            <EmptyState
              title={
                state.status === "not-found"
                  ? t("sellerProfile.notFound")
                  : t("sellerProfile.loadError")
              }
              body={t("sellerProfile.backToMarketplace")}
              action={
                <Link href={backHref} className="app-action-primary">
                  <ArrowLeft className="h-4 w-4" />
                  {t("sellerProfile.backToMarketplace")}
                </Link>
              }
            />
          ) : null}

          {state.status === "ready" && state.profile.data.length === 0 ? (
            <EmptyState
              title={t("sellerProfile.noListings")}
              body={t("sellerProfile.subtitle")}
              action={
                <Link href={backHref} className="app-action-secondary">
                  <ArrowLeft className="h-4 w-4" />
                  {t("sellerProfile.backToMarketplace")}
                </Link>
              }
            />
          ) : null}

          {state.status === "ready" && state.profile.data.length > 0 ? (
            <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {state.profile.data.map((product) => (
                <ProductCard
                  key={product.id}
                  productId={product.id}
                  name={product.name}
                  displayName={pickProductName(
                    product.name,
                    product.nameTranslations,
                    locale
                  )}
                  nameTranslations={product.nameTranslations}
                  price={product.price}
                  originalPrice={product.originalPrice}
                  discountPercent={product.discountPercent}
                  clearancePrice={product.clearancePrice}
                  isClearance={product.isClearance}
                  imageUrl={
                    product.imageUrl ||
                    "https://placehold.co/800x600/f9fafb/d73f09?text=OSUTrade"
                  }
                  category={product.category}
                  quantity={product.quantity}
                  sellerId={product.sellerId}
                  returnTo={backHref}
                />
              ))}
            </section>
          ) : null}
        </div>
      </main>
    </Theme>
  );
}
