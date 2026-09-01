"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { Check, Mail, RotateCcw, X } from "lucide-react";
import SellerRequestCenter from "./SellerRequestCenter";
import { useI18n } from "../i18n";
import {
  requestCenterOpenEvent,
  requestCenterVisibleEvent,
  shownRequestEventsStorageKey,
  type RequestCenterAudience,
  type RequestCenterEventDetail,
} from "../lib/requestCenterEvents";

type RequestItem = {
  id: string;
  itemId: string;
  buyerId: string;
  buyerEmail?: string | null;
  sellerContact?: {
    email?: string | null;
    phone?: string | null;
    lineId?: string | null;
    wechatId?: string | null;
  } | null;
  quantity: number;
  note: string;
  status: string;
  createdAt: string;
  product?: {
    name: string;
    price?: number | null;
    imageUrl?: string | null;
  } | null;
};

function getShownEvents() {
  try {
    return new Set<string>(
      JSON.parse(sessionStorage.getItem(shownRequestEventsStorageKey) ?? "[]")
    );
  } catch {
    return new Set<string>();
  }
}

function saveShownEvent(notificationId?: string) {
  if (!notificationId) return;
  const shown = getShownEvents();
  shown.add(notificationId);
  sessionStorage.setItem(shownRequestEventsStorageKey, JSON.stringify([...shown]));
}

function hasBlockingUi() {
  return Boolean(
    document.querySelector(
      '[data-request-center-blocking="true"], [role="dialog"][data-state="open"]'
    )
  );
}

export default function TradeRequestCenterProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { status: sessionStatus } = useSession();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [audience, setAudience] = useState<RequestCenterAudience>("seller");
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [focusedRequestId, setFocusedRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const deferredEvent = useRef<RequestCenterEventDetail | null>(null);
  const visibleNotificationId = useRef<string | undefined>(undefined);

  const loadRequests = useCallback(async (nextAudience: RequestCenterAudience) => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = nextAudience === "seller" ? "/api/seller/requests" : "/api/requests";
      const response = await fetch(endpoint, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Failed to load requests.");
      setRequests(payload.data ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  const showEvent = useCallback(
    (detail: RequestCenterEventDetail) => {
      if (detail.notificationId && getShownEvents().has(detail.notificationId)) return;
      if (hasBlockingUi()) {
        deferredEvent.current = detail;
        return;
      }
      saveShownEvent(detail.notificationId);
      visibleNotificationId.current = detail.notificationId;
      setAudience(detail.audience);
      setFocusedRequestId(detail.requestId ?? null);
      setOpen(true);
      void loadRequests(detail.audience);
    },
    [loadRequests]
  );

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    const onOpen = (event: Event) =>
      showEvent((event as CustomEvent<RequestCenterEventDetail>).detail);
    window.addEventListener(requestCenterOpenEvent, onOpen);
    return () => window.removeEventListener(requestCenterOpenEvent, onOpen);
  }, [sessionStatus, showEvent]);

  useEffect(() => {
    if (!deferredEvent.current) return;
    const timer = window.setInterval(() => {
      if (hasBlockingUi() || !deferredEvent.current) return;
      const detail = deferredEvent.current;
      deferredEvent.current = null;
      showEvent(detail);
    }, 500);
    return () => window.clearInterval(timer);
  });

  useEffect(() => {
    if (!open || loading || !focusedRequestId) return;
    const node = document.querySelector(`[data-request-id="${focusedRequestId}"]`);
    if (!node) return;
    if ("scrollIntoView" in node) {
      node.scrollIntoView({ block: "center" });
    }
    window.dispatchEvent(
      new CustomEvent(requestCenterVisibleEvent, {
        detail: {
          requestId: focusedRequestId,
          notificationId: visibleNotificationId.current,
        },
      })
    );
  }, [focusedRequestId, loading, open]);

  async function updateSellerRequest(
    requestId: string,
    action: "accept" | "decline" | "complete" | "cancel"
  ) {
    if (
      action === "cancel" &&
      !window.confirm(t("seller.requestCancelConfirm"))
    ) {
      return;
    }
    if (
      action === "complete" &&
      !window.confirm(t("seller.requestCompleteConfirm"))
    ) {
      return;
    }

    setBusyId(requestId);
    setError(null);
    try {
      const response = await fetch("/api/seller/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Failed to update request.");
      setRequests((current) =>
        current.map((item) => (item.id === requestId ? payload.request : item))
      );
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update request.");
    } finally {
      setBusyId(null);
    }
  }

  const active = requests.filter(
    (request) => request.status === "sent" || request.status === "accepted"
  );
  const history = requests.filter(
    (request) => request.status !== "sent" && request.status !== "accepted"
  );

  return (
    <>
      {children}
      <SellerRequestCenter
        open={open}
        onOpenChange={setOpen}
        pendingCount={active.length}
        title={t("seller.requestCenter")}
        description={t("seller.requestCenterDescription")}
        triggerLabel={t("seller.requestCenter")}
        closeLabel={t("seller.closeRequestCenter")}
        showTrigger={false}
      >
        {loading ? (
          <p className="p-5 text-sm text-gray-600">{t("common.loading")}</p>
        ) : error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : requests.length === 0 ? (
          <p className="p-5 text-center text-sm text-gray-500">{t("seller.noRequests")}</p>
        ) : (
          <div className="space-y-5">
            <RequestGroup title={t("seller.activeRequests")}>
              {active.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  audience={audience}
                  focused={request.id === focusedRequestId}
                  busy={busyId === request.id}
                  onAction={(action) => updateSellerRequest(request.id, action)}
                  t={t}
                />
              ))}
            </RequestGroup>
            {history.length > 0 && (
              <RequestGroup title={t("seller.requestHistory")}>
                {history.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    audience={audience}
                    focused={request.id === focusedRequestId}
                    busy={false}
                    onAction={() => undefined}
                    t={t}
                  />
                ))}
              </RequestGroup>
            )}
          </div>
        )}
      </SellerRequestCenter>
    </>
  );
}

function RequestGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-bold text-gray-900">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function RequestCard({
  request,
  audience,
  focused,
  busy,
  onAction,
  t,
}: {
  request: RequestItem;
  audience: RequestCenterAudience;
  focused: boolean;
  busy: boolean;
  onAction: (action: "accept" | "decline" | "complete" | "cancel") => void;
  t: (key: any, values?: Record<string, string | number>) => string;
}) {
  const contact = audience === "seller" ? request.buyerEmail : request.sellerContact?.email;
  return (
    <article
      data-request-id={request.id}
      className={`overflow-hidden rounded-lg border bg-white transition ${
        focused ? "border-[#d73f09] ring-2 ring-orange-100" : "border-orange-100"
      }`}
    >
      <div className="flex gap-3 p-4">
        <img
          src={request.product?.imageUrl || "/images/Bike_0.jpg"}
          alt=""
          className="h-16 w-16 shrink-0 rounded-md object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex justify-between gap-3">
            <strong className="truncate text-gray-950">{request.product?.name || request.itemId}</strong>
            <span className="rounded-full bg-orange-50 px-2 py-1 text-xs font-bold text-[#d73f09]">
              {t(`requests.status.${request.status}`)}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            {t("requests.qty", { quantity: request.quantity })}
          </p>
          {request.note && <p className="mt-2 text-sm text-gray-700">{request.note}</p>}
        </div>
      </div>

      {request.status === "accepted" && (
        <div className="mx-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <p className="font-semibold">{t("seller.requestContactReady")}</p>
          {contact && (
            <a className="mt-1 inline-flex items-center gap-1 underline" href={`mailto:${contact}`}>
              <Mail className="h-4 w-4" /> {contact}
            </a>
          )}
        </div>
      )}

      {audience === "seller" && (request.status === "sent" || request.status === "accepted") && (
        <div className="request-center-card-actions mt-4 flex flex-wrap gap-2 border-t border-orange-100 bg-slate-50 px-4 py-3">
          {request.status === "sent" ? (
            <>
              <button className="app-button-primary" disabled={busy} onClick={() => onAction("accept")}>
                <Check className="h-4 w-4" /> {t("seller.accept")}
              </button>
              <button className="app-button-danger" disabled={busy} onClick={() => onAction("decline")}>
                <X className="h-4 w-4" /> {t("seller.decline")}
              </button>
            </>
          ) : (
            <>
              <button className="app-button-primary" disabled={busy} onClick={() => onAction("complete")}>
                <Check className="h-4 w-4" /> {t("seller.requestComplete")}
              </button>
              <button className="app-button-secondary" disabled={busy} onClick={() => onAction("cancel")}>
                <RotateCcw className="h-4 w-4" /> {t("seller.requestNotCompleted")}
              </button>
            </>
          )}
        </div>
      )}
    </article>
  );
}
