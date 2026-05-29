"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, Heading, Text, Theme } from "@radix-ui/themes";
import { ArrowLeftIcon, Cross2Icon } from "@radix-ui/react-icons";
import Header from "../components/Header";
import EmptyState from "../components/EmptyState";
import { useI18n } from "../i18n";
import { pickProductName, type ProductNameTranslations } from "../lib/productTranslations";

type RequestStatus = "sent" | "accepted" | "declined" | "cancelled" | "expired";
type RequestFilter = RequestStatus | "all";

type BuyerRequest = {
  id: string;
  itemId: string;
  quantity: number;
  note: string;
  status: RequestStatus;
  createdAt: string;
  sellerEmail?: string | null;
  sellerContact?: {
    email?: string | null;
    phone?: string | null;
    lineId?: string | null;
    wechatId?: string | null;
  } | null;
  product: {
    id: string | number;
    name: string;
    nameTranslations?: ProductNameTranslations | null;
    price: number;
    imageUrl?: string | null;
  } | null;
};

const currency = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const requestResponseWindowMs = 48 * 60 * 60 * 1000;
const buyerRequestStatusStorageKey = "osutrade:buyer-request-statuses";

function getResponseDeadline(createdAt: string) {
  return new Date(new Date(createdAt).getTime() + requestResponseWindowMs);
}

export default function RequestsPage() {
  const { t, locale } = useI18n();
  const [requests, setRequests] = useState<BuyerRequest[]>([]);
  const [filter, setFilter] = useState<RequestFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    async function loadRequests({ notify }: { notify: boolean }) {
      try {
        const res = await fetch("/api/requests", { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Failed to load requests.");
        }

        const payload = await res.json();
        const nextRequests = (payload.data ?? []) as BuyerRequest[];

        if (notify) {
          const previous = JSON.parse(
            window.localStorage.getItem(buyerRequestStatusStorageKey) || "{}"
          ) as Record<string, RequestStatus>;
          const changed = nextRequests.find(
            (request) =>
              previous[request.id] && previous[request.id] !== request.status
          );

          if (changed) {
            setNotice(
              t("requests.statusChangedNotice", {
                status: t(`requests.status.${changed.status}` as any),
              })
            );
          }
        }

        window.localStorage.setItem(
          buyerRequestStatusStorageKey,
          JSON.stringify(
            Object.fromEntries(
              nextRequests.map((request) => [request.id, request.status])
            )
          )
        );
        setRequests(nextRequests);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load requests.");
      } finally {
        setLoading(false);
      }
    }

    void loadRequests({ notify: false });
    const timer = window.setInterval(() => {
      void loadRequests({ notify: true });
    }, 60_000);

    return () => window.clearInterval(timer);
  }, [t]);

  async function cancelRequest(requestId: string) {
    const res = await fetch("/api/requests", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId, status: "cancelled" }),
    });

    if (res.ok) {
      const payload = await res.json();
      setRequests((current) =>
        current.map((item) => (item.id === requestId ? payload.request : item))
      );
    }
  }

  const acceptedCount = useMemo(
    () => requests.filter((request) => request.status === "accepted").length,
    [requests]
  );
  const activePendingRequests = useMemo(
    () => requests.filter((request) => request.status === "sent"),
    [requests]
  );
  const expiredRequests = useMemo(
    () => requests.filter((request) => request.status === "expired"),
    [requests]
  );
  const historyRequests = useMemo(
    () =>
      requests.filter(
        (request) => request.status !== "sent" && request.status !== "expired"
      ),
    [requests]
  );
  const filteredRequests = useMemo(
    () =>
      filter === "all"
        ? requests
        : requests.filter((request) => request.status === filter),
    [filter, requests]
  );
  const filters: RequestFilter[] = [
    "all",
    "sent",
    "accepted",
    "declined",
    "cancelled",
    "expired",
  ];

  return (
    <Theme appearance="light" accentColor="orange" grayColor="sand">
      <main className="app-page">
        <Header />

        <section className="mx-auto max-w-5xl">
          <div className="app-hero flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="app-eyebrow">{t("nav.requests")}</p>
              <Heading size="8" className="app-title">
                {t("requests.title")}
              </Heading>
              <Text color="gray">
                {t("requests.counts", {
                  total: requests.length,
                  accepted: acceptedCount,
                })}
              </Text>
            </div>

            <Link href="/overview">
              <Button variant="soft">
                <ArrowLeftIcon /> {t("nav.marketplace")}
              </Button>
            </Link>
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <RequestStatCard
              label={t("requests.activePending")}
              value={activePendingRequests.length}
              tone="amber"
            />
            <RequestStatCard
              label={t("requests.expired")}
              value={expiredRequests.length}
              tone="red"
            />
            <RequestStatCard
              label={t("requests.completed")}
              value={historyRequests.length}
              tone="gray"
            />
          </div>

          {error && (
            <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {notice && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              <span>{notice}</span>
              <button
                type="button"
                className="font-semibold text-green-900"
                onClick={() => setNotice(null)}
              >
                {t("common.clear")}
              </button>
            </div>
          )}

          <div className="mb-5 flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`app-chip ${
                  filter === item
                    ? "border-[#d73f09] bg-[#d73f09] text-white"
                    : "border-orange-200 bg-white/85 text-gray-700 hover:bg-orange-50"
                }`}
              >
                {t(`requests.filter.${item}` as any)}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {loading ? (
              <Card className="p-5">{t("requests.loading")}</Card>
            ) : requests.length === 0 ? (
              <EmptyState
                title={t("requests.empty")}
                body={t("requests.emptyHelp")}
                action={
                  <Link href="/overview">
                    <Button highContrast>
                      <ArrowLeftIcon /> {t("requests.browse")}
                    </Button>
                  </Link>
                }
              />
            ) : filteredRequests.length === 0 ? (
              <EmptyState
                title={t("requests.noFiltered")}
                body={t("requests.counts", {
                    total: requests.length,
                    accepted: acceptedCount,
                  })}
              />
            ) : filter === "all" ? (
              <>
                <RequestSection
                  title={t("requests.activePending")}
                  body={t("requests.activePendingHelp")}
                  requests={activePendingRequests}
                  onCancel={cancelRequest}
                  locale={locale}
                  t={t}
                />
                <RequestSection
                  title={t("requests.expired")}
                  body={t("requests.expiredHelp")}
                  requests={expiredRequests}
                  onCancel={cancelRequest}
                  locale={locale}
                  t={t}
                  emptyText={t("requests.noExpired")}
                />
                <RequestSection
                  title={t("requests.completed")}
                  body={t("requests.completedHelp")}
                  requests={historyRequests}
                  onCancel={cancelRequest}
                  locale={locale}
                  t={t}
                />
              </>
            ) : (
              filteredRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  onCancel={() => cancelRequest(request.id)}
                  locale={locale}
                  t={t}
                />
              ))
            )}
          </div>
        </section>
      </main>
    </Theme>
  );
}

function RequestStatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "red" | "gray";
}) {
  const toneClass =
    tone === "red"
      ? "border-red-100 bg-red-50 text-red-700"
      : tone === "amber"
        ? "border-amber-100 bg-amber-50 text-amber-900"
        : "border-gray-100 bg-white text-gray-700";

  return (
    <div className={`rounded-lg border px-4 py-3 shadow-sm ${toneClass}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-950">{value}</p>
    </div>
  );
}

