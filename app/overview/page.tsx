"use client";

import { useMemo, useState } from "react";
import Header from "../components/Header";
import ProductCard from "../components/ProductCard";
import { Heading, Theme, Button, Separator } from "@radix-ui/themes";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";
import * as SelectPrimitive from "@radix-ui/react-select";
import { useProducts } from "../hook/useProducts";
import type { Product } from "../lib/products";

function sortProductsByPrice(products: Product[], order: string) {
  if (order === "asc") {
    return [...products].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  } else if (order === "desc") {
    return [...products].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
  }
  return products;
}

export default function ProductListPage() {
  const { products, loading, error, refetch } = useProducts();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [priceSort, setPriceSort] = useState("none");
  const [showSidebar, setShowSidebar] = useState(false);

  const filteredProducts = useMemo(() => {
    let updated = products;

    if (search) {
      const q = search.toLowerCase();
      updated = updated.filter((p) => p.name?.toLowerCase().includes(q));
    }

    if (category !== "all") {
      updated = updated.filter((p) => p.category === category);
    }

    updated = sortProductsByPrice(updated, priceSort);
    return updated;
  }, [products, search, category, priceSort]);

  return (
    <Theme
      appearance="light"
      accentColor="orange"
      grayColor="sand"
      radius="large"
    >
      <main className="min-h-screen relative bg-gradient-to-br from-white via-[#fff1f1] to-[#ffe6e6] px-4 py-20">
        <Header />

        <div className="relative z-10 max-w-7xl mx-auto">
          <Heading
            size="8"
            className="text-[#333] text-center mb-10 font-mono font-bold text-3xl"
          >
            Marketplace
          </Heading>
          <div className="flex justify-end mb-10">
            <div className="flex items-center gap-2">
              <Button variant="soft" onClick={() => setShowSidebar((s) => !s)}>
                <MixerHorizontalIcon />
              </Button>
              <Button
                variant="soft"
                onClick={() => refetch()}
                disabled={loading}
              >
                {loading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>

          {error && (
            <p className="mb-4 text-sm text-red-600">
              Failed to load products: {error.message}
            </p>
          )}

          <div className="flex">
            {showSidebar && (
              <aside className="w-full max-w-xs bg-white shadow-xl rounded-xl p-6 mr-6 space-y-6 border border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <span role="img" aria-label="search">
                      🔍
                    </span>{" "}
                    Search Products
                  </label>
                  <input
                    type="text"
                    placeholder="Search by name"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>

                <Separator my="2" size="4" />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <span role="img" aria-label="category">
                      🗂️
                    </span>{" "}
                    Category
                  </label>
                  <SelectPrimitive.Root
                    value={category}
                    onValueChange={setCategory}
                  >
                    <SelectPrimitive.Trigger className="w-full px-4 py-2 border border-gray-300 rounded-md text-left bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                      <span>
                        {category === "all" ? "All Categories" : category}
                      </span>
                    </SelectPrimitive.Trigger>
                    <SelectPrimitive.Content className="bg-white border border-gray-300 rounded-md shadow-lg">
                      <SelectPrimitive.Item
                        value="all"
                        className="px-4 py-2 hover:bg-gray-100"
                      >
                        All Categories
                      </SelectPrimitive.Item>
                      <SelectPrimitive.Item
                        value="electronics"
                        className="px-4 py-2 hover:bg-gray-100"
                      >
                        Electronics
                      </SelectPrimitive.Item>
                      <SelectPrimitive.Item
                        value="clothing"
                        className="px-4 py-2 hover:bg-gray-100"
                      >
                        Clothing
                      </SelectPrimitive.Item>
                      <SelectPrimitive.Item
                        value="books"
                        className="px-4 py-2 hover:bg-gray-100"
                      >
                        Books
                      </SelectPrimitive.Item>
                    </SelectPrimitive.Content>
                  </SelectPrimitive.Root>
                </div>

                <Separator my="2" size="4" />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <span role="img" aria-label="price">
                      💲
                    </span>{" "}
                    Sort by Price
                  </label>
                  <SelectPrimitive.Root
                    value={priceSort}
                    onValueChange={setPriceSort}
                  >
                    <SelectPrimitive.Trigger className="w-full px-4 py-2 border border-gray-300 rounded-md text-left bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                      <span>
                        {priceSort === "asc"
                          ? "Price: Low to High"
                          : priceSort === "desc"
                          ? "Price: High to Low"
                          : "No Sorting"}
                      </span>
                    </SelectPrimitive.Trigger>
                    <SelectPrimitive.Content className="bg-white border border-gray-300 rounded-md shadow-lg">
                      <SelectPrimitive.Item
                        value="none"
                        className="px-4 py-2 hover:bg-gray-100"
                      >
                        No Sorting
                      </SelectPrimitive.Item>
                      <SelectPrimitive.Item
                        value="asc"
                        className="px-4 py-2 hover:bg-gray-100"
                      >
                        Price: Low to High
                      </SelectPrimitive.Item>
                      <SelectPrimitive.Item
                        value="desc"
                        className="px-4 py-2 hover:bg-gray-100"
                      >
                        Price: High to Low
                      </SelectPrimitive.Item>
                    </SelectPrimitive.Content>
                  </SelectPrimitive.Root>
                </div>
              </aside>
            )}

            <div className="flex-1 grid gap-10 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {loading ? (
                <p className="text-center col-span-full text-gray-500">
                  Loading…
                </p>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    productId={product.id}
                    name={product.name}
                    price={product.price}
                    imageUrl={
                      product.imageUrl ||
                      "https://bmelflizqrhydlfuovnv.supabase.co/storage/v1/object/public/products//S__5005327_0.jpg"
                    }
                  />
                ))
              ) : (
                <p className="text-center col-span-full text-gray-500">
                  No products available.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </Theme>
  );
}
