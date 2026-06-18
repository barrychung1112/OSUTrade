export const requestSelectFields =
  "request_id, product_id, buyer_id, quantity, note, status, created_at, price_at_request";

export const requestSelectFieldsWithoutPrice =
  "request_id, product_id, buyer_id, quantity, note, status, created_at";

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

export function isMissingPriceAtRequestError(error: unknown) {
  const supabaseError = error as SupabaseLikeError;
  const searchableText = [
    supabaseError?.message,
    supabaseError?.details,
    supabaseError?.hint,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    (supabaseError?.code === "PGRST204" ||
      supabaseError?.code === "42703" ||
      /price_at_request/i.test(searchableText)) &&
    /price_at_request/i.test(searchableText)
  );
}

export function stripPriceAtRequest<T extends Record<string, unknown>>(
  values: T
) {
  const { price_at_request: _priceAtRequest, ...rest } = values;
  return rest;
}
