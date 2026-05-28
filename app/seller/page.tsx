"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, Heading, Text, Theme } from "@radix-ui/themes";
import { ArrowLeftIcon, CheckIcon, Cross2Icon, PlusIcon } from "@radix-ui/react-icons";
import Header from "../components/Header";
import EmptyState from "../components/EmptyState";
import { useI18n } from "../i18n";
import { pickProductName, type ProductNameTranslations } from "../lib/productTranslations";
import { requestResponseWindowMs } from "../lib/requestExpiry";

type ProductStatus = "available" | "pending" | "sold" | "removed";
type RequestStatus = "sent" | "accepted" | "declined" | "cancelled" | "expired";

type SellerProduct = {
  id: string | number;
  name: string;
  nameTranslations?: ProductNameTranslations | null;
  price: number;
  category?: string | null;
  imageUrl?: string | null;
  sellerContact?: {
    phone?: string | null;
    lineId?: string | null;
    wechatId?: string | null;
  } | null;
  status: ProductStatus;
  quantity?: number | null;
};

type SellerRequest = {
  id: string;
  itemId: string;
  buyerId: string;
  buyerEmail?: string | null;
  quantity: number;
  note: string;
  status: RequestStatus;
  createdAt: string;
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

const productStatusPriority: Record<ProductStatus, number> = {
  available: 0,
  pending: 1,
  sold: 2,
  removed: 3,
};

const requestStatusPriority: Record<RequestStatus, number> = {
  sent: 0,
  accepted: 1,
  declined: 2,
  cancelled: 3,
  expired: 4,
};
const sellerRequestIdsStorageKey = "osutrade:seller-request-ids";

function getResponseDeadline(createdAt: string) {
  return new Date(new Date(createdAt).getTime() + requestResponseWindowMs);
}

export default function SellerPage() {
  const { t, locale } = useI18n();
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [requests, setRequests] = useState<SellerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingProductId, setPendingProductId] = useState<string | number | null>(null);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);

  async function loadSellerData(options: { notify?: boolean } = {}) {
    if (!options.notify) {
      setLoading(true);
    }
    setError(null);

    try {
      const [productsRes, requestsRes] = await Promise.all([
        fetch("/api/seller/products", { cache: "no-store" }),
        fetch("/api/seller/requests", { cache: "no-store" }),
      ]);

      if (!productsRes.ok || !requestsRes.ok) {
        throw new Error("Failed to load seller dashboard.");
      }

      const productsPayload = await productsRes.json();
      const requestsPayload = await requestsRes.json();
      const nextRequests = (requestsPayload.data ?? []) as SellerRequest[];

      if (options.notify) {
        const previousIds = new Set(
          JSON.parse(
            window.localStorage.getItem(sellerRequestIdsStorageKey) || "[]"
          ) as string[]
        );
        const newPendingRequests = nextRequests.filter(
          (request) => request.status === "sent" && !previousIds.has(request.id)
        );

        if (newPendingRequests.length > 0 && previousIds.size > 0) {
          setNotice(
            t("seller.newRequestNotice", {
              count: newPendingRequests.length,
            })
          );
        }
      }

      window.localStorage.setItem(
        sellerRequestIdsStorageKey,
        JSON.stringify(nextRequests.map((request) => request.id))
      );

      setProducts(productsPayload.data ?? []);
      setRequests(nextRequests);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSellerData();
    const timer = window.setInterval(() => {
      void loadSellerData({ notify: true });
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "sent").length,
    [requests]
  );
  const expiredRequests = useMemo(
    () => requests.filter((request) => request.status === "expired").length,
    [requests]
  );
  const activeListings = useMemo(
    () => products.filter((product) => product.status !== "sold").length,
    [products]
  );
  const availableUnits = useMemo(
    () =>
      products.reduce(
        (total, product) =>
          product.status === "available" ? total + (product.quantity ?? 0) : total,
        0
      ),
    [products]
  );
  const sortedProducts = useMemo(
    () =>
      [...products].sort(
        (a, b) =>
          productStatusPriority[a.status] - productStatusPriority[b.status]
      ),
    [products]
  );
  const sortedRequests = useMemo(
    () =>
      [...requests].sort(
        (a, b) =>
          requestStatusPriority[a.status] - requestStatusPriority[b.status] ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [requests]
  );
  const pendingRequestRows = useMemo(
    () => sortedRequests.filter((request) => request.status === "sent"),
    [sortedRequests]
  );
  const expiredRequestRows = useMemo(
    () => sortedRequests.filter((request) => request.status === "expired"),
    [sortedRequests]
  );
  const historyRequestRows = useMemo(
    () =>
      sortedRequests.filter(
        (request) => request.status !== "sent" && request.status !== "expired"
      ),
    [sortedRequests]
  );

  async function updateRequest(requestId: string, status: RequestStatus) {
    setActionError(null);
    setPendingRequestId(requestId);

    try {
      const res = await fetch("/api/seller/requests", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId, status }),
      });

      if (!res.ok) {
        throw new Error("Failed to update request.");
      }

      const payload = await res.json();
      setRequests((current) =>
        current.map((item) => (item.id === requestId ? payload.request : item))
      );
      if (status === "accepted") {
        await loadSellerData();
      }
    } catch {
      setActionError(t("seller.actionError"));
    } finally {
      setPendingRequestId(null);
    }
  }

  async function updateProduct(productId: string | number, status: ProductStatus) {
    setActionError(null);
    setPendingProductId(productId);

    try {
      const res = await fetch("/api/seller/products", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, status }),
      });

      if (!res.ok) {
        throw new Error("Failed to update product.");
      }

      const payload = await res.json();
      setProducts((current) =>
        current.map((item) => (item.id === productId ? payload.product : item))
      );
    } catch {
      setActionError(t("seller.actionError"));
    } finally {
      setPendingProductId(null);
    }
  }

  return (
    <Theme appearance="light" accentColor="orange" grayColor="sand">
      <main className="app-page">
        <Header />

        <section className="app-container">
          <div className="app-hero">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="app-eyebrow">
                  {t("nav.seller")}
                </p>
                <Heading size="8" className="app-title">
                  {t("seller.title")}
                </Heading>
                <Text as="p" color="gray" className="app-subtitle">
                  {t("seller.subtitle")}
                </Text>
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Link href="/overview">
                  <Button variant="soft" className="whitespace-nowrap">
                    <ArrowLeftIcon /> {t("nav.marketplace")}
                  </Button>
                </Link>
                <Link href="/sell">
                  <Button highContrast className="whitespace-nowrap">
                    <PlusIcon /> {t("marketplace.listItem")}
                  </Button>
                </Link>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label={t("seller.totalListings")} value={activeListings} />
              <StatCard label={t("seller.pendingRequests")} value={pendingRequests} />
              <StatCard label={t("seller.expiredRequests")} value={expiredRequests} />
              <StatCard label={t("seller.availableUnits")} value={availableUnits} />
            </div>
          </div>

          {error && (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {actionError && (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionError}
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

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,1fr)]">
            <section className="app-panel">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <Heading size="5" className="text-gray-950">
                    {t("seller.myListings")}
                  </Heading>
                  <Text as="p" color="gray" size="2" className="mt-1">
                    {t("seller.myListingsHelp")}
                  </Text>
                </div>
                <Badge color="orange">{products.length}</Badge>
              </div>

              <div className="space-y-3">
                {loading ? (
                  <Card className="p-5">{t("seller.loadingListings")}</Card>
                ) : products.length === 0 ? (
                  <EmptyState
                    title={t("seller.noListings")}
                    body={t("seller.noListingsHelp")}
                    action={
                      <Link href="/sell">
                        <Button highContrast>
                          <PlusIcon /> {t("marketplace.listItem")}
                        </Button>
                      </Link>
                    }
                  />
                ) : (
                  sortedProducts.map((product) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      onStatus={(status) => updateProduct(product.id, status)}
                      busy={pendingProductId === product.id}
                      locale={locale}
                      t={t}
                    />
                  ))
                )}
              </div>
            </section>

            <section className="app-panel">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <Heading size="5" className="text-gray-950">
                    {t("seller.buyerRequests")}
                  </Heading>
                  <Text as="p" color="gray" size="2" className="mt-1">
                    {t("seller.buyerRequestsHelp")}
                  </Text>
                </div>
                <Badge color={pendingRequests > 0 ? "amber" : "gray"}>
                  {pendingRequests}
                </Badge>
              </div>

              <div className="space-y-3">
                {loading ? (
                  <Card className="p-5">{t("seller.loadingRequests")}</Card>
                ) : requests.length === 0 ? (
                  <EmptyState
                    title={t("seller.noRequests")}
                    body={t("seller.noRequestsHelp")}
                    action={
                      <Link href="/overview">
                        <Button variant="soft">
                          <ArrowLeftIcon /> {t("nav.marketplace")}
                        </Button>
                      </Link>
                    }
                  />
                ) : (
                  <>
                    <SellerRequestSection
                      title={t("seller.activeRequests")}
                      body={t("seller.activeRequestsHelp")}
                      requests={pendingRequestRows}
                      onUpdate={updateRequest}
                      pendingRequestId={pendingRequestId}
                      locale={locale}
                      t={t}
                      emptyText={t("seller.noActiveRequests")}
                    />
                    <SellerRequestSection
                      title={t("seller.expiredRequests")}
                      body={t("seller.expiredRequestsHelp")}
                      requests={expiredRequestRows}
                      onUpdate={updateRequest}
                      pendingRequestId={pendingRequestId}
                      locale={locale}
                      t={t}
                      emptyText={t("seller.noExpiredRequests")}
                    />
                    <SellerRequestSection
                      title={t("seller.requestHistory")}
                      body={t("seller.requestHistoryHelp")}
                      requests={historyRequestRows}
                      onUpdate={updateRequest}
                      pendingRequestId={pendingRequestId}
                      locale={locale}
                      t={t}
                    />
                  </>
                )}
              </div>
            </section>
          </div>
        </section>
      </main>
    </Theme>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-orange-100 bg-orange-50/60 px-4 py-3">
      <Text as="p" size="2" color="gray">
        {label}
      </Text>
      <p className="mt-1 text-2xl font-bold text-gray-950">{value}</p>
    </div>
  );
}

