import { isExpiredSentRequest } from "./requestExpiry";
import { sendEmail as defaultSendEmail, type SendEmail } from "./email";

export type TradeNotificationType =
  | "request_created"
  | "request_accepted"
  | "request_declined"
  | "request_cancelled"
  | "request_cancelled_by_seller"
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

function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://osutrade.com"
  ).replace(/\/$/, "");
}

function buildActionUrl(path: string) {
  return `${getAppUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

function formatBuyerNote(note: string | null | undefined) {
  const trimmed = note?.trim();
  return trimmed ? trimmed : "No note provided.";
}

function buildEmailText({
  intro,
  productName,
  quantity,
  buyerNote,
  status,
  nextStep,
  actionLabel,
  actionHref,
  closing,
}: {
  intro: string;
  productName: string;
  quantity: number;
  buyerNote?: string | null;
  status: string;
  nextStep: string;
  actionLabel: string;
  actionHref: string;
  closing: string;
}) {
  const details = [
    `Item: ${productName}`,
    `Quantity: ${quantity}`,
    buyerNote === undefined ? null : `Buyer note: ${formatBuyerNote(buyerNote)}`,
    `Status: ${status}`,
  ].filter(Boolean);

  return [
    "Hi,",
    "",
    intro,
    "",
    ...details,
    "",
    `Next step: ${nextStep}`,
    "",
    `${actionLabel}:`,
    buildActionUrl(actionHref),
    "",
    closing,
    "",
    "OSUTrade",
    "Campus secondhand marketplace",
  ].join("\n");
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
      emailSubject: `[OSUTrade] New request for ${productName}`,
      emailText: buildEmailText({
        intro: "You received a new buyer request on OSUTrade.",
        productName,
        quantity,
        buyerNote: input.request.note,
        status: "Waiting for your response",
        nextStep:
          "Open your Seller Dashboard to accept or decline this request.",
        actionLabel: "Open Seller Dashboard",
        actionHref: "/seller",
        closing:
          "If you accept the request, OSUTrade will share contact details so both sides can arrange pickup.",
      }),
      actionHref: "/seller",
    };
  }

  if (input.type === "request_accepted") {
    return {
      ...base,
      title: `Request accepted for ${productName}`,
      body: "The seller accepted your request. Contact details are now available.",
      emailSubject: `[OSUTrade] Your request was accepted: ${productName}`,
      emailText: buildEmailText({
        intro: "Good news. The seller accepted your request.",
        productName,
        quantity,
        status: "Accepted",
        nextStep:
          "Open My Requests to view contact details and arrange pickup.",
        actionLabel: "Open My Requests",
        actionHref: "/requests",
        closing:
          "Contact the seller directly from the shared details and confirm pickup time and location.",
      }),
      actionHref: "/requests",
    };
  }

  if (input.type === "request_declined") {
    return {
      ...base,
      title: `Request declined for ${productName}`,
      body: "The seller declined your request.",
      emailSubject: `[OSUTrade] Your request was declined: ${productName}`,
      emailText: buildEmailText({
        intro: "The seller declined your request on OSUTrade.",
        productName,
        quantity,
        status: "Declined",
        nextStep:
          "Open My Requests to review the update, or browse the marketplace for another listing.",
        actionLabel: "Open My Requests",
        actionHref: "/requests",
        closing:
          "You can send a new request if the seller relists the item or choose another available listing.",
      }),
      actionHref: "/requests",
    };
  }

  if (input.type === "request_cancelled") {
    return {
      ...base,
      title: `Request cancelled for ${productName}`,
      body: "The buyer cancelled their request.",
      emailSubject: `[OSUTrade] Request cancelled: ${productName}`,
      emailText: buildEmailText({
        intro: "A buyer cancelled their request on OSUTrade.",
        productName,
        quantity,
        buyerNote: input.request.note,
        status: "Cancelled",
        nextStep:
          "Open your Seller Dashboard to review your active listings and requests.",
        actionLabel: "Open Seller Dashboard",
        actionHref: "/seller",
        closing:
          "No action is required unless you want to update the listing status or quantity.",
      }),
      actionHref: "/seller",
    };
  }

  if (input.type === "request_cancelled_by_seller") {
    return {
      ...base,
      title: `Trade did not complete for ${productName}`,
      body:
        "The seller marked this trade as not completed. The item is available again.",
      emailSubject: `[OSUTrade] Trade did not complete: ${productName}`,
      emailText: buildEmailText({
        intro: "The seller marked this trade as not completed.",
        productName,
        quantity,
        status: "Cancelled by seller",
        nextStep:
          "Open My Requests to review the update or browse the marketplace again.",
        actionLabel: "Open My Requests",
        actionHref: "/requests",
        closing:
          "The reserved quantity has been returned to the marketplace.",
      }),
      actionHref: "/requests",
    };
  }

  const oldPrice = input.priceChange?.oldPrice ?? 0;
  const newPrice = input.priceChange?.newPrice ?? 0;

  return {
    ...base,
    title: `Price changed for ${productName}`,
    body: `The seller changed the price from ${formatPrice(oldPrice)} to ${formatPrice(newPrice)}. Accepted trades keep their agreed price.`,
    emailSubject: `[OSUTrade] Price update: ${productName}`,
    emailText: [
      "Hi,",
      "",
      "A seller changed the price for an item you requested on OSUTrade.",
      "",
      `Item: ${productName}`,
      `Old price: ${formatPrice(oldPrice)}`,
      `New price: ${formatPrice(newPrice)}`,
      "Status: Price updated",
      "",
      "Next step: Open My Requests to review the update. Accepted trades keep their agreed price.",
      "",
      "Open My Requests:",
      buildActionUrl("/requests"),
      "",
      "OSUTrade",
      "Campus secondhand marketplace",
    ].join("\n"),
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
      text: notification.emailText,
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
