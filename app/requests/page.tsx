"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, Heading, Text, Theme } from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import Header from "../components/Header";

type RequestStatus = "sent" | "accepted" | "declined" | "cancelled";

type BuyerRequest = {
  id: string;
  itemId: string;
  quantity: number;
  note: string;
  status: RequestStatus;
  createdAt: string;
  sellerEmail?: string | null;
  product: {
    id: string | number;
    name: string;
    price: number;
    imageUrl?: string | null;
  } | null;
};

const currency = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function RequestsPage() {
  const [requests, setRequests] = useState<BuyerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/requests", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Failed to load requests.");
        }

        return res.json();
      })
      .then((payload) => setRequests(payload.data ?? []))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load requests.")
      )
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <Theme appearance="light" accentColor="orange" grayColor="sand">
      <main className="min-h-screen bg-gradient-to-br from-white via-[#fff1f1] to-[#ffe6e6] px-4 py-20">
        <Header />

        <section className="mx-auto max-w-5xl">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <Heading size="8" className="text-[#333]">
                My Requests
              </Heading>
              <Text color="gray">
                {requests.length} total, {acceptedCount} accepted
              </Text>
            </div>

            <Link href="/overview">
              <Button variant="soft">
                <ArrowLeftIcon /> Marketplace
              </Button>
            </Link>
          </div>

          {error && (
            <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="space-y-4">
            {loading ? (
              <Card className="p-5">Loading requests...</Card>
            ) : requests.length === 0 ? (
              <Card className="p-8 text-center">
                <Heading size="5" className="mb-2">
                  No requests yet
                </Heading>
                <Text color="gray">
                  Send a request from your cart to start a trade.
                </Text>
                <div className="mt-5">
                  <Link href="/overview">
                    <Button highContrast>Browse items</Button>
                  </Link>
                </div>
              </Card>
            ) : (
              requests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  onCancel={() => cancelRequest(request.id)}
                />
              ))
            )}
          </div>
        </section>
      </main>
    </Theme>
  );
}

function RequestCard({
  request,
  onCancel,
}: {
  request: BuyerRequest;
  onCancel: () => void;
}) {
  return (
    <Card className="border border-orange-200 bg-white/70 p-4 shadow">
      <div className="flex gap-4">
        <img
          src={request.product?.imageUrl || "/images/Bike_0.jpg"}
          alt={request.product?.name || `Item ${request.itemId}`}
          className="h-24 w-24 rounded-md object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Text className="block font-medium">
                {request.product?.name || `Item ${request.itemId}`}
              </Text>
              <Text color="gray" size="2">
                Qty {request.quantity}
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

          {request.status === "accepted" && request.sellerEmail ? (
            <div className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              Seller accepted. Contact:{" "}
              <a className="font-medium underline" href={`mailto:${request.sellerEmail}`}>
                {request.sellerEmail}
              </a>
            </div>
          ) : (
            <Text className="mt-3 block" color="gray" size="2">
              Contact details appear after the seller accepts your request.
            </Text>
          )}

          {request.status === "sent" && (
            <Button className="mt-4" color="red" variant="soft" onClick={onCancel}>
              Cancel request
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: RequestStatus }) {
  if (status === "accepted") return <Badge color="green">accepted</Badge>;
  if (status === "declined" || status === "cancelled") {
    return <Badge color="red">{status}</Badge>;
  }
  return <Badge color="amber">{status}</Badge>;
}
