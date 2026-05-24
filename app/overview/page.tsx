"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button, Heading, Theme } from "@radix-ui/themes";
import Header from "../components/Header";
import EmptyState from "../components/EmptyState";
import ProductCard from "../components/ProductCard";
import { useProducts } from "../hook/useProducts";
import type { Product } from "../lib/products";
import { useI18n } from "../i18n";
import { pickProductName } from "../lib/productTranslations";

const categories = ["all", "electronics", "clothing", "books", "home", "general"];

function sortProductsByPrice(products: Product[], order: string) {
  if (order === "asc") {
    return [...products].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  }
  if (order === "desc") {
    return [...products].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
  }
  return products;
}

export default function ProductListPage() {
  const { t, locale } = useI18n();
  const { products, loading, error, refetch } = useProducts();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [priceSort, setPriceSort] = useState("none");

  const filteredProducts = useMemo(() => {
    let updated = products;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      updated = updated.filter((p) =>
        pickProductName(p.name, p.nameTranslations, locale).toLowerCase().includes(q)
      );
    }

    if (category !== "all") {
      updated = updated.filter((p) => p.category === category);
    }

    return sortProductsByPrice(updated, priceSort);
  }, [products, search, category, priceSort, locale]);

  const hasFilters = search.trim() || category !== "all" || priceSort !== "none";

  function clearFilters() {
    setSearch("");
    setCategory("all");
    setPriceSort("none");
  }

  return (
    <Theme appearance="light" accentColor="orange" grayColor="sand" radius="large">
      <main className="app-page">
        <Header />

        <div className="app-container">
          <section className="app-hero flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="app-eyebrow">
                {t("nav.marketplace")}
              </p>
              <Heading size="8" className="app-title">
                {t("marketplace.title")}
              </Heading>
              <p className="app-subtitle">
                {t("marketplace.subtitle")}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="soft" onClick={() => refetch()} disabled={loading}>
                {loading ? t("common.refreshing") : t("common.refresh")}
              </Button>
              <Link href="/sell">
                <Button highContrast>{t("marketplace.listItem")}</Button>
              </Link>
            </div>
          </section>

          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {t("marketplace.loadError", { message: error.message })}
            </div>
          )}

          <section className="app-panel mb-6">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px_auto] md:items-end">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  {t("marketplace.search")}
                </span>
                <input
                  type="search"
                  placeholder={t("marketplace.searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="app-input h-10"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  {t("marketplace.category")}
                </span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
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
                  value={priceSort}
                  onChange={(e) => setPriceSort(e.target.value)}
                  className="app-input h-10"
                >
                  <option value="none">{t("marketplace.newest")}</option>
                  <option value="asc">{t("marketplace.priceAsc")}</option>
                  <option value="desc">{t("marketplace.priceDesc")}</option>
                </select>
              </label>

              <Button
                variant="soft"
                onClick={clearFilters}
                disabled={!hasFilters}
                className="h-10"
              >
                {t("common.clear")}
              </Button>
            </div>

            <div className="mt-3 text-sm text-gray-600">
              {t("marketplace.showing", {
                shown: filteredProducts.length,
                total: products.length,
              })}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {loading ? (
              <div className="col-span-full rounded-lg border border-dashed border-orange-200 bg-white/85 px-6 py-12 text-center text-gray-600 shadow-sm">
                {t("marketplace.loadingListings")}
              </div>
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
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
                  category={product.category}
                  quantity={product.quantity}
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
                    <Button
                      variant="soft"
                      onClick={clearFilters}
                      disabled={!hasFilters}
                    >
                      {t("common.clear")}
                    </Button>
                  }
                />
              </div>
            )}
          </section>
        </div>
      </main>
    </Theme>
  );
}
