import { isExpiredSentRequest } from "./requestExpiry";

type RequestPriceRow = {
  status: string;
  created_at: string;
  price_at_request?: number | string | null;
};

export type RequestPriceChange = {
  changed: boolean;
  priceAtRequest: number | null;
  currentPrice: number | null;
};

function normalizePrice(value: number | string | null | undefined) {
  const price = Number(value);
  return Number.isFinite(price) ? price : null;
}

export function getRequestPriceChange(
  row: RequestPriceRow,
  currentPrice: number | string | null | undefined,
  now = Date.now()
): RequestPriceChange {
  const priceAtRequest = normalizePrice(row.price_at_request);
  const productPrice = normalizePrice(currentPrice);

  if (
    row.status !== "sent" ||
    isExpiredSentRequest({ ...row, now }) ||
    priceAtRequest === null ||
    productPrice === null
  ) {
    return {
      changed: false,
      priceAtRequest,
      currentPrice: productPrice,
    };
  }

  return {
    changed: Math.abs(priceAtRequest - productPrice) > 0.001,
    priceAtRequest,
    currentPrice: productPrice,
  };
}

export function shouldNotifyRequestPriceChange(change: RequestPriceChange) {
  return change.changed;
}
