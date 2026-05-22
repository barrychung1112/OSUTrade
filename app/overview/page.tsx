"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button, Heading, Theme } from "@radix-ui/themes";
import Header from "../components/Header";
import ProductCard from "../components/ProductCard";
import { useProducts } from "../hook/useProducts";
import type { Product } from "../lib/products";

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
  const { products, loading, error, refetch } = useProducts();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [priceSort, setPriceSort] = useState("none");

  const filteredProducts = useMemo(() => {
    let updated = products;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      updated = updated.filter((p) => p.name?.toLowerCase().includes(q));
    }

    if (category !== "all") {
      updated = updated.filter((p) => p.category === category);
    }

    return sortProductsByPrice(updated, priceSort);
  }, [products, search, category, priceSort]);

  const hasFilters = search.trim() || category !== "all" || priceSort !== "none";

  function clearFilters() {
    setSearch("");
    setCategory("all");
    setPriceSort("none");
  }

  return (
    <Theme appearance="light" accentColor="orange" grayColor="sand" radius="large">
      <main className="relative min-h-screen bg-gradient-to-br from-white via-[#fff6f1] to-[#ffe7df] px-4 py-24">
        <Header />

        <div className="relative z-10 mx-auto max-w-7xl">
          <section className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#d73f09]">
                Marketplace
              </p>
              <Heading size="8" className="text-3xl font-bold text-gray-900 sm:text-4xl">
                Find campus deals faster.
              </Heading>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
                Browse available listings, filter by category, and add items to
                your request cart when you are ready to contact the seller.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="soft" onClick={() => refetch()} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </Button>
              <Link href="/sell">
                <Button highContrast>List Item</Button>
              </Link>
            </div>
          </section>

          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Failed to load products: {error.message}
            </div>
          )}

          <section className="mb-6 rounded-lg border border-orange-100 bg-white/80 p-4 shadow-sm backdrop-blur">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px_auto] md:items-end">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Search
                </span>
                <input
                  type="search"
                  placeholder="Search by item name"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none transition focus:border-[#d73f09] focus:ring-2 focus:ring-orange-100"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Category
                </span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm capitalize outline-none transition focus:border-[#d73f09] focus:ring-2 focus:ring-orange-100"
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item === "all" ? "All categories" : item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">
                  Sort
                </span>
                <select
                  value={priceSort}
                  onChange={(e) => setPriceSort(e.target.value)}
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none transition focus:border-[#d73f09] focus:ring-2 focus:ring-orange-100"
                >
                  <option value="none">Newest first</option>
                  <option value="asc">Price: low to high</option>
                  <option value="desc">Price: high to low</option>
                </select>
              </label>

              <Button
                variant="soft"
                onClick={clearFilters}
                disabled={!hasFilters}
                className="h-10"
              >
                Clear
              </Button>
            </div>

            <div className="mt-3 text-sm text-gray-600">
              Showing {filteredProducts.length} of {products.length} listings
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {loading ? (
              <div className="col-span-full rounded-lg border border-dashed border-orange-200 bg-white/60 px-6 py-12 text-center text-gray-600">
                Loading listings...
              </div>
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  productId={product.id}
                  name={product.name}
                  price={product.price}
                  imageUrl={
                    product.imageUrl ||
                    "https://placehold.co/800x600/f9fafb/d73f09?text=OSUTrade"
                  }
                />
              ))
            ) : (
              <div className="col-span-full rounded-lg border border-dashed border-orange-200 bg-white/60 px-6 py-12 text-center">
                <Heading size="4" className="text-gray-900">
                  No matching listings
                </Heading>
                <p className="mt-2 text-sm text-gray-600">
                  Try clearing filters or list the first item in this category.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </Theme>
  );
}
