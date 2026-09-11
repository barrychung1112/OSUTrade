// hooks/useProducts.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchProducts,
  type Product,
  type ProductListOptions,
} from "../lib/products";

type UseProductsOptions = Omit<ProductListOptions, "signal">;

export function useProducts(options: UseProductsOptions = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(options.page ?? 1);
  const [limit, setLimit] = useState(options.limit ?? 12);
  const abortRef = useRef<AbortController | null>(null);

  const loadPage = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setProducts([]);
    setTotal(0);
    setError(null);

    try {
      const response = await fetchProducts({
        ...options,
        page: options.page ?? 1,
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;
      setProducts(response.data);
      setTotal(response.total);
      setPage(response.page);
      setLimit(response.limit);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [
    options.category,
    options.clearance,
    options.discounted,
    options.limit,
    options.name,
    options.page,
    options.sort,
  ]);

  const refetch = useCallback(() => loadPage(), [loadPage]);

  useEffect(() => {
    refetch();
    return () => {
      abortRef.current?.abort();
    };
  }, [refetch]);

  return {
    products,
    loading,
    error,
    total,
    page,
    limit,
    hasMore: page * limit < total,
    refetch,
  };
}
