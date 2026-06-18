type ProductStatus = "available" | "pending";

export function getAcceptedRequestProductStatus(
  remainingQuantity: number
): ProductStatus {
  return remainingQuantity > 0 ? "available" : "pending";
}
