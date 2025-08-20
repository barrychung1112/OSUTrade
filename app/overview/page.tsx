"use client";

import { useEffect, useState } from "react";
import Header from "../components/Header";
import ProductCard from "../components/ProductCard";
import { Heading, Theme, Button, Separator } from "@radix-ui/themes";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";
import * as SelectPrimitive from "@radix-ui/react-select";

function sortProductsByPrice(products: any[], order: string) {
  if (order === "asc") {
    return products.sort((a, b) => a.price - b.price);
  } else if (order === "desc") {
    return products.sort((a, b) => b.price - a.price);
  }
  return products;
}

export default function ProductListPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [priceSort, setPriceSort] = useState("none");
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setFilteredProducts(data);
      })
      .catch((err) => console.error("Failed to load products:", err));
  }, []);

  useEffect(() => {
    let updated = [...products];

    if (search) {
      updated = updated.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (category !== "all") {
      updated = updated.filter((p) => p.category === category);
    }

    updated = sortProductsByPrice(updated, priceSort);

    setFilteredProducts(updated);
  }, [search, category, priceSort, products]);

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
          <Heading size="8" className="mb-10 text-center text-[#333]">
            Marketplace
          </Heading>

          <div className="mb-6 text-right">
            <Button variant="soft" onClick={() => setShowSidebar(!showSidebar)}>
              <MixerHorizontalIcon />
            </Button>
          </div>

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
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
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
