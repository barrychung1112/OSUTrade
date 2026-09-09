"use client";

import { ArrowLeft, MessageCircle, RefreshCw, Send } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useI18n } from "../i18n";
import { subscribeToTradeMessages } from "../lib/tradeMessageRealtime";

type TradeMessage = {
  id: string;
  requestId: string;
  senderId: string;
  body: string;
  clientMessageId: string;
  createdAt: string;
  optimistic?: boolean;
  failed?: boolean;
};

type ConversationRequest = {
  id: string;
  status: string;
  product?: { name: string } | null;
};

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function createClientMessageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  throw new Error("Your browser cannot create a secure message ID.");
}

export default function TradeMessageConversation({
  request,
  currentUserId,
  onBack,
}: {
  request: ConversationRequest;
  currentUserId: string;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<TradeMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);

  const loadMessages = useCallback(
    async ({ acknowledgeRead = true }: { acknowledgeRead?: boolean } = {}) => {
      setError(null);
      try {
        const response = await fetch(`/api/requests/${request.id}/messages?limit=50`, {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as {
          data?: TradeMessage[];
          message?: string;
        } | null;
        if (!response.ok) {
          throw new Error(payload?.message || t("tradeMessages.loadError"));
        }

        setMessages(payload?.data ?? []);
        if (acknowledgeRead) {
          void fetch(`/api/requests/${request.id}/messages/read`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : t("tradeMessages.loadError"));
      } finally {
        setLoading(false);
      }
    },
    [request.id, t]
  );

  useEffect(() => {
    setMessages([]);
    setDraft("");
    setLoading(true);
    setRealtimeStatus(null);
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    try {
      return subscribeToTradeMessages({
        requestId: request.id,
        currentUserId,
        onMessage: () => void loadMessages(),
        onStatus: (status) => {
          setRealtimeStatus(status === "SUBSCRIBED" ? null : status);
        },
      });
    } catch {
      setRealtimeStatus("TOKEN_ERROR");
      return undefined;
    }
  }, [currentUserId, loadMessages, request.id]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages]);

  useEffect(() => {
    titleRef.current?.focus();
  }, [request.id]);

  async function sendMessage(message: TradeMessage) {
    setError(null);
    setMessages((current) =>
      current.map((item) =>
        item.clientMessageId === message.clientMessageId
          ? { ...item, failed: false }
          : item
      )
    );

    try {
      const response = await fetch(`/api/requests/${request.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: message.body,
          clientMessageId: message.clientMessageId,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        data?: TradeMessage;
        message?: string;
      } | null;
      if (!response.ok || !payload?.data) {
        throw new Error(payload?.message || t("tradeMessages.sendError"));
      }

      setMessages((current) =>
        current.map((item) =>
          item.clientMessageId === message.clientMessageId ? payload.data! : item
        )
      );
    } catch (sendError) {
      const messageText =
        sendError instanceof Error ? sendError.message : t("tradeMessages.sendError");
      setError(messageText);
      setMessages((current) =>
        current.map((item) =>
          item.clientMessageId === message.clientMessageId
            ? { ...item, failed: true }
            : item
        )
      );
    }
  }

  function submitMessage() {
    const body = draft.trim();
    if (!body) return;

    let clientMessageId: string;
    try {
      clientMessageId = createClientMessageId();
    } catch (idError) {
      setError(idError instanceof Error ? idError.message : t("tradeMessages.sendError"));
      return;
    }

    const message: TradeMessage = {
      id: clientMessageId,
      requestId: request.id,
      senderId: currentUserId,
      body,
      clientMessageId,
      createdAt: new Date().toISOString(),
      optimistic: true,
    };
    setDraft("");
    setMessages((current) => [...current, message]);
    void sendMessage(message);
  }

  return (
    <section className="trade-message-conversation" aria-label={t("tradeMessages.title")}>
      <header className="trade-message-header">
        <button type="button" className="trade-message-back" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("tradeMessages.back")}
        </button>
        <div className="min-w-0">
          <p className="trade-message-kicker">{t("tradeMessages.title")}</p>
          <h3 ref={titleRef} tabIndex={-1} className="truncate text-base font-bold text-gray-950">
            {request.product?.name || request.id}
          </h3>
          <p className="text-xs text-gray-500">{t(`requests.status.${request.status}` as any)}</p>
        </div>
        <MessageCircle className="h-5 w-5 shrink-0 text-[#d73f09]" aria-hidden="true" />
      </header>

      {realtimeStatus && (
        <p className="trade-message-reconnect" role="status">
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> {t("tradeMessages.reconnecting")}
        </p>
      )}

      <div ref={listRef} className="trade-message-history" aria-live="polite">
        {loading ? (
          <p className="trade-message-empty">{t("tradeMessages.loading")}</p>
        ) : messages.length === 0 ? (
          <p className="trade-message-empty">{t("tradeMessages.empty")}</p>
        ) : (
          messages.map((message) => {
            const isOwn = message.senderId === currentUserId;
            return (
              <div
                key={message.clientMessageId}
                className={`trade-message-row ${isOwn ? "is-own" : ""}`}
              >
                <div className={`trade-message-bubble ${isOwn ? "is-own" : ""}`}>
                  <p>{message.body}</p>
                  <span>
                    {isOwn ? t("tradeMessages.you") : t("tradeMessages.otherParticipant")} · {formatMessageTime(message.createdAt)}
                  </span>
                </div>
                {message.failed && (
                  <button
                    type="button"
                    className="trade-message-retry"
                    onClick={() => void sendMessage(message)}
                  >
                    {t("tradeMessages.retry")}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {error && <p className="trade-message-error" role="alert">{error}</p>}

      <form
        className="trade-message-composer"
        onSubmit={(event) => {
          event.preventDefault();
          submitMessage();
        }}
      >
        <label className="sr-only" htmlFor={`trade-message-${request.id}`}>
          {t("tradeMessages.messageLabel")}
        </label>
        <textarea
          id={`trade-message-${request.id}`}
          rows={1}
          value={draft}
          maxLength={1000}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t("tradeMessages.placeholder")}
        />
        <div className="trade-message-composer-actions">
          <span>{t("tradeMessages.characters", { count: draft.length })}</span>
          <button type="submit" className="app-button-primary" disabled={!draft.trim()}>
            <Send className="h-4 w-4" aria-hidden="true" /> {t("tradeMessages.send")}
          </button>
        </div>
      </form>
    </section>
  );
}