function SellerRequestSection({
  title,
  body,
  requests,
  onUpdate,
  pendingRequestId,
  locale,
  t,
  emptyText,
}: {
  title: string;
  body: string;
  requests: SellerRequest[];
  onUpdate: (requestId: string, status: RequestStatus) => void;
  pendingRequestId: string | null;
  locale: ReturnType<typeof useI18n>["locale"];
  t: ReturnType<typeof useI18n>["t"];
  emptyText?: string;
}) {
  if (requests.length === 0 && !emptyText) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-lg border border-orange-100 bg-white/65 p-3">
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
        <p className="rounded-md border border-dashed border-orange-200 bg-white px-3 py-2 text-sm text-gray-600">
          {emptyText}
        </p>
      ) : (
        requests.map((request) => (
          <RequestRow
            key={request.id}
            request={request}
            onUpdate={(status) => onUpdate(request.id, status)}
            busy={pendingRequestId === request.id}
            locale={locale}
            t={t}
          />
        ))
      )}
    </section>
  );
}

function ProductRow({
  product,
  onStatus,
  busy,
  locale,
  t,
}: {
  product: SellerProduct;
  onStatus: (status: ProductStatus) => void;
  busy: boolean;
  locale: ReturnType<typeof useI18n>["locale"];
  t: ReturnType<typeof useI18n>["t"];
}) {
  const displayName = pickProductName(product.name, product.nameTranslations, locale);
  const statusActions: Array<{
    status: ProductStatus;
    label: string;
    activeClass: string;
    idleClass: string;
  }> = [
    {
      status: "available",
      label: t("seller.available"),
      activeClass: "border-green-700 bg-green-600 text-white shadow-sm",
      idleClass: "border-green-200 bg-green-50 text-green-800 hover:bg-green-100",
    },
    {
      status: "pending",
      label: t("seller.pending"),
      activeClass: "border-amber-700 bg-amber-500 text-white shadow-sm",
      idleClass: "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100",
    },
    {
      status: "sold",
      label: t("seller.sold"),
      activeClass: "border-blue-700 bg-blue-600 text-white shadow-sm",
      idleClass: "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100",
    },
  ];

  return (
    <Card
      className={`app-card p-3 ${
        product.status === "sold" || product.status === "removed"
          ? "opacity-65"
          : ""
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        <img
          src={product.imageUrl || "/images/Bike_0.jpg"}
          alt={displayName}
          className="h-44 w-full shrink-0 rounded-md object-cover sm:h-20 sm:w-20"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Text className="block truncate font-medium">{displayName}</Text>
              <Text color="gray" size="2">
                {product.category
                  ? t(`common.category.${product.category}` as any)
                  : t("common.category.general")}{" "}
                - {currency(product.price)}
              </Text>
              <Text as="p" color="gray" size="2" className="mt-1">
                {t("product.stock", { quantity: product.quantity ?? 1 })}
              </Text>
            </div>
            <StatusBadge status={product.status} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {statusActions.map((action) => {
              const active = product.status === action.status;

              return (
                <button
                  key={action.status}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    if (!active) {
                      onStatus(action.status);
                    }
                  }}
                  disabled={busy}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                    active ? action.activeClass : action.idleClass
                  } ${busy ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  {action.label}
                </button>
              );
            })}
            {busy && (
              <Text color="gray" size="2" className="self-center">
                {t("seller.saving")}
              </Text>
            )}
          </div>
          <SellerContactPreview contact={product.sellerContact} t={t} />
        </div>
      </div>
    </Card>
  );
}

function SellerContactPreview({
  contact,
  t,
}: {
  contact?: SellerProduct["sellerContact"];
  t: ReturnType<typeof useI18n>["t"];
}) {
  const methods = [
    contact?.phone ? `${t("contact.phone")}: ${contact.phone}` : null,
    contact?.lineId ? `${t("contact.line")}: ${contact.lineId}` : null,
    contact?.wechatId ? `${t("contact.wechat")}: ${contact.wechatId}` : null,
  ].filter(Boolean);

  if (methods.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 rounded-md border border-orange-100 bg-orange-50 px-3 py-2 text-xs text-gray-700">
      <span className="font-semibold">{t("seller.listingContact")} </span>
      {methods.join(" · ")}
    </div>
  );
}

function RequestRow({
  request,
  onUpdate,
  busy,
  locale,
  t,
}: {
  request: SellerRequest;
  onUpdate: (status: RequestStatus) => void;
  busy: boolean;
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
  const deadline = getResponseDeadline(request.createdAt);
  const responseExpired =
    request.status === "sent" && Date.now() > deadline.getTime();

  return (
    <Card
      className={`app-card p-4 ${
        request.status !== "sent" ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Text className="block truncate font-medium">
            {displayName}
          </Text>
          <Text color="gray" size="2">
            {t("requests.qty", { quantity: request.quantity })} -{" "}
            {t("seller.buyer", { id: request.buyerId.slice(0, 8) })}
          </Text>
        </div>
        <StatusBadge status={request.status} />
      </div>

      {request.note && (
        <p className="mt-3 rounded-md bg-orange-50 px-3 py-2 text-sm text-gray-700">
          {request.note}
        </p>
      )}

      {request.status === "accepted" && request.buyerEmail ? (
        <div className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {t("seller.buyerContact")}{" "}
          <a className="font-medium underline" href={`mailto:${request.buyerEmail}`}>
            {request.buyerEmail}
          </a>
        </div>
      ) : (
        <Text className="mt-3 block" color="gray" size="2">
          {t("seller.emailAfterAccept")}
        </Text>
      )}

      {request.status === "sent" && (
        <p
          className={`mt-3 rounded-md border px-3 py-2 text-sm ${
            responseExpired
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {responseExpired
            ? t("seller.responseExpired")
            : t("seller.responseDue", {
                date: deadline.toLocaleString(),
              })}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {request.status === "sent" && (
          <>
            <Button
              size="2"
              highContrast
              onClick={() => onUpdate("accepted")}
              disabled={busy || responseExpired}
            >
              <CheckIcon /> {t("seller.accept")}
            </Button>
            <Button
              size="2"
              color="red"
              variant="soft"
              onClick={() => onUpdate("declined")}
              disabled={busy || responseExpired}
            >
              <Cross2Icon /> {t("seller.decline")}
            </Button>
          </>
        )}
        {busy && (
          <Text color="gray" size="2" className="self-center">
            {t("seller.saving")}
          </Text>
        )}
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const label =
    status === "sent" ||
    status === "accepted" ||
    status === "declined" ||
    status === "cancelled" ||
    status === "expired"
      ? t(`requests.status.${status}` as any)
      : t(`common.status.${status}` as any);

  if (status === "accepted" || status === "available") {
    return <Badge color="green">{label}</Badge>;
  }
  if (status === "declined" || status === "removed" || status === "expired") {
    return <Badge color="red">{label}</Badge>;
  }
  if (status === "sold") {
    return <Badge color="blue">{label}</Badge>;
  }
  return <Badge color="amber">{label}</Badge>;
}
