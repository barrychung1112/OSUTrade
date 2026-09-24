const MARKETPLACE_PATH = "/overview";

export function normalizeSellerProfileReturnTo(value: unknown) {
  if (typeof value !== "string") return MARKETPLACE_PATH;

  const isMarketplacePath =
    value === MARKETPLACE_PATH ||
    value.startsWith(`${MARKETPLACE_PATH}?`) ||
    value.startsWith(`${MARKETPLACE_PATH}#`);

  return isMarketplacePath ? value : MARKETPLACE_PATH;
}

export function buildSellerProfileHref(sellerId: string, returnTo?: string) {
  const baseHref = `/sellers/${encodeURIComponent(sellerId)}`;
  const safeReturnTo = normalizeSellerProfileReturnTo(returnTo);

  return safeReturnTo === MARKETPLACE_PATH
    ? baseHref
    : `${baseHref}?returnTo=${encodeURIComponent(safeReturnTo)}`;
}
