"use client";

import { createClient, type RealtimeChannel } from "@supabase/supabase-js";

type RealtimeToken = {
  token: string;
  expiresAt: number;
};

type TradeMessageBroadcast = {
  requestId?: unknown;
  messageId?: unknown;
  senderId?: unknown;
  createdAt?: unknown;
};

type TradeMessageRealtimeSubscription = {
  requestId: string;
  currentUserId: string;
  onMessage: (message: {
    requestId: string;
    messageId: string;
    senderId: string;
    createdAt: string;
  }) => void;
  onStatus?: (status: string) => void;
};

let cachedToken: RealtimeToken | null = null;
let tokenRequest: Promise<string> | null = null;
const tokenRefreshIntervalMs = 4 * 60 * 1000;

function getPublicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase public credentials are not configured.");
  }

  return { url, anonKey };
}

async function requestRealtimeToken() {
  const response = await fetch("/api/realtime/trade-messages-token", {
    cache: "no-store",
    credentials: "same-origin",
  });
  const payload = (await response.json().catch(() => null)) as {
    token?: unknown;
    expiresAt?: unknown;
    message?: unknown;
  } | null;

  if (!response.ok || typeof payload?.token !== "string") {
    throw new Error(
      typeof payload?.message === "string"
        ? payload.message
        : "Unable to connect to trade messages."
    );
  }

  const expiresAt =
    typeof payload.expiresAt === "string" ? Date.parse(payload.expiresAt) : NaN;
  if (Number.isNaN(expiresAt)) {
    throw new Error("Trade message realtime returned an invalid token expiry.");
  }

  cachedToken = { token: payload.token, expiresAt };
  return payload.token;
}

export async function getTradeMessageRealtimeToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 15_000) {
    return cachedToken.token;
  }

  if (!tokenRequest) {
    tokenRequest = requestRealtimeToken().finally(() => {
      tokenRequest = null;
    });
  }

  return tokenRequest;
}

async function refreshTradeMessageRealtimeToken() {
  cachedToken = null;
  return getTradeMessageRealtimeToken();
}

function isTradeMessageBroadcast(
  payload: TradeMessageBroadcast,
  requestId: string
): payload is Required<TradeMessageBroadcast> {
  return (
    payload.requestId === requestId &&
    typeof payload.messageId === "string" &&
    typeof payload.senderId === "string" &&
    typeof payload.createdAt === "string"
  );
}

export function subscribeToTradeMessages({
  requestId,
  currentUserId,
  onMessage,
  onStatus,
}: TradeMessageRealtimeSubscription) {
  const { url, anonKey } = getPublicSupabaseConfig();
  const supabase = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    accessToken: getTradeMessageRealtimeToken,
  });
  let closed = false;
  const seenMessageIds = new Set<string>();
  const channel: RealtimeChannel = supabase
    .channel(`trade-message:${requestId}`, { config: { private: true } })
    .on("broadcast", { event: "message_created" }, ({ payload }) => {
      if (closed || !isTradeMessageBroadcast(payload as TradeMessageBroadcast, requestId)) {
        return;
      }
      if (payload.senderId === currentUserId) return;
      if (seenMessageIds.has(payload.messageId)) return;
      seenMessageIds.add(payload.messageId);

      onMessage({
        requestId,
        messageId: payload.messageId,
        senderId: payload.senderId,
        createdAt: payload.createdAt,
      });
    })
    .subscribe((status) => onStatus?.(status));

  const tokenRefreshTimer = window.setInterval(() => {
    void refreshTradeMessageRealtimeToken()
      .then((token) => supabase.realtime.setAuth(token))
      .catch(() => onStatus?.("TOKEN_ERROR"));
  }, tokenRefreshIntervalMs);

  return () => {
    closed = true;
    window.clearInterval(tokenRefreshTimer);
    void supabase.removeChannel(channel);
  };
}

export function resetTradeMessageRealtimeTokenCache() {
  cachedToken = null;
  tokenRequest = null;
}
