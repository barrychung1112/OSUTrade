// hooks/useProducts.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchProducts, type Product } from "../lib/products";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchProducts(controller.signal);
      setProducts(data ?? []);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return;
      } else {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return () => {
      abortRef.current?.abort();
    };
  }, [load]);

  return { products, loading, error, refetch: load };
}
