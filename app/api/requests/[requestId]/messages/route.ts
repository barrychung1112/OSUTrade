import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/utils/supabase/admin";
import { notifyTradeEvent } from "@/app/lib/notifications";
import {
  isTradeMessagesEnabled,
  loadTradeMessageAccess,
  loadTradeMessageUnreadCounts,
} from "@/app/lib/tradeMessages";

const maxMessageLength = 1000;
const maxMessagesPerMinute = 10;
const messageIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = {
  params: Promise<{ requestId: string }>;
};

type MessageRow = {
  message_id: string;
  request_id: string;
  sender_id: string;
  body: string;
  client_message_id: string;
  created_at: string;
};

type MessageCursor = {
  createdAt: string;
};

function featureDisabled() {
  return NextResponse.json({ message: "Trade messages are not enabled." }, { status: 404 });
}

function toMessage(row: MessageRow) {
  return {
    id: row.message_id,
    requestId: row.request_id,
    senderId: row.sender_id,
    body: row.body,
    clientMessageId: row.client_message_id,
    createdAt: row.created_at,
  };
}

function parseLimit(value: string | null) {
  if (value === null) return 30;
  const limit = Number(value);
  return Number.isInteger(limit) && limit >= 1 && limit <= 50 ? limit : null;
}

function decodeCursor(value: string | null): MessageCursor | null | "invalid" {
  if (!value) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8")
    ) as MessageCursor;
    if (!parsed.createdAt || Number.isNaN(Date.parse(parsed.createdAt))) {
      return "invalid";
    }
    return { createdAt: parsed.createdAt };
  } catch {
    return "invalid";
  }
}

function encodeCursor(row: MessageRow) {
  return Buffer.from(JSON.stringify({ createdAt: row.created_at })).toString(
    "base64url"
  );
}

async function requireMessageAccess(requestId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { response: NextResponse.json({ message: "You must be logged in to use trade messages." }, { status: 401 }) };
  }

  const supabase = createAdminClient();
  const access = await loadTradeMessageAccess({
    supabase,
    requestId,
    userId: session.user.id,
  });

  if (!access.allowed || !access.request || !access.product) {
    return {
      response: NextResponse.json(
        { message: "You cannot access messages for this request." },
        { status: 403 }
      ),
    };
  }

  return { supabase, access, userId: session.user.id };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    if (!isTradeMessagesEnabled()) return featureDisabled();

    const { requestId } = await context.params;
    const accessResult = await requireMessageAccess(requestId);
    if ("response" in accessResult) return accessResult.response;

    const url = new URL(request.url);
    const limit = parseLimit(url.searchParams.get("limit"));
    const before = decodeCursor(url.searchParams.get("before"));
    if (limit === null || before === "invalid") {
      return NextResponse.json({ message: "Invalid message page parameters." }, { status: 400 });
    }

    let query = accessResult.supabase
      .from("trade_messages")
      .select("message_id, request_id, sender_id, body, client_message_id, created_at")
      .eq("request_id", requestId);

    if (before) {
      query = query.lt("created_at", before.createdAt);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(limit + 1);
    if (error) throw error;

    const rows = (data ?? []) as MessageRow[];
    const hasMore = rows.length > limit;
    const pageRows = rows.slice(0, limit);
    const unreadCounts = await loadTradeMessageUnreadCounts({
      supabase: accessResult.supabase,
      requestIds: [requestId],
      userId: accessResult.userId,
    });

    return NextResponse.json({
      data: pageRows.reverse().map(toMessage),
      nextCursor: hasMore ? encodeCursor(pageRows[pageRows.length - 1]) : null,
      unreadCount: unreadCounts.get(requestId) ?? 0,
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to load trade messages.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    if (!isTradeMessagesEnabled()) return featureDisabled();

    const { requestId } = await context.params;
    const accessResult = await requireMessageAccess(requestId);
    if ("response" in accessResult) return accessResult.response;

    let body: { body?: unknown; clientMessageId?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "Invalid message payload." }, { status: 400 });
    }

    const text = typeof body.body === "string" ? body.body.trim() : "";
    const clientMessageId =
      typeof body.clientMessageId === "string" ? body.clientMessageId.trim() : "";
    if (!text || text.length > maxMessageLength || !messageIdPattern.test(clientMessageId)) {
      return NextResponse.json(
        { message: "Message text and a valid client message ID are required." },
        { status: 400 }
      );
    }

    const { data: duplicate, error: duplicateError } = await accessResult.supabase
      .from("trade_messages")
      .select("message_id, request_id, sender_id, body, client_message_id, created_at")
      .eq("request_id", requestId)
      .eq("sender_id", accessResult.userId)
      .eq("client_message_id", clientMessageId)
      .maybeSingle();
    if (duplicateError) throw duplicateError;
    if (duplicate) {
      return NextResponse.json({ data: toMessage(duplicate as MessageRow), idempotent: true });
    }

    const { data: recentMessages, error: rateLimitError } = await accessResult.supabase
      .from("trade_messages")
      .select("message_id")
      .eq("request_id", requestId)
      .eq("sender_id", accessResult.userId)
      .gte("created_at", new Date(Date.now() - 60_000).toISOString())
      .limit(maxMessagesPerMinute);
    if (rateLimitError) throw rateLimitError;
    if ((recentMessages ?? []).length >= maxMessagesPerMinute) {
      return NextResponse.json(
        { message: "Please wait a moment before sending another message." },
        { status: 429 }
      );
    }

    const { data, error } = await accessResult.supabase
      .from("trade_messages")
      .insert({
        request_id: requestId,
        sender_id: accessResult.userId,
        body: text,
        client_message_id: clientMessageId,
      })
      .select("message_id, request_id, sender_id, body, client_message_id, created_at")
      .single();
    if (error) throw error;

    const recipientAudience =
      accessResult.access.role === "buyer" ? "seller" : "buyer";
    try {
      await notifyTradeEvent({
        supabase: accessResult.supabase,
        input: {
          type: "trade_message_received",
          recipientId: accessResult.access.otherParticipantId,
          actorId: accessResult.userId,
          request: {
            id: accessResult.access.request.requestId,
            quantity: accessResult.access.request.quantity ?? 1,
            note: accessResult.access.request.note,
          },
          product: {
            id: accessResult.access.product.id,
            name: accessResult.access.product.name,
            price: accessResult.access.product.price,
          },
          messageRecipientAudience: recipientAudience,
          messagePreview: text,
        },
        recipientEmail: undefined,
      });
    } catch (notificationError) {
      console.error("Failed to create trade message notification.", notificationError);
    }

    return NextResponse.json({ data: toMessage(data as MessageRow) }, { status: 201 });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to send trade message.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
