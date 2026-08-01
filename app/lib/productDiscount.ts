export const PRODUCT_DISCOUNT_OPTIONS = [0, 10, 20, 30, 50] as const;

export type ProductDiscountPercent = (typeof PRODUCT_DISCOUNT_OPTIONS)[number];

export type ProductPriceRow = {
  price: number | string;
  discount_percent?: number | string | null;
  effective_price?: number | string | null;
};

export function parseProductDiscount(value: unknown): ProductDiscountPercent | null {
  const discount = Number(value ?? 0);
  return PRODUCT_DISCOUNT_OPTIONS.includes(discount as ProductDiscountPercent)
    ? (discount as ProductDiscountPercent)
    : null;
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
  const storedEffectivePrice = Number(row.effective_price);
  const effectivePrice =
    row.effective_price !== null &&
    row.effective_price !== undefined &&
    Number.isFinite(storedEffectivePrice)
      ? storedEffectivePrice
      : calculateEffectivePrice(originalPrice, discountPercent);

  return { originalPrice, effectivePrice, discountPercent };
}

