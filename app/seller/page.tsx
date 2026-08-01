"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, Heading, Text, Theme } from "@radix-ui/themes";
import { ArrowLeftIcon, CheckIcon, Cross2Icon, PlusIcon } from "@radix-ui/react-icons";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Clock3,
  Copy,
  DollarSign,
  Megaphone,
  PackageCheck,
  Pencil,
  RefreshCw,
  Save,
  Tag,
  X,
} from "lucide-react";
import Header from "../components/Header";
import EmptyState from "../components/EmptyState";
import { useI18n } from "../i18n";
import type { CrossPostCopy, CrossPostPlatform } from "../lib/crossPostCopy";
import {
  maxCrossPostProducts,
  reconcileCrossPostSelection,
  selectAllAvailable,
  toggleCrossPostSelection,
} from "../lib/crossPostSelection";
import { pickProductName, type ProductNameTranslations } from "../lib/productTranslations";
import { requestResponseWindowMs } from "../lib/requestExpiry";
import {
  calculateEffectivePrice,
  PRODUCT_DISCOUNT_OPTIONS,
  type ProductDiscountPercent,
} from "../lib/productDiscount";

type ProductStatus = "available" | "pending" | "sold" | "removed";
type RequestStatus = "sent" | "accepted" | "declined" | "cancelled" | "expired";

