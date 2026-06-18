"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Card, Heading, Text, Theme } from "@radix-ui/themes";
import { CheckIcon, ReloadIcon } from "@radix-ui/react-icons";
import EmptyState from "../components/EmptyState";
import Header from "../components/Header";
import { useI18n } from "../i18n";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  actionHref: string | null;
  readAt: string | null;
  createdAt: string;
};

type NotificationsPayload = {
  data?: NotificationItem[];
  unreadCount?: number;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function NotificationsPage() {
  const { t } = useI18n();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadNotifications(options: { refresh?: boolean } = {}) {
    if (options.refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load notifications.");
      }

      const payload = (await response.json()) as NotificationsPayload;
      setNotifications(payload.data ?? []);
      setUnreadCount(payload.unreadCount ?? 0);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load notifications."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    await loadNotifications({ refresh: true });
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !item.readAt),
    [notifications]
  );

  return (
    <Theme>
      <Header />
      <main className="app-page">
        <div className="app-container">
          <section className="app-hero flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="app-eyebrow">{t("notifications.eyebrow")}</p>
              <Heading as="h1" size="8" className="app-title">
                {t("notifications.title")}
              </Heading>
              <Text as="p" className="app-subtitle">
                {t("notifications.subtitle", {
                  unread: unreadCount,
                  total: notifications.length,
                })}
              </Text>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="soft"
                color="orange"
                onClick={() => loadNotifications({ refresh: true })}
                disabled={refreshing}
              >
                <ReloadIcon />{" "}
                {refreshing ? t("common.refreshing") : t("common.refresh")}
              </Button>
              <Button
                color="orange"
                onClick={markAllRead}
                disabled={unreadNotifications.length === 0}
              >
                <CheckIcon /> {t("notifications.markAllRead")}
              </Button>
            </div>
          </section>

          {error && (
            <Card className="mb-5 border border-red-200 bg-red-50 p-4 text-red-700">
              {error}
            </Card>
          )}

          {loading ? (
            <Card className="app-card p-5">{t("notifications.loading")}</Card>
          ) : notifications.length === 0 ? (
            <EmptyState
              title={t("notifications.empty")}
              body={t("notifications.emptyHelp")}
            />
          ) : (
            <section className="grid gap-3">
              {notifications.map((item) => (
                <NotificationRow key={item.id} item={item} />
              ))}
            </section>
          )}
        </div>
      </main>
    </Theme>
  );
}

function NotificationRow({ item }: { item: NotificationItem }) {
  const content = (
    <Card
      className={`app-card p-4 transition hover:border-orange-200 hover:shadow-md ${
        item.readAt ? "bg-white/80" : "bg-orange-50/70"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {!item.readAt && (
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#d73f09]" />
            )}
            <Heading as="h2" size="4" className="text-gray-950">
              {item.title}
            </Heading>
          </div>
          <Text as="p" className="mt-2 text-sm leading-6 text-gray-600">
            {item.body}
          </Text>
        </div>
        <Text
          as="p"
          className="shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-400"
        >
          {formatDate(item.createdAt)}
        </Text>
      </div>
    </Card>
  );

  return item.actionHref ? (
    <Link href={item.actionHref} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}
