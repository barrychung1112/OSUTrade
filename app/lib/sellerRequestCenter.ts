export type SellerRequestCenterStatus =
  | "sent"
  | "accepted"
  | "completed"
  | "declined"
  | "cancelled"
  | "expired";

export type SellerRequestCenterItem = {
  status: SellerRequestCenterStatus;
  createdAt: string;
};

const statusPriority: Record<SellerRequestCenterStatus, number> = {
  sent: 0,
  expired: 1,
  accepted: 2,
  completed: 3,
  declined: 4,
  cancelled: 5,
};

export function groupSellerRequests<T extends SellerRequestCenterItem>(
  requests: readonly T[]
) {
  const sorted = [...requests].sort(
    (a, b) =>
      statusPriority[a.status] - statusPriority[b.status] ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const pending = sorted.filter((request) => request.status === "sent");
  const active = sorted.filter(
    (request) => request.status === "sent" || request.status === "accepted"
  );
  const expired = sorted.filter((request) => request.status === "expired");
  const history = sorted.filter(
    (request) =>
      request.status !== "sent" &&
      request.status !== "accepted" &&
      request.status !== "expired"
  );

  return {
    pending,
    active,
    expired,
    history,
    pendingCount: pending.length,
    actionableCount: active.length,
  };
}
