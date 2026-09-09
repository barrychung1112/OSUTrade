export type TradeMessageRequestStatus =
  | "sent"
  | "accepted"
  | "completed"
  | "declined"
  | "cancelled";

type TradeMessageRequest = {
  requestId: string;
  productId?: string;
  buyerId: string;
  quantity?: number;
  note?: string | null;
  status: string;
  acceptedAt?: string | null;
};

type TradeMessageProduct = {
  id: string;
  sellerId: string | null;
  name: string;
  price: number | string | null;
};

type TradeMessageAccessInput = {
  request: TradeMessageRequest;
  sellerId: string | null | undefined;
  userId: string;
};

type TradeMessageAccess =
  | {
      allowed: true;
      role: "buyer" | "seller";
      otherParticipantId: string;
    }
  | {
      allowed: false;
      reason: "not_accepted" | "not_participant";
    };

type TradeMessageRow = {
  requestId: string;
  senderId: string;
  createdAt: string;
};

type TradeMessageAccessClient = {
  from: (table: string) => any;
};

type TradeMessageUnreadCountClient = {
  rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{
    data: Array<{ request_id: string; unread_count: number | string }> | null;
    error: unknown;
  }>;
};

type LoadedTradeMessageAccess = TradeMessageAccess & {
  request?: TradeMessageRequest;
  product?: TradeMessageProduct;
};

const chatStatuses = new Set<TradeMessageRequestStatus>([
  "accepted",
  "completed",
  "cancelled",
]);

export function isTradeMessagesEnabled(
  environment: Record<string, string | undefined> = process.env
) {
  return environment.TRADE_MESSAGES_ENABLED === "true";
}

export function getTradeMessageAccess({
  request,
  sellerId,
  userId,
}: TradeMessageAccessInput): TradeMessageAccess {
  if (!request.acceptedAt || !chatStatuses.has(request.status as TradeMessageRequestStatus)) {
    return { allowed: false, reason: "not_accepted" };
  }

  if (!sellerId) {
    return { allowed: false, reason: "not_participant" };
  }

  if (request.buyerId === userId) {
    return { allowed: true, role: "buyer", otherParticipantId: sellerId };
  }

  if (sellerId === userId) {
    return { allowed: true, role: "seller", otherParticipantId: request.buyerId };
  }

  return { allowed: false, reason: "not_participant" };
}

export function getUnreadCountByRequest({
  userId,
  messages,
  readAtByRequest,
}: {
  userId: string;
  messages: TradeMessageRow[];
  readAtByRequest: Map<string, string>;
}) {
  const counts = new Map<string, number>();

  for (const message of messages) {
    if (message.senderId === userId) continue;

    const lastReadAt = readAtByRequest.get(message.requestId);
    if (lastReadAt && message.createdAt <= lastReadAt) continue;

    counts.set(message.requestId, (counts.get(message.requestId) ?? 0) + 1);
  }

  return counts;
}

export async function loadTradeMessageAccess({
  supabase,
  requestId,
  userId,
}: {
  supabase: TradeMessageAccessClient;
  requestId: string;
  userId: string;
}): Promise<LoadedTradeMessageAccess> {
  const { data: requestRow, error: requestError } = await supabase
    .from("trade_requests")
    .select("request_id, product_id, buyer_id, quantity, note, status, accepted_at")
    .eq("request_id", requestId)
    .maybeSingle();

  if (requestError) throw requestError;
  if (!requestRow) return { allowed: false, reason: "not_participant" };

  const request: TradeMessageRequest = {
    requestId: requestRow.request_id,
    productId: requestRow.product_id,
    buyerId: requestRow.buyer_id,
    quantity: requestRow.quantity,
    note: requestRow.note,
    status: requestRow.status,
    acceptedAt: requestRow.accepted_at,
  };
  const { data: productRow, error: productError } = await supabase
    .from("products")
    .select("product_id, seller_id, name, price")
    .eq("product_id", requestRow.product_id)
    .maybeSingle();

  if (productError) throw productError;

  const product = productRow
    ? {
        id: String(productRow.product_id),
        sellerId: productRow.seller_id ?? null,
        name: productRow.name ?? "your listing",
        price: productRow.price ?? null,
      }
    : undefined;

  return {
    ...getTradeMessageAccess({ request, sellerId: product?.sellerId, userId }),
    request,
    product,
  };
}

export async function loadTradeMessageUnreadCounts({
  supabase,
  requestIds,
  userId,
}: {
  supabase: TradeMessageUnreadCountClient;
  requestIds: string[];
  userId: string;
}) {
  const uniqueRequestIds = [...new Set(requestIds.filter(Boolean))];
  if (uniqueRequestIds.length === 0) return new Map<string, number>();

  const { data, error } = await supabase.rpc(
    "get_trade_message_unread_counts",
    {
      p_request_ids: uniqueRequestIds,
      p_user_id: userId,
    }
  );

  if (error) throw error;

  return new Map(
    (data ?? []).map((row) => [
      row.request_id,
      Math.max(0, Number(row.unread_count) || 0),
    ])
  );
}
