"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, Heading, Text, Theme } from "@radix-ui/themes";
import { ArrowLeftIcon, CheckIcon, Cross2Icon } from "@radix-ui/react-icons";
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
      <main className="min-h-screen bg-gradient-to-br from-white via-[#fff1f1] to-[#ffe6e6] px-4 py-20">
        <Header />

        <section className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <Heading size="8" className="text-[#333]">
                {t("seller.title")}
              </Heading>
              <Text color="gray">
                {t("seller.counts", {
                  listings: products.length,
                  pending: pendingRequests,
                })}
              </Text>
            </div>

            <div className="flex gap-3">
              <Link href="/overview">
                <Button variant="soft">
                  <ArrowLeftIcon /> {t("nav.marketplace")}
                </Button>
              </Link>
              <Link href="/sell">
                <Button highContrast>{t("marketplace.listItem")}</Button>
              </Link>
            </div>
          </div>

          {error && (
            <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr,1.1fr]">
            <section>
              <Heading size="5" className="mb-4">
                {t("seller.myListings")}
              </Heading>
              <div className="space-y-4">
                {loading ? (
                  <Card className="p-5">{t("seller.loadingListings")}</Card>
                ) : products.length === 0 ? (
                  <Card className="p-5">
                    <Text color="gray">{t("seller.noListings")}</Text>
                  </Card>
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

            <section>
              <Heading size="5" className="mb-4">
                {t("seller.buyerRequests")}
              </Heading>
              <div className="space-y-4">
                {loading ? (
                  <Card className="p-5">{t("seller.loadingRequests")}</Card>
                ) : requests.length === 0 ? (
                  <Card className="p-5">
                    <Text color="gray">{t("seller.noRequests")}</Text>
                  </Card>
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
    <Card className="border border-orange-200 bg-white/70 p-4 shadow">
      <div className="flex gap-4">
        <img
          src={product.imageUrl || "/images/Bike_0.jpg"}
          alt={product.name}
          className="h-20 w-20 rounded-md object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Text className="block font-medium">{product.name}</Text>
              <Text color="gray" size="2">
              {product.category
                ? t(`common.category.${product.category}` as any)
                : t("common.category.general")}{" "}
              - {currency(product.price)}
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
    <Card className="border border-orange-200 bg-white/70 p-4 shadow">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Text className="block font-medium">
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
