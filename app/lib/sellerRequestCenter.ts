export type SellerRequestCenterStatus =
  | "sent"
  | "accepted"
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
  declined: 3,
  cancelled: 4,
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
  const expired = sorted.filter((request) => request.status === "expired");
  const history = sorted.filter(
    (request) => request.status !== "sent" && request.status !== "expired"
  );

  return {
    pending,
    expired,
    history,
    pendingCount: pending.length,
  };
}
