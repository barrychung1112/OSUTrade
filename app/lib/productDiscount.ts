export const PRODUCT_DISCOUNT_OPTIONS = [0, 10, 20, 30, 50] as const;

export type ProductDiscountPercent = (typeof PRODUCT_DISCOUNT_OPTIONS)[number];

export type ProductPriceRow = {
  price: number | string;
  discount_percent?: number | string | null;
  clearance_price?: number | string | null;
  effective_price?: number | string | null;
};

export type ProductClearancePrice = 0 | 1;

export function parseProductDiscount(value: unknown): ProductDiscountPercent | null {
  const discount = Number(value ?? 0);
  return PRODUCT_DISCOUNT_OPTIONS.includes(discount as ProductDiscountPercent)
    ? (discount as ProductDiscountPercent)
    : null;
}

export function parseClearancePrice(
  value: unknown
): ProductClearancePrice | null | undefined {
  if (value === null || value === undefined) return null;
  if (value === 0 || value === "0") return 0;
  if (value === 1 || value === "1") return 1;
  return undefined;
}

export function calculateEffectivePrice(
  originalPrice: number,
  discountPercent: ProductDiscountPercent
) {
  return Math.round(originalPrice * (100 - discountPercent)) / 100;
}

export function getProductPricing(row: ProductPriceRow) {
  const originalPrice = Number(row.price);
  const discountPercent = parseProductDiscount(row.discount_percent) ?? 0;
  const clearancePrice = parseClearancePrice(row.clearance_price) ?? null;
  const storedEffectivePrice = Number(row.effective_price);
  const effectivePrice =
    row.effective_price !== null &&
    row.effective_price !== undefined &&
    Number.isFinite(storedEffectivePrice)
      ? storedEffectivePrice
      : clearancePrice ?? calculateEffectivePrice(originalPrice, discountPercent);

  const isClearance = clearancePrice !== null;
  return {
    originalPrice,
    effectivePrice,
    discountPercent,
    clearancePrice,
    isClearance,
    isDiscounted: !isClearance && discountPercent > 0,
  };
}

