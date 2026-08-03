import { isExpiredSentRequest } from "./requestExpiry";

type TradeRequestForEditLock = {
  status: string;
  created_at: string;
};

const editableProductFields = [
  "name",
  "description",
  "price",
  "discountPercent",
  "category",
  "quantity",
  "contactPhone",
  "contactLineId",
  "contactWechatId",
] as const;

export function hasEditableProductFields(body: Record<string, unknown>) {
  return editableProductFields.some((field) =>
    Object.prototype.hasOwnProperty.call(body, field)
  );
}

export function hasActiveTradeRequest(
  requests: TradeRequestForEditLock[],
  now = Date.now()
) {
  return requests.some(
    (request) =>
      request.status === "accepted" ||
      (request.status === "sent" &&
        !isExpiredSentRequest({ ...request, now }))
  );
}
