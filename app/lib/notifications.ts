import { isExpiredSentRequest } from "./requestExpiry";
import { sendEmail as defaultSendEmail, type SendEmail } from "./email";

export type TradeNotificationType =
  | "request_created"
  | "request_accepted"
  | "request_declined"
  | "request_cancelled"
  | "price_changed";

export type TradeNotificationInput = {
  type: TradeNotificationType;
  recipientId: string;
  actorId?: string | null;
  request: {
    id: string;
    quantity: number;
    note?: string | null;
    priceAtRequest?: number | string | null;
  };
  product: {
    id: string | number;
    name: string;
    price?: number | string | null;
  };
  priceChange?: {
    oldPrice: number;
    newPrice: number;
  };
};

export type BuiltNotification = {
  type: TradeNotificationType;
  recipientId: string;
  actorId: string | null;
  title: string;
  body: string;
  emailSubject: string;
  emailText: string;
  actionHref: string;
  requestId: string;
  productId: string;
  payload: Record<string, unknown>;
};

type NotificationSupabase = {
  from: (table: string) => any;
};

type NotifyTradeEventOptions = {
  supabase: NotificationSupabase;
  input: TradeNotificationInput;
  recipientEmail?: string | null;
  sendEmail?: SendEmail;
};

type PriceChangeRequestRow = {
  request_id: string;
  buyer_id: string;
  status: string;
  created_at: string;
  price_at_request?: number | string | null;
};

function formatPrice(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return `$${amount.toFixed(2)}`;
}

function normalizePrice(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function buildTradeNotification(
  input: TradeNotificationInput
): BuiltNotification {
  const productName = input.product.name || "your listing";
  const quantity = input.request.quantity;
  const payload: Record<string, unknown> = {
    productName,
    quantity,
    note: input.request.note ?? "",
    priceAtRequest: normalizePrice(input.request.priceAtRequest),
  };

  if (input.priceChange) {
    payload.oldPrice = input.priceChange.oldPrice;
    payload.newPrice = input.priceChange.newPrice;
  }

  const base = {
    type: input.type,
    recipientId: input.recipientId,
    actorId: input.actorId ?? null,
    requestId: input.request.id,
    productId: String(input.product.id),
    payload,
  };

  if (input.type === "request_created") {
    return {
      ...base,
      title: `New request for ${productName}`,
      body: `A buyer requested ${quantity} item(s). Review it from your seller dashboard.`,
      emailSubject: `New OSUTrade request: ${productName}`,
      emailText: `A buyer requested ${quantity} item(s) of ${productName}. Open your seller dashboard to accept or decline the request.`,
      actionHref: "/seller",
    };
  }

  if (input.type === "request_accepted") {
    return {
      ...base,
      title: `Request accepted for ${productName}`,
      body: "The seller accepted your request. Contact details are now available.",
      emailSubject: `Your OSUTrade request was accepted: ${productName}`,
      emailText: `The seller accepted your request for ${productName}. Open My Requests to view contact details.`,
      actionHref: "/requests",
    };
  }

  if (input.type === "request_declined") {
    return {
      ...base,
      title: `Request declined for ${productName}`,
      body: "The seller declined your request.",
      emailSubject: `Your OSUTrade request was declined: ${productName}`,
      emailText: `The seller declined your request for ${productName}. You can browse other available listings on OSUTrade.`,
      actionHref: "/requests",
    };
  }

  if (input.type === "request_cancelled") {
    return {
      ...base,
      title: `Request cancelled for ${productName}`,
      body: "The buyer cancelled their request.",
      emailSubject: `OSUTrade request cancelled: ${productName}`,
      emailText: `A buyer cancelled their request for ${productName}.`,
      actionHref: "/seller",
    };
  }

  const oldPrice = input.priceChange?.oldPrice ?? 0;
  const newPrice = input.priceChange?.newPrice ?? 0;

  return {
    ...base,
    title: `Price changed for ${productName}`,
    body: `The seller changed the price from ${formatPrice(oldPrice)} to ${formatPrice(newPrice)}. Accepted trades keep their agreed price.`,
    emailSubject: `OSUTrade price update: ${productName}`,
    emailText: `The seller changed ${productName} from ${formatPrice(oldPrice)} to ${formatPrice(newPrice)}. Accepted trades keep their agreed price.`,
    actionHref: "/requests",
  };
}

export async function notifyTradeEvent({
  supabase,
  input,
  recipientEmail,
  sendEmail = defaultSendEmail,
}: NotifyTradeEventOptions) {
  const notification = buildTradeNotification(input);
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      recipient_id: notification.recipientId,
      actor_id: notification.actorId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      request_id: notification.requestId,
      product_id: notification.productId,
      payload: {
        ...notification.payload,
        actionHref: notification.actionHref,
      },
    })
    .select("notification_id")
    .single();

  if (error) {
    throw error;
  }

  const notificationId = data?.notification_id as string | undefined;

  if (!recipientEmail || !notificationId) {
    return { notificationId, emailSent: false, emailError: null };
  }

  try {
    await sendEmail({
      to: recipientEmail,
      subject: notification.emailSubject,
      text: `${notification.emailText}\n\nOpen OSUTrade: ${notification.actionHref}`,
    });
    await supabase
      .from("notifications")
      .update({ emailed_at: new Date().toISOString(), email_error: null })
      .eq("notification_id", notificationId);

    return { notificationId, emailSent: true, emailError: null };
  } catch (error) {
    const emailError =
      error instanceof Error ? error.message : "Failed to send notification email.";
    await supabase
      .from("notifications")
      .update({ email_error: emailError })
      .eq("notification_id", notificationId);

    return { notificationId, emailSent: false, emailError };
  }
}

export function getActivePriceChangeRecipients(
  rows: PriceChangeRequestRow[],
  newPriceValue: number | string | null | undefined,
  now = new Date()
) {
  const newPrice = normalizePrice(newPriceValue);
  if (newPrice === null) return [];

  return rows
    .filter((row) => {
      const oldPrice = normalizePrice(row.price_at_request);
      return (
        row.status === "sent" &&
        oldPrice !== null &&
        oldPrice !== newPrice &&
        !isExpiredSentRequest({ ...row, now: now.getTime() })
      );
    })
    .map((row) => ({
      requestId: row.request_id,
      buyerId: row.buyer_id,
      oldPrice: normalizePrice(row.price_at_request) as number,
      newPrice,
    }));
}
