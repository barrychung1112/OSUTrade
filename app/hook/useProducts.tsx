// hooks/useProducts.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchProducts,
  type Product,
  type ProductListOptions,
} from "../lib/products";

type UseProductsOptions = Omit<ProductListOptions, "page" | "signal">;

export function useProducts(options: UseProductsOptions = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(options.limit ?? 12);
  const abortRef = useRef<AbortController | null>(null);

  const loadPage = useCallback(
    async (nextPage: number, mode: "replace" | "append") => {
      if (mode === "replace") {
        abortRef.current?.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;

      if (mode === "append") {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setProducts([]);
        setTotal(0);
        setPage(1);
      }
      setError(null);

      try {
        const response = await fetchProducts({
          ...options,
          page: nextPage,
          signal: controller.signal,
        });

        setProducts((current) =>
          mode === "append" ? [...current, ...response.data] : response.data
        );
        setTotal(response.total);
        setPage(response.page);
        setLimit(response.limit);
      } catch (err: any) {
        if (err?.name === "AbortError") {
          return;
        }
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (mode === "append") {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [
      options.category,
      options.discounted,
      options.limit,
      options.name,
      options.sort,
    ]
  );

  const refetch = useCallback(() => loadPage(1, "replace"), [loadPage]);
  const loadMore = useCallback(
    () => loadPage(page + 1, "append"),
    [loadPage, page]
  );

  useEffect(() => {
    refetch();
    return () => {
      abortRef.current?.abort();
    };
  }, [refetch]);

  return {
    products,
    loading,
    loadingMore,
    error,
    total,
    page,
    limit,
    hasMore: products.length < total,
    refetch,
    loadMore,
  };
}
