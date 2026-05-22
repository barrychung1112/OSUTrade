"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Badge, Button, Card, Heading, Text, Theme } from "@radix-ui/themes";
import { ArrowLeftIcon, CheckIcon, Cross2Icon, PlusIcon } from "@radix-ui/react-icons";
import Header from "../components/Header";
import { useI18n } from "../i18n";

type ProductStatus = "available" | "pending" | "sold" | "removed";
type RequestStatus = "sent" | "accepted" | "declined" | "cancelled";

type SellerProduct = {
  id: string | number;
  name: string;
  price: number;
  category?: string | null;
  imageUrl?: string | null;
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
    price: number;
    imageUrl?: string | null;
  } | null;
};

const currency = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function SellerPage() {
  const { t } = useI18n();
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [requests, setRequests] = useState<SellerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadSellerData() {
    setLoading(true);
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

      setProducts(productsPayload.data ?? []);
      setRequests(requestsPayload.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSellerData();
  }, []);

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "sent").length,
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

  async function updateRequest(requestId: string, status: RequestStatus) {
    const res = await fetch("/api/seller/requests", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requestId, status }),
    });

    if (res.ok) {
      const payload = await res.json();
      setRequests((current) =>
        current.map((item) => (item.id === requestId ? payload.request : item))
      );
      if (status === "accepted") {
        await loadSellerData();
      }
    }
  }

  async function updateProduct(productId: string | number, status: ProductStatus) {
    const res = await fetch("/api/seller/products", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId, status }),
    });

    if (res.ok) {
      const payload = await res.json();
      setProducts((current) =>
        current.map((item) => (item.id === productId ? payload.product : item))
      );
    }
  }

  return (
    <Theme appearance="light" accentColor="orange" grayColor="sand">
      <main className="min-h-screen bg-gradient-to-br from-white via-[#fff7f2] to-[#ffe7df] px-4 py-28">
        <Header />

        <section className="mx-auto max-w-7xl">
          <div className="mb-6 rounded-xl border border-orange-100 bg-white/85 p-5 shadow-sm backdrop-blur md:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#d73f09]">
                  {t("nav.seller")}
                </p>
                <Heading size="8" className="text-gray-950">
                  {t("seller.title")}
                </Heading>
                <Text as="p" color="gray" className="mt-2 max-w-2xl">
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

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <StatCard label={t("seller.totalListings")} value={activeListings} />
              <StatCard label={t("seller.pendingRequests")} value={pendingRequests} />
              <StatCard label={t("seller.availableUnits")} value={availableUnits} />
            </div>
          </div>

          {error && (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,1fr)]">
            <section className="rounded-xl border border-orange-100 bg-white/80 p-4 shadow-sm backdrop-blur md:p-5">
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
                  products.map((product) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      onStatus={(status) => updateProduct(product.id, status)}
                      t={t}
                    />
                  ))
                )}
              </div>
            </section>

            <section className="rounded-xl border border-orange-100 bg-white/80 p-4 shadow-sm backdrop-blur md:p-5">
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
                  requests.map((request) => (
                    <RequestRow
                      key={request.id}
                      request={request}
                      onUpdate={(status) => updateRequest(request.id, status)}
                      t={t}
                    />
                  ))
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

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-orange-200 bg-white/70 px-6 py-10 text-center">
      <Heading size="4" className="text-gray-950">
        {title}
      </Heading>
      <Text as="p" color="gray" className="mx-auto mt-2 max-w-sm">
        {body}
      </Text>
      <div className="mt-5 flex justify-center">{action}</div>
    </div>
  );
}

function ProductRow({
  product,
  onStatus,
  t,
}: {
  product: SellerProduct;
  onStatus: (status: ProductStatus) => void;
  t: ReturnType<typeof useI18n>["t"];
}) {
  return (
    <Card className="border border-orange-100 bg-white p-3 shadow-sm">
      <div className="flex gap-4">
        <img
          src={product.imageUrl || "/images/Bike_0.jpg"}
          alt={product.name}
          className="h-20 w-20 shrink-0 rounded-md object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Text className="block truncate font-medium">{product.name}</Text>
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
            <Button
              size="2"
              variant="soft"
              onClick={() => onStatus("available")}
              disabled={product.status === "available"}
            >
              {t("seller.available")}
            </Button>
            <Button
              size="2"
              variant="soft"
              onClick={() => onStatus("pending")}
              disabled={product.status === "pending"}
            >
              {t("seller.pending")}
            </Button>
            <Button
              size="2"
              highContrast
              onClick={() => onStatus("sold")}
              disabled={product.status === "sold"}
            >
              {t("seller.sold")}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function RequestRow({
  request,
  onUpdate,
  t,
}: {
  request: SellerRequest;
  onUpdate: (status: RequestStatus) => void;
  t: ReturnType<typeof useI18n>["t"];
}) {
  return (
    <Card className="border border-orange-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Text className="block truncate font-medium">
            {request.product?.name || `Item ${request.itemId}`}
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

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="2"
          highContrast
          onClick={() => onUpdate("accepted")}
          disabled={request.status === "accepted"}
        >
          <CheckIcon /> {t("seller.accept")}
        </Button>
        <Button
          size="2"
          color="red"
          variant="soft"
          onClick={() => onUpdate("declined")}
          disabled={request.status === "declined"}
        >
          <Cross2Icon /> {t("seller.decline")}
        </Button>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "accepted" || status === "available") {
    return <Badge color="green">{status}</Badge>;
  }
  if (status === "declined" || status === "removed") {
    return <Badge color="red">{status}</Badge>;
  }
  if (status === "sold") {
    return <Badge color="blue">{status}</Badge>;
  }
  return <Badge color="amber">{status}</Badge>;
}
