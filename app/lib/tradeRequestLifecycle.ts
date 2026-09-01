export type TradeRequestStatus =
  | "sent"
  | "accepted"
  | "completed"
  | "declined"
  | "cancelled"
  | "expired";

export type SellerRequestAction =
  | "accept"
  | "decline"
  | "complete"
  | "cancel";

const allowedStatuses: Record<SellerRequestAction, TradeRequestStatus[]> = {
  accept: ["sent"],
  decline: ["sent"],
  complete: ["accepted"],
  cancel: ["accepted"],
};

export function canSellerTransition(
  status: TradeRequestStatus,
  action: SellerRequestAction
) {
  return allowedStatuses[action].includes(status);
}
