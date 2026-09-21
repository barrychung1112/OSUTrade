const marketplaceCategories = new Set([
  "all",
  "electronics",
  "clothing",
  "books",
  "home",
  "general",
]);

export type MarketplaceSort = "none" | "asc" | "desc";

export type MarketplaceUrlState = {
  page: number;
  name: string;
  category: string;
  sort: MarketplaceSort;
  saleOnly: boolean;
  clearanceOnly: boolean;
  favoritesOnly: boolean;
};

function safePage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function readMarketplaceUrlState(search: string): MarketplaceUrlState {
  const params = new URLSearchParams(search);
  const category = params.get("category") ?? "all";
  const sort = params.get("sort");
  const clearanceOnly = params.get("clearance") === "1";
  const favoritesOnly = params.get("favorites") === "1";

  return {
    page: safePage(params.get("page")),
    name: params.get("q")?.trim() ?? "",
    category: marketplaceCategories.has(category) ? category : "all",
    sort: sort === "asc" || sort === "desc" ? sort : "none",
    saleOnly: !clearanceOnly && params.get("sale") === "1",
    clearanceOnly,
    favoritesOnly,
  };
}

export function buildMarketplaceUrl(state: MarketplaceUrlState) {
  const params = new URLSearchParams();
  if (state.page > 1) params.set("page", String(state.page));
  if (state.name.trim()) params.set("q", state.name.trim());
  if (state.category !== "all") params.set("category", state.category);
  if (state.sort !== "none") params.set("sort", state.sort);
  if (state.clearanceOnly) params.set("clearance", "1");
  else if (state.saleOnly) params.set("sale", "1");
  if (state.favoritesOnly) params.set("favorites", "1");

  const query = params.toString();
  return query ? `/overview?${query}` : "/overview";
}

export function resetMarketplacePage(
  state: MarketplaceUrlState
): MarketplaceUrlState {
  return { ...state, page: 1 };
}

export function isMarketplaceReturnPath(value: string | null) {
  if (!value?.startsWith("/")) return false;

  try {
    const url = new URL(value, "https://osutrade.local");
    return url.origin === "https://osutrade.local" && url.pathname === "/overview";
  } catch {
    return false;
  }
}

export function getMarketplaceReturnPath(value: string | null) {
  return isMarketplaceReturnPath(value) ? value : "/overview";
}
