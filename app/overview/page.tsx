"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heading, Theme } from "@radix-ui/themes";
import {
  Cross2Icon,
  MagnifyingGlassIcon,
  PlusIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import { ChevronLeft, ChevronRight, BadgePercent, Sparkles } from "lucide-react";
import Header from "../components/Header";
import EmptyState from "../components/EmptyState";
import ProductCard from "../components/ProductCard";
import { useProducts } from "../hook/useProducts";
import { useI18n } from "../i18n";
import {
  buildMarketplaceUrl,
  readMarketplaceUrlState,
  resetMarketplacePage,
  type MarketplaceUrlState,
} from "../lib/marketplaceUrlState";
import { pickProductName } from "../lib/productTranslations";

const categories = ["all", "electronics", "clothing", "books", "home", "general"];
const pageSize = 20;

type NavigateOptions = {
  replace?: boolean;
  resetScroll?: boolean;
};

function MarketplaceContent({
  urlState,
  navigate,
}: {
  urlState: MarketplaceUrlState;
  navigate: (state: MarketplaceUrlState, options?: NavigateOptions) => void;
}) {
  const { t, locale } = useI18n();
  const marketplaceUrl = buildMarketplaceUrl(urlState);
  const restoredPathRef = useRef<string | null>(null);
  const {
    products,
    loading,
    error,
    total,
    page,
    limit,
    refetch,
    hasMore,
  } = useProducts({
    page: urlState.page,
    limit: pageSize,
    name: urlState.name,
    category: urlState.category === "all" ? undefined : urlState.category,
    sort: urlState.sort === "asc" || urlState.sort === "desc" ? urlState.sort : undefined,
    discounted: urlState.saleOnly,
    clearance: urlState.clearanceOnly,
  });
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const hasFilters =
    urlState.name.trim() ||
    urlState.category !== "all" ||
    urlState.sort !== "none" ||
    urlState.saleOnly ||
    urlState.clearanceOnly;

  useEffect(() => {
    const storageKey = `marketplace-scroll:${marketplaceUrl}`;
    return () => {
      const currentScrollY = window.scrollY;
      const savedScrollY = window.sessionStorage.getItem(storageKey);
      if (currentScrollY > 0 || savedScrollY === null) {
        window.sessionStorage.setItem(storageKey, String(currentScrollY));
      }
    };
  }, [marketplaceUrl]);

  useEffect(() => {
    if (loading || restoredPathRef.current === marketplaceUrl) return;

    restoredPathRef.current = marketplaceUrl;
    const savedScrollY = Number(
      window.sessionStorage.getItem(`marketplace-scroll:${marketplaceUrl}`)
    );
    if (!Number.isFinite(savedScrollY) || savedScrollY <= 0) return;

    const timer = window.setTimeout(() => window.scrollTo(0, savedScrollY), 120);
    return () => window.clearTimeout(timer);
  }, [loading, marketplaceUrl, products.length]);

  function updateFilters(next: Partial<MarketplaceUrlState>, replace = false) {
    navigate(resetMarketplacePage({ ...urlState, ...next }), { replace });
  }

  function clearFilters() {
    navigate({
      page: 1,
      name: "",
      category: "all",
      sort: "none",
      saleOnly: false,
      clearanceOnly: false,
    });
  }

  function changePage(nextPage: number) {
    if (nextPage < 1 || nextPage > pageCount) return;
    navigate({ ...urlState, page: nextPage });
  }

  return (
    <main className="app-page">
      <div className="app-container">
        <section className="app-hero flex flex-col gap-5">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="app-eyebrow">{t("nav.marketplace")}</p>
              <Heading size="8" className="app-title">
                {t("marketplace.title")}
              </Heading>
              <p className="app-subtitle">{t("marketplace.subtitle")}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  updateFilters({
                    clearanceOnly: !urlState.clearanceOnly,
                    saleOnly: false,
                  })
                }
                aria-pressed={urlState.clearanceOnly}
                className={urlState.clearanceOnly ? "app-action-primary" : "app-action-secondary"}
              >
                <Sparkles className="h-4 w-4" />
                {t("clearance.section")}
              </button>
              <button
                type="button"
                onClick={() =>
                  updateFilters({
                    saleOnly: !urlState.saleOnly,
                    clearanceOnly: false,
                  })
                }
                aria-pressed={urlState.saleOnly}
                className={urlState.saleOnly ? "app-action-primary" : "app-action-secondary"}
              >
                <BadgePercent className="h-4 w-4" />
                {t("marketplace.saleSection")}
              </button>
              <button
                type="button"
                onClick={refetch}
                disabled={loading}
                className="app-action-secondary"
              >
                <ReloadIcon className={loading ? "animate-spin" : ""} />
                {loading ? t("common.refreshing") : t("common.refresh")}
              </button>
              <Link href="/sell" className="app-action-primary">
                <PlusIcon /> {t("marketplace.listItem")}
              </Link>
            </div>
          </div>

          <label className="block max-w-3xl">
            <p className="app-eyebrow">{t("marketplace.search")}</p>
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                placeholder={t("marketplace.searchPlaceholder")}
                value={urlState.name}
                onChange={(event) => updateFilters({ name: event.target.value }, true)}
                className="app-input h-12 pl-11 text-base shadow-sm"
              />
            </div>
          </label>
        </section>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {t("marketplace.loadError", { message: error.message })}
          </div>
        )}

        <section className="app-panel mb-6">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                {t("marketplace.category")}
              </span>
              <select
                value={urlState.category}
                onChange={(event) => updateFilters({ category: event.target.value })}
                className="app-input h-10 capitalize"
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item === "all"
                      ? t("marketplace.allCategories")
                      : t(`common.category.${item}` as any)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                {t("marketplace.sort")}
              </span>
              <select
                value={urlState.sort}
                onChange={(event) =>
                  updateFilters({ sort: event.target.value as MarketplaceUrlState["sort"] })
                }
                className="app-input h-10"
              >
                <option value="none">{t("marketplace.newest")}</option>
                <option value="asc">{t("marketplace.priceAsc")}</option>
                <option value="desc">{t("marketplace.priceDesc")}</option>
              </select>
            </label>

            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasFilters}
              className="app-action-icon"
              aria-label={t("common.clear")}
              title={t("common.clear")}
            >
              <Cross2Icon />
            </button>
          </div>

          <div className="mt-3 text-sm text-gray-600">
            {t("marketplace.showing", { shown: products.length, total })}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {loading && products.length === 0 ? (
            <div className="col-span-full rounded-lg border border-dashed border-orange-200 bg-white/90 px-6 py-12 text-center text-gray-600 shadow-sm">
              {t("marketplace.loadingListings")}
            </div>
          ) : products.length > 0 ? (
            products.map((product) => (
              <ProductCard
                key={product.id}
                productId={product.id}
                name={product.name}
                displayName={pickProductName(product.name, product.nameTranslations, locale)}
                nameTranslations={product.nameTranslations}
                price={product.price}
                originalPrice={product.originalPrice}
                discountPercent={product.discountPercent}
                clearancePrice={product.clearancePrice}
                isClearance={product.isClearance}
                category={product.category}
                quantity={product.quantity}
                returnTo={marketplaceUrl}
                imageUrl={
                  product.imageUrl ||
                  "https://placehold.co/800x600/f9fafb/d73f09?text=OSUTrade"
                }
              />
            ))
          ) : (
            <div className="col-span-full">
              <EmptyState
                title={t("marketplace.noMatches")}
                body={t("marketplace.noMatchesHelp")}
                action={
                  <button
                    type="button"
                    onClick={clearFilters}
                    disabled={!hasFilters}
                    className="app-action-secondary min-w-32"
                  >
                    <Cross2Icon />
                    <span className="whitespace-nowrap">{t("common.clear")}</span>
                  </button>
                }
              />
            </div>
          )}
        </section>

        {total > 0 && (
          <nav
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
            aria-label={t("marketplace.pagination")}
          >
            <button
              type="button"
              onClick={() => changePage(page - 1)}
              disabled={loading || page <= 1}
              className="app-action-secondary min-w-32"
            >
              <ChevronLeft className="h-4 w-4" />
              {t("marketplace.previousPage")}
            </button>
            <p className="min-w-36 text-center text-sm font-medium text-gray-700" aria-live="polite">
              {t("marketplace.pageIndicator", { page, total: pageCount })}
            </p>
            <button
              type="button"
              onClick={() => changePage(page + 1)}
              disabled={loading || !hasMore}
              className="app-action-secondary min-w-32"
            >
              {t("marketplace.nextPage")}
              <ChevronRight className="h-4 w-4" />
            </button>
          </nav>
        )}
      </div>
    </main>
  );
}

export default function ProductListPage() {
  const [urlState, setUrlState] = useState<MarketplaceUrlState | null>(null);

  useEffect(() => {
    const syncFromUrl = () => setUrlState(readMarketplaceUrlState(window.location.search));
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  function navigate(state: MarketplaceUrlState, options: NavigateOptions = {}) {
    const url = buildMarketplaceUrl(state);
    const { replace = false, resetScroll = true } = options;

    if (resetScroll) {
      window.sessionStorage.removeItem(`marketplace-scroll:${url}`);
    }
    window.history[replace ? "replaceState" : "pushState"]({}, "", url);
    setUrlState(state);
    if (resetScroll) window.scrollTo(0, 0);
  }

  return (
    <Theme appearance="light" accentColor="orange" grayColor="sand" radius="large">
      <Header />
      {urlState ? <MarketplaceContent urlState={urlState} navigate={navigate} /> : null}
    </Theme>
  );
}