function RequestSection({
  title,
  body,
  requests,
  onCancel,
  locale,
  t,
  emptyText,
}: {
  title: string;
  body: string;
  requests: BuyerRequest[];
  onCancel: (requestId: string) => void;
  locale: ReturnType<typeof useI18n>["locale"];
  t: ReturnType<typeof useI18n>["t"];
  emptyText?: string;
}) {
  if (requests.length === 0 && !emptyText) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Heading size="4" className="text-gray-950">
            {title}
          </Heading>
          <Text as="p" color="gray" size="2" className="mt-1">
            {body}
          </Text>
        </div>
        <Badge color={requests.length > 0 ? "orange" : "gray"}>
          {requests.length}
        </Badge>
      </div>

      {requests.length === 0 ? (
        <p className="rounded-lg border border-dashed border-orange-200 bg-white/80 px-4 py-3 text-sm text-gray-600">
          {emptyText}
        </p>
      ) : (
        requests.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            onCancel={() => onCancel(request.id)}
            locale={locale}
            t={t}
          />
        ))
      )}
    </section>
  );
}

function RequestCard({
  request,
  onCancel,
  locale,
  t,
}: {
  request: BuyerRequest;
  onCancel: () => void;
  locale: ReturnType<typeof useI18n>["locale"];
  t: ReturnType<typeof useI18n>["t"];
}) {
  const displayName = request.product
    ? pickProductName(
        request.product.name,
        request.product.nameTranslations,
        locale
      )
    : `Item ${request.itemId}`;

  return (
    <Card className="app-card p-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <img
          src={request.product?.imageUrl || "/images/Bike_0.jpg"}
          alt={displayName}
          className="h-48 w-full rounded-md object-cover sm:h-24 sm:w-24"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Text className="block font-medium">
                {displayName}
              </Text>
              <Text color="gray" size="2">
                {t("requests.qty", { quantity: request.quantity })}
                {request.product ? ` - ${currency(request.product.price)}` : ""}
              </Text>
            </div>
            <StatusBadge status={request.status} />
          </div>

          {request.note && (
            <p className="mt-3 rounded-md bg-orange-50 px-3 py-2 text-sm text-gray-700">
              {request.note}
            </p>
          )}

          {request.status === "accepted" && request.sellerContact ? (
            <div className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              <p className="font-semibold">{t("requests.acceptedContact")}</p>
              <ContactLine
                label={t("contact.email")}
                value={request.sellerContact.email}
                hrefPrefix="mailto:"
              />
              <ContactLine
                label={t("contact.phone")}
                value={request.sellerContact.phone}
                hrefPrefix="tel:"
              />
              <ContactLine label={t("contact.line")} value={request.sellerContact.lineId} />
              <ContactLine
                label={t("contact.wechat")}
                value={request.sellerContact.wechatId}
              />
            </div>
          ) : (
            <Text className="mt-3 block" color="gray" size="2">
              {t("requests.contactPending")}
            </Text>
          )}

          <RequestDeadline request={request} t={t} />
          <RequestProgress status={request.status} t={t} />

          {request.status === "expired" && (
            <div className="mt-4 flex flex-col gap-3 rounded-md border border-red-100 bg-red-50 px-3 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
              <p>{t("requests.expiredNextStep")}</p>
              <Link href="/overview">
                <Button color="red" variant="soft">
                  <ArrowLeftIcon /> {t("requests.browse")}
                </Button>
              </Link>
            </div>
          )}

          {request.status === "sent" && (
            <Button
              className="mt-4"
              color="red"
              variant="soft"
              onClick={onCancel}
            >
              <Cross2Icon /> {t("requests.cancel")}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function RequestDeadline({
  request,
  t,
}: {
  request: BuyerRequest;
  t: ReturnType<typeof useI18n>["t"];
}) {
  if (request.status !== "sent") {
    return null;
  }

  const deadline = getResponseDeadline(request.createdAt);
  const expired = Date.now() > deadline.getTime();

  return (
    <p
      className={`mt-3 rounded-md border px-3 py-2 text-sm ${
        expired
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
    >
      {expired
        ? t("requests.responseExpired")
        : t("requests.responseDue", {
            date: deadline.toLocaleString(),
          })}
    </p>
  );
}

function RequestProgress({
  status,
  t,
}: {
  status: RequestStatus;
  t: ReturnType<typeof useI18n>["t"];
}) {
  const terminal = status === "declined" || status === "cancelled";
  const expired = status === "expired";
  const steps = terminal
    ? [
        { key: "sent", label: t("requests.progress.sent") },
        { key: status, label: t(`requests.progress.${status}` as any) },
      ]
    : expired
      ? [
          { key: "sent", label: t("requests.progress.sent") },
          { key: "expired", label: t("requests.progress.expired") },
        ]
    : [
        { key: "sent", label: t("requests.progress.sent") },
        { key: "accepted", label: t("requests.progress.accepted") },
        { key: "contact", label: t("requests.progress.contact") },
      ];
  const activeIndex = terminal || expired
    ? 1
    : status === "accepted"
      ? 2
      : 0;

  return (
    <div className="mt-4 rounded-md border border-orange-100 bg-white px-3 py-3">
      <div className="flex items-center">
        {steps.map((step, index) => {
          const complete = index <= activeIndex;
          const isTerminal = (terminal || expired) && index === activeIndex;
          return (
            <div key={step.key} className="flex flex-1 items-center last:flex-none">
              <div className="flex min-w-0 flex-col items-center gap-1">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${
                    isTerminal
                      ? "border-red-600 bg-red-600 text-white"
                      : complete
                        ? "border-[#d73f09] bg-[#d73f09] text-white"
                        : "border-gray-300 bg-white text-gray-500"
                  }`}
                >
                  {index + 1}
                </span>
                <span
                  className={`max-w-24 truncate text-xs font-medium ${
                    complete ? "text-gray-900" : "text-gray-500"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 ${
                    index < activeIndex
                      ? terminal
                        ? "bg-red-500"
                        : "bg-[#d73f09]"
                      : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ContactLine({
  label,
  value,
  hrefPrefix,
}: {
  label: string;
  value?: string | null;
  hrefPrefix?: string;
}) {
  if (!value) {
    return null;
  }

  const content = hrefPrefix ? (
    <a className="font-medium underline" href={`${hrefPrefix}${value}`}>
      {value}
    </a>
  ) : (
    <span className="font-medium">{value}</span>
  );

  return (
    <p className="mt-1">
      {label}: {content}
    </p>
  );
}

function StatusBadge({ status }: { status: RequestStatus }) {
  const { t } = useI18n();

  if (status === "accepted") return <Badge color="green">{t("requests.status.accepted")}</Badge>;
  if (status === "declined" || status === "cancelled" || status === "expired") {
    return <Badge color="red">{t(`requests.status.${status}` as any)}</Badge>;
  }
  return <Badge color="amber">{t("requests.status.sent")}</Badge>;
}
