"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BellIcon, CheckIcon } from "@radix-ui/react-icons";
import {
  getNewActionableRequestEvent,
  getUnreadIncrease,
} from "../lib/notificationClient";
import {
  openRequestCenter,
  requestCenterVisibleEvent,
} from "../lib/requestCenterEvents";
import { useI18n } from "../i18n";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  actionHref: string | null;
  readAt: string | null;
  createdAt: string;
  requestId: string | null;
};

type NotificationsPayload = {
  data?: NotificationItem[];
  unreadCount?: number;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function NotificationBell() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const previousUnreadCount = useRef<number | null>(null);
  const previousNotificationIds = useRef<Set<string> | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  async function loadNotifications() {
    const response = await fetch("/api/notifications", { cache: "no-store" });
    if (!response.ok) return;

    const payload = (await response.json()) as NotificationsPayload;
    const nextUnreadCount = payload.unreadCount ?? 0;
    const increase = getUnreadIncrease(
      previousUnreadCount.current,
      nextUnreadCount
    );
    const nextNotifications = payload.data ?? [];
    const requestEvent = getNewActionableRequestEvent(
      previousNotificationIds.current,
      nextNotifications
    );

    if (increase > 0) {
      setToast(t("notifications.toastNew", { count: increase }));
      window.setTimeout(() => setToast(null), 5000);
    }

    if (requestEvent) {
      openRequestCenter(requestEvent);
    }

    previousUnreadCount.current = nextUnreadCount;
    previousNotificationIds.current = new Set(
      nextNotifications.map((notification) => notification.id)
    );
    setNotifications(nextNotifications);
    setUnreadCount(nextUnreadCount);
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    await loadNotifications();
  }

  useEffect(() => {
    void loadNotifications();
    const timer = window.setInterval(() => {
      void loadNotifications();
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const markVisibleRequestRead = (event: Event) => {
      const notificationId = (
        event as CustomEvent<{ notificationId?: string }>
      ).detail?.notificationId;
      if (!notificationId) return;
      void fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      }).then(() => loadNotifications());
    };
    window.addEventListener(requestCenterVisibleEvent, markVisibleRequestRead);
    return () =>
      window.removeEventListener(requestCenterVisibleEvent, markVisibleRequestRead);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const recentNotifications = notifications.slice(0, 5);

  return (
    <div ref={menuRef} className="relative inline-flex shrink-0">
      <button
        type="button"
        aria-label={t("notifications.title")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="app-action-icon relative"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#d73f09] px-1 text-[11px] font-bold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-[80] w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-orange-100 bg-white p-2 text-sm shadow-xl ring-1 ring-black/5"
        >
          <div className="flex items-center justify-between gap-3 px-2 py-2">
            <p className="font-semibold text-gray-900">{t("notifications.title")}</p>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-[#d73f09] transition hover:bg-orange-50 disabled:text-gray-400"
            >
              <CheckIcon /> {t("notifications.markAllRead")}
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-gray-500">
                {t("notifications.empty")}
              </p>
            ) : (
              recentNotifications.map((item) => {
                const content = (
                  <div
                    className={`rounded-md px-2 py-2 transition hover:bg-orange-50 ${
                      item.readAt ? "text-gray-600" : "bg-orange-50/60 text-gray-900"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold leading-5">{item.title}</p>
                      {!item.readAt && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#d73f09]" />
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-600">
                      {item.body}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                );

                return item.actionHref ? (
                  <Link
                    role="menuitem"
                    key={item.id}
                    href={item.actionHref}
                    onClick={() => setOpen(false)}
                    className="block"
                  >
                    {content}
                  </Link>
                ) : (
                  <div role="menuitem" key={item.id}>
                    {content}
                  </div>
                );
              })
            )}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="mt-2 flex h-10 items-center justify-center rounded-md border border-orange-100 text-sm font-semibold text-[#d73f09] transition hover:bg-orange-50"
          >
            {t("notifications.viewAll")}
          </Link>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="fixed right-4 top-20 z-[90] max-w-xs rounded-lg border border-orange-100 bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-xl"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
