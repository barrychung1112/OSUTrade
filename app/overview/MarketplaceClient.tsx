"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Heading, Theme } from "@radix-ui/themes";
import {
  Cross2Icon,
  MagnifyingGlassIcon,
  PlusIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import { ChevronLeft, ChevronRight, BadgePercent, Heart, Sparkles } from "lucide-react";
import Header from "../components/Header";
import EmptyState from "../components/EmptyState";
import ProductCard from "../components/ProductCard";
import { useFavorites } from "../components/FavoriteProvider";
import { useProducts } from "../hook/useProducts";
import { useI18n } from "../i18n";
import {
  buildMarketplaceUrl,
  readMarketplaceUrlState,
  resetMarketplacePage,
  type MarketplaceUrlState,
} from "../lib/marketplaceUrlState";
import { pickProductName } from "../lib/productTranslations";
import { filterFavoriteProducts } from "../lib/favoriteProductList";
import type { PublicProductListParams } from "../lib/publicProductList";
import type { Product, ProductListResponse } from "../lib/products";

const categories = ["all", "electronics", "clothing", "books", "home", "general"];

type NavigateOptions = {
  replace?: boolean;
  resetScroll?: boolean;
};

function MarketplaceContent({
  urlState,
  navigate,
  initialResponse,
}: {
  urlState: MarketplaceUrlState;
  navigate: (state: MarketplaceUrlState, options?: NavigateOptions) => void;
  initialResponse: ProductListResponse;
}) {
  const { t, locale } = useI18n();
  const { favoriteIds } = useFavorites();
  const marketplaceUrl = buildMarketplaceUrl(urlState);
  const restoredPathRef = useRef<string | null>(null);
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [favoriteError, setFavoriteError] = useState<Error | null>(null);
  const [favoriteReloadKey, setFavoriteReloadKey] = useState(0);
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
    limit: initialResponse.limit,
    name: urlState.name,
    category: urlState.category === "all" ? undefined : urlState.category,
    sort: urlState.sort === "asc" || urlState.sort === "desc" ? urlState.sort : undefined,
    discounted: urlState.saleOnly,
    clearance: urlState.clearanceOnly,
  }, initialResponse);
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const favoriteIdsKey = favoriteIds.join("|");
  const isFavoriteView = urlState.favoritesOnly;
  const filteredFavoriteProducts = useMemo(
    () =>
      filterFavoriteProducts(favoriteProducts, {
        name: urlState.name,
        category: urlState.category,
        sort: urlState.sort,
        saleOnly: urlState.saleOnly,
        clearanceOnly: urlState.clearanceOnly,
      }),
    [
      favoriteProducts,
      urlState.category,
      urlState.clearanceOnly,
      urlState.name,
      urlState.saleOnly,
      urlState.sort,
    ]
  );
  const displayedProducts = isFavoriteView ? filteredFavoriteProducts : products;
  const displayedLoading = isFavoriteView ? favoriteLoading : loading;
  const displayedError = isFavoriteView ? favoriteError : error;
  const displayedTotal = isFavoriteView ? filteredFavoriteProducts.length : total;
  const displayedPage = isFavoriteView ? 1 : page;
  const displayedPageCount = isFavoriteView ? 1 : pageCount;
  const displayedHasMore = isFavoriteView ? false : hasMore;
  const hasFilters =
    urlState.name.trim() ||
    urlState.category !== "all" ||
    urlState.sort !== "none" ||
    urlState.saleOnly ||
    urlState.clearanceOnly ||
    urlState.favoritesOnly;

  useEffect(() => {
    if (!isFavoriteView) return;

    if (favoriteIds.length === 0) {
      setFavoriteProducts([]);
      setFavoriteError(null);
      setFavoriteLoading(false);
      return;
    }

    let cancelled = false;

    async function loadFavoriteProducts() {
      setFavoriteLoading(true);
      setFavoriteError(null);

      try {
        const response = await fetch("/api/favorites/resolve", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productIds: favoriteIds }),
        });
        if (!response.ok) {
          throw new Error(`Failed to load favorites: HTTP ${response.status}`);
        }

        const payload = (await response.json()) as { data?: Product[] };
        if (!cancelled) {
          setFavoriteProducts(payload.data ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setFavoriteError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) setFavoriteLoading(false);
      }
    }

    void loadFavoriteProducts();

    return () => {
      cancelled = true;
    };
  }, [favoriteIdsKey, favoriteReloadKey, isFavoriteView]);

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
      favoritesOnly: false,
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
                onClick={() => updateFilters({ favoritesOnly: !urlState.favoritesOnly })}
                aria-pressed={urlState.favoritesOnly}
                className={urlState.favoritesOnly ? "app-action-primary" : "app-action-secondary"}
              >
                <Heart className="h-4 w-4" />
                {t("marketplace.favorites")}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isFavoriteView) setFavoriteReloadKey((key) => key + 1);
                  else refetch();
                }}
                disabled={displayedLoading}
                className="app-action-secondary"
              >
                <ReloadIcon className={displayedLoading ? "animate-spin" : ""} />
                {displayedLoading ? t("common.refreshing") : t("common.refresh")}
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

        {displayedError && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {t("marketplace.loadError", { message: displayedError.message })}
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
            {t("marketplace.showing", { shown: displayedProducts.length, total: displayedTotal })}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayedLoading && displayedProducts.length === 0 ? (
            <div className="col-span-full rounded-lg border border-dashed border-orange-200 bg-white/90 px-6 py-12 text-center text-gray-600 shadow-sm">
              {t("marketplace.loadingListings")}
            </div>
          ) : displayedProducts.length > 0 ? (
            displayedProducts.map((product) => (
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
                sellerId={product.sellerId}
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
                title={
                  isFavoriteView && favoriteIds.length === 0
                    ? t("marketplace.favoritesEmpty")
                    : t("marketplace.noMatches")
                }
                body={
                  isFavoriteView && favoriteIds.length === 0
                    ? t("marketplace.favoritesEmptyHelp")
                    : t("marketplace.noMatchesHelp")
                }
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

        {displayedTotal > 0 && !isFavoriteView && (
          <nav
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
            aria-label={t("marketplace.pagination")}
          >
            <button
              type="button"
              onClick={() => changePage(displayedPage - 1)}
              disabled={displayedLoading || displayedPage <= 1}
              className="app-action-secondary min-w-32"
            >
              <ChevronLeft className="h-4 w-4" />
              {t("marketplace.previousPage")}
            </button>
            <p className="min-w-36 text-center text-sm font-medium text-gray-700" aria-live="polite">
              {t("marketplace.pageIndicator", { page: displayedPage, total: displayedPageCount })}
            </p>
            <button
              type="button"
              onClick={() => changePage(displayedPage + 1)}
              disabled={displayedLoading || !displayedHasMore}
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

function marketplaceStateFromParams(
  params: PublicProductListParams,
  favoritesOnly = false
): MarketplaceUrlState {
  return {
    page: params.page,
    name: params.name ?? "",
    category: params.category ?? "all",
    sort: params.sort ?? "none",
    saleOnly: params.discounted,
    clearanceOnly: params.clearance,
    favoritesOnly,
  };
}

export default function MarketplaceClient({
  initialParams,
  initialResponse,
  initialFavoritesOnly = false,
}: {
  initialParams: PublicProductListParams;
  initialResponse: ProductListResponse;
  initialFavoritesOnly?: boolean;
}) {
  const [urlState, setUrlState] = useState<MarketplaceUrlState>(() =>
    marketplaceStateFromParams(initialParams, initialFavoritesOnly)
  );

  useEffect(() => {
    const syncFromUrl = () => setUrlState(readMarketplaceUrlState(window.location.search));
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
      <MarketplaceContent
        urlState={urlState}
        navigate={navigate}
        initialResponse={initialResponse}
      />
    </Theme>
  );
}
