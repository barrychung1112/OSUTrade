type AcceptedRequestCancellationInput = {
  requestStatus: string | null;
  productStatus: string | null;
  currentQuantity: number;
  requestQuantity: number;
};

type AcceptedRequestCancellationResult =
  | { ok: true; quantity: number; status: "available" }
  | { ok: false; message: string };

export function buildAcceptedRequestCancellation({
  requestStatus,
  productStatus,
  currentQuantity,
  requestQuantity,
}: AcceptedRequestCancellationInput): AcceptedRequestCancellationResult {
  if (requestStatus !== "accepted") {
    return { ok: false, message: "Only accepted requests can be restored." };
  }

  if (productStatus !== "available" && productStatus !== "pending") {
    return {
      ok: false,
      message: "Sold or removed listings cannot be restored automatically.",
    };
  }

  return {
    ok: true,
    quantity: currentQuantity + requestQuantity,
    status: "available",
  };
}