type SellerProduct = {
  id: string | number;
  name: string;
  description?: string | null;
  nameTranslations?: ProductNameTranslations | null;
  price: number;
  originalPrice?: number;
  effectivePrice?: number;
  discountPercent?: ProductDiscountPercent;
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

type ProductEditValues = {
  name: string;
  description: string;
  price: number;
  discountPercent: ProductDiscountPercent;
  category: string;
  quantity: number;
  contactPhone: string;
  contactLineId: string;
  contactWechatId: string;
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

const crossPostPlatformLabels: Record<CrossPostPlatform, string> = {
  facebook: "Facebook",
  craigslist: "Craigslist",
  line: "LINE",
  wechat: "WeChat",
  discord: "Discord",
};

const crossPostPlatforms = Object.keys(
  crossPostPlatformLabels
) as CrossPostPlatform[];

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
  const [pendingProductId, setPendingProductId] = useState<string | number | null>(null);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [crossPostLoading, setCrossPostLoading] = useState(false);
  const [crossPostError, setCrossPostError] = useState<string | null>(null);
  const [crossPostCopies, setCrossPostCopies] = useState<CrossPostCopy[]>([]);
  const [crossPostSource, setCrossPostSource] = useState<"ai" | "fallback" | null>(
    null
  );
  const [selectedCrossPostPlatform, setSelectedCrossPostPlatform] =
    useState<CrossPostPlatform>("facebook");
  const [copiedCrossPostPlatform, setCopiedCrossPostPlatform] =
    useState<CrossPostPlatform | null>(null);
  const selectedProductIdsRef = useRef<string[]>([]);

  async function loadSellerData(options: { background?: boolean } = {}) {
    if (!options.background) {
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
      const nextProducts = (productsPayload.data ?? []) as SellerProduct[];
      const nextRequests = (requestsPayload.data ?? []) as SellerRequest[];

      setProducts(nextProducts);
      setSelectedProductIds((current) => {
        const next = reconcileCrossPostSelection(current, nextProducts);
        return current.length === next.length &&
          current.every((id, index) => id === next[index])
          ? current
          : next;
      });
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
      void loadSellerData({ background: true });
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
  const selectedProducts = useMemo(() => {
    const productsById = new Map(
      products.map((product) => [String(product.id), product] as const)
    );
    return selectedProductIds
      .map((id) => productsById.get(id))
      .filter((product): product is SellerProduct => Boolean(product));
  }, [products, selectedProductIds]);
  const selectedProductsFingerprint = useMemo(
    () =>
      JSON.stringify(
        selectedProducts.map((product) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          nameTranslations: product.nameTranslations,
          price: product.price,
          category: product.category,
          quantity: product.quantity,
          imageUrl: product.imageUrl,
          status: product.status,
        }))
      ),
    [selectedProducts]
  );
  const availableSelectionIds = useMemo(
    () => selectAllAvailable(sortedProducts),
    [sortedProducts]
  );
  const allAvailableSelected =
    availableSelectionIds.length > 0 &&
    availableSelectionIds.every((id) => selectedProductIds.includes(id));
  const selectedCrossPostCopy =
    crossPostCopies.find(
      (copy) => copy.platform === selectedCrossPostPlatform
    ) ?? null;

  useEffect(() => {
    selectedProductIdsRef.current = selectedProductIds;
    setCrossPostCopies([]);
    setCrossPostSource(null);
    setCrossPostError(null);
    setCopiedCrossPostPlatform(null);
  }, [selectedProductIds, selectedProductsFingerprint]);

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

  function updateCrossPostSelection(
    productId: string | number,
    checked: boolean
  ) {
    setSelectedProductIds((current) => {
      const next = toggleCrossPostSelection(current, productId, checked);
      selectedProductIdsRef.current = next;
      return next;
    });
  }

  function selectAvailableProducts() {
    const next = selectAllAvailable(sortedProducts);
    selectedProductIdsRef.current = next;
    setSelectedProductIds(next);
  }

  function clearCrossPostSelection() {
    selectedProductIdsRef.current = [];
    setSelectedProductIds([]);
  }

  async function generateCrossPostCopy() {
    if (selectedProductIds.length < 1) return;

    const submittedIds = [...selectedProductIds];
    const submittedKey = submittedIds.join("\u0000");
    setCrossPostLoading(true);
    setActionError(null);
    setCrossPostError(null);
    setCopiedCrossPostPlatform(null);

    try {
      const res = await fetch("/api/seller/products/cross-post", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productIds: submittedIds }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        if (res.status === 400) {
          await loadSellerData({ background: true });
          setActionError(t("seller.crossPostSelectionStale"));
          return;
        }
        throw new Error(payload?.message || t("seller.crossPostGenerateError"));
      }

      const payload = (await res.json()) as {
        source: "ai" | "fallback";
        copies: CrossPostCopy[];
      };
      if (selectedProductIdsRef.current.join("\u0000") !== submittedKey) {
        return;
      }

      setCrossPostCopies(payload.copies ?? []);
      setCrossPostSource(payload.source ?? "fallback");
      if (
        !payload.copies?.some(
          (copy) => copy.platform === selectedCrossPostPlatform
        )
      ) {
        setSelectedCrossPostPlatform("facebook");
      }
    } catch (err) {
      if (selectedProductIdsRef.current.join("\u0000") === submittedKey) {
        setCrossPostError(
          err instanceof Error ? err.message : t("seller.crossPostGenerateError")
        );
      }
    } finally {
      setCrossPostLoading(false);
    }
  }

  async function copyCrossPostCopy() {
    if (!selectedCrossPostCopy) return;
    const text = `${selectedCrossPostCopy.title}\n\n${selectedCrossPostCopy.body}`;

    try {
      await window.navigator.clipboard.writeText(text);
      setCopiedCrossPostPlatform(selectedCrossPostCopy.platform);
    } catch {
      setCrossPostError(t("seller.crossPostCopyError"));
    }
  }

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

  async function updateProduct(
    productId: string | number,
    updates: Partial<ProductEditValues> & { status?: ProductStatus }
  ) {
    setActionError(null);
    setPendingProductId(productId);

    try {
      const res = await fetch("/api/seller/products", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, ...updates }),
      });

      if (!res.ok) {
        throw new Error("Failed to update product.");
      }

      const payload = await res.json();
      setProducts((current) =>
        current.map((item) => (item.id === productId ? payload.product : item))
      );
      if (payload.product?.status !== "available") {
        updateCrossPostSelection(productId, false);
      }
    } catch {
      setActionError(t("seller.actionError"));
    } finally {
      setPendingProductId(null);
    }
  }

  return (
    <Theme appearance="light" accentColor="orange" grayColor="sand">
      <Header />
      <main className="app-page">
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
              <StatCard
                label={t("seller.totalListings")}
                value={activeListings}
                icon={<Boxes className="h-5 w-5" />}
                tone="orange"
              />
              <StatCard
                label={t("seller.pendingRequests")}
                value={pendingRequests}
                icon={<Clock3 className="h-5 w-5" />}
                tone={pendingRequests > 0 ? "amber" : "slate"}
              />
              <StatCard
                label={t("seller.expiredRequests")}
                value={expiredRequests}
                icon={<AlertTriangle className="h-5 w-5" />}
                tone={expiredRequests > 0 ? "red" : "slate"}
              />
              <StatCard
                label={t("seller.availableUnits")}
                value={availableUnits}
                icon={<PackageCheck className="h-5 w-5" />}
                tone="green"
              />
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
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,1fr)]">
            <section className="app-panel">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Heading size="5" className="text-gray-950">
                    {t("seller.myListings")}
                  </Heading>
                  <Text as="p" color="gray" size="2" className="mt-1">
                    {t("seller.myListingsHelp")}
                  </Text>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Badge color="orange">{products.length}</Badge>
                  {!loading && products.length > 0 && (
                    <>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {t("seller.crossPostSelectedCount", {
                          count: selectedProductIds.length,
                          max: maxCrossPostProducts,
                        })}
                      </span>
                      <Button
                        type="button"
                        size="1"
                        variant="soft"
                        onClick={selectAvailableProducts}
                        disabled={
                          availableSelectionIds.length === 0 ||
                          allAvailableSelected
                        }
                      >
                        {t("seller.crossPostSelectAll")}
                      </Button>
                      <Button
                        type="button"
                        size="1"
                        variant="ghost"
                        onClick={clearCrossPostSelection}
                        disabled={selectedProductIds.length === 0}
                      >
                        {t("seller.crossPostClear")}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {selectedProductIds.length > 0 && (
                <BatchCrossPostPanel
                  t={t}
                  selectedCount={selectedProducts.length}
                  loading={crossPostLoading}
                  error={crossPostError}
                  source={crossPostSource}
                  copies={crossPostCopies}
                  selectedPlatform={selectedCrossPostPlatform}
                  copiedPlatform={copiedCrossPostPlatform}
                  selectedCopy={selectedCrossPostCopy}
                  onGenerate={generateCrossPostCopy}
                  onSelectPlatform={setSelectedCrossPostPlatform}
                  onCopy={copyCrossPostCopy}
                />
              )}

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
                      onStatus={(status) => updateProduct(product.id, { status })}
                      onSave={(values) => updateProduct(product.id, values)}
                      busy={pendingProductId === product.id}
                      locale={locale}
                      t={t}
                      selected={selectedProductIds.includes(String(product.id))}
                      selectionDisabled={
                        product.status !== "available" ||
                        (!selectedProductIds.includes(String(product.id)) &&
                          selectedProductIds.length >= maxCrossPostProducts)
                      }
                      selectionLimitReached={
                        product.status === "available" &&
                        !selectedProductIds.includes(String(product.id)) &&
                        selectedProductIds.length >= maxCrossPostProducts
                      }
                      onSelectionChange={(checked) =>
                        updateCrossPostSelection(product.id, checked)
                      }
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

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tone: "orange" | "amber" | "red" | "green" | "slate";
}) {
  const toneClass = {
    orange: "border-orange-200 bg-orange-50 text-[#d73f09]",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-red-200 bg-red-50 text-red-700",
    green: "border-green-200 bg-green-50 text-green-700",
    slate: "border-slate-200 bg-slate-50 text-slate-600",
  }[tone];

  return (
    <div className="rounded-lg border border-orange-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Text as="p" size="2" color="gray" className="font-medium">
            {label}
          </Text>
          <p className="mt-1 font-mono text-3xl font-bold leading-none text-gray-950">
            {value}
          </p>
        </div>
        <div className={`rounded-md border p-2 ${toneClass}`}>{icon}</div>
      </div>
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
    <section className="space-y-3 rounded-lg border border-orange-100 bg-white p-4 shadow-sm">
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
        <div className="rounded-md border border-dashed border-orange-200 bg-orange-50/50 px-3 py-3 text-sm text-gray-600">
          {emptyText}
        </div>
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
  onSave,
  busy,
  locale,
  t,
  selected,
  selectionDisabled,
  selectionLimitReached,
  onSelectionChange,
}: {
  product: SellerProduct;
  onStatus: (status: ProductStatus) => void;
  onSave: (values: ProductEditValues) => void;
  busy: boolean;
  locale: ReturnType<typeof useI18n>["locale"];
  t: ReturnType<typeof useI18n>["t"];
  selected: boolean;
  selectionDisabled: boolean;
  selectionLimitReached: boolean;
  onSelectionChange: (checked: boolean) => void;
}) {
  const displayName = pickProductName(product.name, product.nameTranslations, locale);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<ProductEditValues>(() => ({
    name: product.name,
    description: product.description ?? "",
    price: Number(product.originalPrice ?? product.price ?? 0),
    discountPercent: product.discountPercent ?? 0,
    category: product.category ?? "general",
    quantity: product.quantity ?? 0,
    contactPhone: product.sellerContact?.phone ?? "",
    contactLineId: product.sellerContact?.lineId ?? "",
    contactWechatId: product.sellerContact?.wechatId ?? "",
  }));
  const isSold = product.status === "sold";
  const selectionLabel =
    product.status !== "available"
      ? t("seller.crossPostUnavailable")
      : selectionLimitReached
        ? t("seller.crossPostLimitReached")
        : selected
          ? t("seller.crossPostSelected")
          : t("seller.crossPostSelectProduct");

  useEffect(() => {
    setEditValues({
      name: product.name,
      description: product.description ?? "",
      price: Number(product.originalPrice ?? product.price ?? 0),
      discountPercent: product.discountPercent ?? 0,
      category: product.category ?? "general",
      quantity: product.quantity ?? 0,
      contactPhone: product.sellerContact?.phone ?? "",
      contactLineId: product.sellerContact?.lineId ?? "",
      contactWechatId: product.sellerContact?.wechatId ?? "",
    });
  }, [product]);

  const statusActions: Array<{
    status: ProductStatus;
    label: string;
    icon: ReactNode;
    activeClass: string;
    idleClass: string;
  }> = [
    {
      status: "available",
      label: t("seller.available"),
      icon: <CheckCircle2 className="h-4 w-4" />,
      activeClass: "border-green-700 bg-green-600 text-white shadow-sm",
      idleClass: "border-green-200 bg-green-50 text-green-800 hover:bg-green-100",
    },
    {
      status: "pending",
      label: t("seller.pending"),
      icon: <Clock3 className="h-4 w-4" />,
      activeClass: "border-amber-700 bg-amber-500 text-white shadow-sm",
      idleClass: "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100",
    },
    {
      status: "sold",
      label: t("seller.sold"),
      icon: <PackageCheck className="h-4 w-4" />,
      activeClass: "border-blue-700 bg-blue-600 text-white shadow-sm",
      idleClass: "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100",
    },
  ];

  return (
    <Card
      className={`app-card overflow-hidden ${
        product.status === "sold" || product.status === "removed"
          ? "opacity-65"
          : ""
      }`}
    >
      <div className="h-1 bg-gradient-to-r from-[#d73f09] via-orange-300 to-transparent" />
      <div className="flex flex-col gap-4 p-4 sm:flex-row">
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-24">
          <label
            className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-md border px-2 text-xs font-semibold transition ${
              selected
                ? "border-[#d73f09] bg-orange-50 text-[#8f2805]"
                : "border-slate-200 bg-white text-slate-700"
            } ${
              selectionDisabled
                ? "cursor-not-allowed opacity-55"
                : "cursor-pointer hover:border-orange-300"
            }`}
          >
            <input
              type="checkbox"
              checked={selected}
              disabled={selectionDisabled}
              onChange={(event) => onSelectionChange(event.target.checked)}
              aria-label={`${selectionLabel}: ${displayName}`}
              className="h-4 w-4 shrink-0 accent-[#d73f09]"
            />
            <span className="min-w-0 truncate">{selectionLabel}</span>
          </label>
          <img
            src={product.imageUrl || "/images/Bike_0.jpg"}
            alt={displayName}
            className="h-44 w-full rounded-md border border-orange-100 object-cover sm:h-24 sm:w-24"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Text className="block truncate text-base font-semibold text-gray-950">
                {displayName}
              </Text>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <span className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-1 font-medium text-[#8f2805]">
                  <Tag className="h-3.5 w-3.5" />
                  {product.category
                    ? t(`common.category.${product.category}` as any)
                    : t("common.category.general")}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 font-semibold text-slate-900">
                  <DollarSign className="h-3.5 w-3.5" />
                  {currency(product.price)}
                </span>
                {(product.discountPercent ?? 0) > 0 && (
                  <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-bold text-red-700">
                    {product.discountPercent}% OFF
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 font-medium text-green-800">
                  <Boxes className="h-3.5 w-3.5" />
                  {t("product.stock", { quantity: product.quantity ?? 1 })}
                </span>
              </div>
            </div>
            <StatusBadge status={product.status} />
          </div>

          <div className="mt-4 rounded-md border border-orange-100 bg-orange-50/50 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <Text size="2" className="font-semibold text-gray-800">
                {t("seller.statusControls")}
              </Text>
              {busy && (
                <Text color="gray" size="2">
                  {t("seller.saving")}
                </Text>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
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
                    className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d73f09] focus-visible:ring-offset-2 ${
                      active ? action.activeClass : action.idleClass
                    } ${busy ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    {action.icon}
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            {!isSold ? (
              <Button
                type="button"
                size="2"
                variant="soft"
                onClick={() => setEditing((value) => !value)}
                disabled={busy}
              >
                {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                {editing ? t("seller.cancelEdit") : t("seller.edit")}
              </Button>
            ) : (
              <Text color="gray" size="2" className="self-center">
                {t("seller.editLockedSold")}
              </Text>
            )}
            <SellerContactPreview contact={product.sellerContact} t={t} />
          </div>

          {editing && !isSold && (
            <form
              className="mt-4 grid gap-4 rounded-lg border border-orange-200 bg-white p-4 shadow-sm"
              onSubmit={(event) => {
                event.preventDefault();
                onSave(editValues);
                setEditing(false);
              }}
            >
              <div className="flex items-center justify-between gap-3 border-b border-orange-100 pb-3">
                <div>
                  <Text className="font-semibold text-gray-950">
                    {t("seller.edit")}
                  </Text>
                  <Text as="p" color="gray" size="2">
                    {t("seller.myListingsHelp")}
                  </Text>
                </div>
                <Pencil className="h-5 w-5 text-[#d73f09]" />
              </div>
              <label className="text-sm font-medium text-gray-700">
                {t("sell.itemName")}
                <input
                  className="app-input mt-1"
                  value={editValues.name}
                  onChange={(event) =>
                    setEditValues((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                {t("sell.description")}
                <textarea
                  className="app-input mt-1 min-h-20"
                  value={editValues.description}
                  onChange={(event) =>
                    setEditValues((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-sm font-medium text-gray-700">
                  {t("sell.price")}
                  <input
                    className="app-input mt-1"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={editValues.price}
                    onChange={(event) =>
                      setEditValues((current) => ({
                        ...current,
                        price: Number(event.target.value),
                      }))
                    }
                    required
                  />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  {t("sell.quantity")}
                  <input
                    className="app-input mt-1"
                    type="number"
                    min="0"
                    step="1"
                    value={editValues.quantity}
                    onChange={(event) =>
                      setEditValues((current) => ({
                        ...current,
                        quantity: Number(event.target.value),
                      }))
                    }
                    required
                  />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  {t("marketplace.category")}
                  <select
                    className="app-input mt-1"
                    value={editValues.category}
                    onChange={(event) =>
                      setEditValues((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                  >
                    {["general", "electronics", "clothing", "books", "home"].map(
                      (category) => (
                        <option key={category} value={category}>
                          {t(`common.category.${category}` as any)}
                        </option>
                      )
                    )}
                  </select>
                </label>
              </div>
              <fieldset className="rounded-md border border-orange-100 bg-orange-50/50 p-3">
                <legend className="px-1 text-sm font-semibold text-gray-800">
                  {t("seller.discount")}
                </legend>
                <div className="mt-1 flex flex-wrap gap-2">
                  {PRODUCT_DISCOUNT_OPTIONS.map((discount) => (
                    <button
                      key={discount}
                      type="button"
                      aria-pressed={editValues.discountPercent === discount}
                      onClick={() =>
                        setEditValues((current) => ({
                          ...current,
                          discountPercent: discount,
                        }))
                      }
                      className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                        editValues.discountPercent === discount
                          ? "border-[#d73f09] bg-[#d73f09] text-white"
                          : "border-orange-200 bg-white text-gray-700 hover:bg-orange-50"
                      }`}
                    >
                      {discount === 0 ? t("seller.noDiscount") : `${discount}%`}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  {t("seller.discountPreview", {
                    price: currency(
                      calculateEffectivePrice(
                        Number(editValues.price) || 0,
                        editValues.discountPercent
                      )
                    ),
                  })}
                </p>
              </fieldset>
              {calculateEffectivePrice(Number(editValues.price) || 0, editValues.discountPercent) !== Number(product.price) && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {t("seller.priceChangeWarning")}
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-sm font-medium text-gray-700">
                  {t("contact.phone")}
                  <input
                    className="app-input mt-1"
                    value={editValues.contactPhone}
                    onChange={(event) =>
                      setEditValues((current) => ({
                        ...current,
                        contactPhone: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  {t("contact.line")}
                  <input
                    className="app-input mt-1"
                    value={editValues.contactLineId}
                    onChange={(event) =>
                      setEditValues((current) => ({
                        ...current,
                        contactLineId: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  {t("contact.wechat")}
                  <input
                    className="app-input mt-1"
                    value={editValues.contactWechatId}
                    onChange={(event) =>
                      setEditValues((current) => ({
                        ...current,
                        contactWechatId: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="soft"
                  onClick={() => setEditing(false)}
                  disabled={busy}
                >
                  <X className="h-4 w-4" />
                  {t("seller.cancelEdit")}
                </Button>
                <Button type="submit" highContrast disabled={busy}>
                  <Save className="h-4 w-4" />
                  {busy ? t("seller.saving") : t("seller.saveEdit")}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Card>
  );
}

function BatchCrossPostPanel({
  t,
  selectedCount,
  loading,
  error,
  source,
  copies,
  selectedPlatform,
  copiedPlatform,
  selectedCopy,
  onGenerate,
  onSelectPlatform,
  onCopy,
}: {
  t: ReturnType<typeof useI18n>["t"];
  selectedCount: number;
  loading: boolean;
  error: string | null;
  source: "ai" | "fallback" | null;
  copies: CrossPostCopy[];
  selectedPlatform: CrossPostPlatform;
  copiedPlatform: CrossPostPlatform | null;
  selectedCopy: CrossPostCopy | null;
  onGenerate: () => void;
  onSelectPlatform: (platform: CrossPostPlatform) => void;
  onCopy: () => void;
}) {
  const hasCopies = copies.length > 0;

  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-orange-200 bg-white text-[#d73f09] shadow-sm">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <Text className="font-semibold text-gray-950">
              {t("seller.crossPostTitle")}
            </Text>
            <Text as="p" color="gray" size="2" className="mt-1">
              {t("seller.crossPostHelp")}
            </Text>
            <span className="mt-2 inline-flex rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm">
              {t("seller.crossPostBatchCount", { count: selectedCount })}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Button
            type="button"
            variant="soft"
            onClick={onGenerate}
            disabled={loading}
            className="whitespace-nowrap"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading
              ? t("seller.crossPostGenerating")
              : hasCopies
                ? t("seller.crossPostRegenerate")
                : t("seller.crossPostGenerate")}
          </Button>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {hasCopies && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {crossPostPlatforms.map((platform) => {
              const selected = selectedPlatform === platform;
              return (
                <button
                  key={platform}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelectPlatform(platform)}
                  className={`min-h-10 rounded-md border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d73f09] focus-visible:ring-offset-2 ${
                    selected
                      ? "border-[#d73f09] bg-[#d73f09] text-white shadow-sm"
                      : "border-slate-200 bg-white text-gray-700 hover:border-orange-200 hover:bg-orange-50"
                  }`}
                >
                  {crossPostPlatformLabels[platform]}
                </button>
              );
            })}
          </div>

          {selectedCopy && (
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Text className="font-semibold text-gray-950">
                      {selectedCopy.title}
                    </Text>
                    {source && (
                      <span className="rounded-md bg-orange-50 px-2 py-1 text-xs font-semibold text-[#8f2805]">
                        {source === "ai"
                          ? t("seller.crossPostAiDraft")
                          : t("seller.crossPostFallback")}
                      </span>
                    )}
                  </div>
                  <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-slate-100 bg-slate-50 p-3 text-sm leading-6 text-gray-700">
                    {selectedCopy.body}
                  </pre>
                </div>
                <Button
                  type="button"
                  highContrast
                  onClick={onCopy}
                  className="shrink-0 whitespace-nowrap"
                >
                  <Copy className="h-4 w-4" />
                  {copiedPlatform === selectedCopy.platform
                    ? t("seller.crossPostCopied")
                    : t("seller.crossPostCopy")}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
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
    <div className="inline-flex max-w-full items-center rounded-md border border-orange-100 bg-orange-50 px-3 py-2 text-xs text-gray-700">
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
      className={`app-card overflow-hidden ${
        request.status !== "sent" ? "opacity-70" : ""
      }`}
    >
      <div className="flex gap-3 p-4">
        <img
          src={request.product?.imageUrl || "/images/Bike_0.jpg"}
          alt={displayName}
          className="h-14 w-14 shrink-0 rounded-md border border-orange-100 object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Text className="block truncate font-semibold text-gray-950">
                {displayName}
              </Text>
              <Text color="gray" size="2">
                {t("requests.qty", { quantity: request.quantity })} -{" "}
                {t("seller.buyer", { id: request.buyerId.slice(0, 8) })}
              </Text>
            </div>
            <StatusBadge status={request.status} />
          </div>
        </div>
      </div>

      {request.note && (
        <p className="mx-4 rounded-md bg-orange-50 px-3 py-2 text-sm text-gray-700">
          {request.note}
        </p>
      )}

      {request.status === "accepted" && request.buyerEmail ? (
        <div className="mx-4 mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {t("seller.buyerContact")}{" "}
          <a className="font-medium underline" href={`mailto:${request.buyerEmail}`}>
            {request.buyerEmail}
          </a>
        </div>
      ) : (
        <Text className="mx-4 mt-3 block" color="gray" size="2">
          {t("seller.emailAfterAccept")}
        </Text>
      )}

      {request.status === "sent" && (
        <p
          className={`mx-4 mt-3 rounded-md border px-3 py-2 text-sm ${
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

      <div className="mt-4 flex flex-wrap gap-2 border-t border-orange-100 bg-slate-50/60 px-4 py-3">
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
