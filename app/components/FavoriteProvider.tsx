"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { favoriteStorageKey, normalizeFavoriteProductIds } from "../lib/favorites";

type FavoriteContextValue = {
  favoriteIds: string[];
  isFavorite: (productId: string | number) => boolean;
  toggleFavorite: (productId: string | number) => Promise<void>;
};

const FavoriteContext = createContext<FavoriteContextValue | null>(null);

function readFavoriteIds() {
  try {
    return normalizeFavoriteProductIds(
      JSON.parse(window.localStorage.getItem(favoriteStorageKey) ?? "[]")
    );
  } catch {
    return [];
  }
}

function addFavoriteId(productIds: string[], productId: string) {
  return normalizeFavoriteProductIds([...productIds, productId]);
}

function removeFavoriteId(productIds: string[], productId: string) {
  return productIds.filter((id) => id !== productId);
}

export default function FavoriteProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const favoriteIdsRef = useRef(favoriteIds);
  const syncedAccountIdRef = useRef<string | null>(null);
  const accountId = session?.user?.id;

  useEffect(() => {
    const savedFavoriteIds = readFavoriteIds();
    favoriteIdsRef.current = savedFavoriteIds;
    setFavoriteIds(savedFavoriteIds);
    setHydrated(true);
  }, []);

  useEffect(() => {
    favoriteIdsRef.current = favoriteIds;

    if (!hydrated) return;

    window.localStorage.setItem(
      favoriteStorageKey,
      JSON.stringify(favoriteIds)
    );
  }, [favoriteIds, hydrated]);

  useEffect(() => {
    if (!hydrated || status !== "authenticated" || !accountId) {
      syncedAccountIdRef.current = null;
      return;
    }

    if (syncedAccountIdRef.current === accountId) return;

    let cancelled = false;

    async function syncFavorites() {
      try {
        const savedResponse = await fetch("/api/favorites", {
          cache: "no-store",
        });
        if (!savedResponse.ok) return;

        const savedPayload = (await savedResponse.json().catch(() => null)) as {
          data?: Array<{ id?: unknown }>;
        } | null;
        const accountFavoriteIds = normalizeFavoriteProductIds(
          (savedPayload?.data ?? []).map((product) => product?.id)
        );
        const deviceFavoriteIds = favoriteIdsRef.current;
        if (deviceFavoriteIds.length > 0) {
          const syncResponse = await fetch("/api/favorites", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ productIds: deviceFavoriteIds }),
          });

          if (!syncResponse.ok) return;
        }
        if (cancelled) return;

        syncedAccountIdRef.current = accountId;
        setFavoriteIds(
          normalizeFavoriteProductIds([
            ...favoriteIdsRef.current,
            ...accountFavoriteIds,
          ])
        );
      } catch {
        // Keep device favorites usable while an account sync is unavailable.
      }
    }

    void syncFavorites();

    return () => {
      cancelled = true;
    };
  }, [accountId, hydrated, status]);

  const toggleFavorite = useCallback(
    async (value: string | number) => {
      const productId = normalizeFavoriteProductIds([value], 1)[0];
      if (!productId) return;

      const isAlreadyFavorite = favoriteIdsRef.current.includes(productId);
      const nextFavoriteIds = isAlreadyFavorite
        ? removeFavoriteId(favoriteIdsRef.current, productId)
        : addFavoriteId(favoriteIdsRef.current, productId);

      favoriteIdsRef.current = nextFavoriteIds;
      setFavoriteIds(nextFavoriteIds);

      if (status !== "authenticated" || !accountId) return;

      try {
        const response = await fetch("/api/favorites", {
          method: isAlreadyFavorite ? "DELETE" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            isAlreadyFavorite ? { productId } : { productIds: [productId] }
          ),
        });

        if (!response.ok) {
          throw new Error("Favorite update failed.");
        }
      } catch {
        // Keep the local choice. A later sign-in or refresh can retry synchronization.
      }
    },
    [accountId, status]
  );

  const value = useMemo<FavoriteContextValue>(
    () => ({
      favoriteIds,
      isFavorite: (productId) => favoriteIds.includes(String(productId)),
      toggleFavorite,
    }),
    [favoriteIds, toggleFavorite]
  );

  return (
    <FavoriteContext.Provider value={value}>{children}</FavoriteContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoriteContext);

  if (!context) {
    throw new Error("useFavorites must be used inside FavoriteProvider");
  }

  return context;
}
