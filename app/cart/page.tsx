"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  Heading,
  Separator,
  Text,
  Theme,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  MinusIcon,
  PlusIcon,
  TrashIcon,
} from "@radix-ui/react-icons";

type CartItem = {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  quantity: number;
  category?: string | null;
};

type ItemState = {
  note: string;
  status: "idle" | "sending" | "sent" | "error";
  errorMsg?: string;
};

const currency = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

async function saveCart(items: CartItem[]) {
  await fetch("/api/cart", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ items }),
  });
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [states, setStates] = useState<Record<string, ItemState>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cart", { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        const cart = (payload.data ?? []) as CartItem[];
        setItems(cart);
        setStates(
          Object.fromEntries(
            cart.map((item) => [item.id, { note: "", status: "idle" }])
          )
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const subtotal = useMemo(
    () => items.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [items]
  );
  const sentCount = useMemo(
    () => Object.values(states).filter((state) => state.status === "sent").length,
    [states]
  );
  const errorCount = useMemo(
    () => Object.values(states).filter((state) => state.status === "error").length,
    [states]
  );
  const pendingCount = items.length - sentCount;

  function replaceItems(nextItems: CartItem[]) {
    setItems(nextItems);
    void saveCart(nextItems);
  }

  function removeItem(id: string) {
    replaceItems(items.filter((item) => item.id !== id));
    setStates((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }

  function changeQty(id: string, delta: number) {
    replaceItems(
      items.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  }

  function updateNote(id: string, note: string) {
    setStates((prev) => ({ ...prev, [id]: { ...prev[id], note } }));
  }

  async function sendRequest(id: string) {
    const item = items.find((candidate) => candidate.id === id);
    if (!item) return;

    setStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], status: "sending", errorMsg: undefined },
    }));

    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        itemId: id,
        quantity: item.quantity,
        note: states[id]?.note || "",
      }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      setStates((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          status: "error",
          errorMsg: payload?.message || "Failed to send request.",
        },
      }));
      return;
    }

    setStates((prev) => ({ ...prev, [id]: { ...prev[id], status: "sent" } }));
  }

  async function sendAll() {
    for (const item of items) {
      if (states[item.id]?.status !== "sent") {
        await sendRequest(item.id);
      }
    }
  }

  return (
    <Theme appearance="light" accentColor="orange" grayColor="sand">
      <main className="min-h-screen bg-gradient-to-br from-white via-[#fff1f1] to-[#ffe6e6] px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center justify-between">
            <Heading size="8" className="text-[#333]">
              Your Requests
            </Heading>

            <Link href="/overview" className="inline-flex items-center gap-2">
              <Button variant="soft">
                <ArrowLeftIcon /> Back to Marketplace
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr,380px]">
            <section className="space-y-4">
              {loading ? (
                <Card className="border border-orange-200 bg-white/60 p-6 shadow">
                  <Text>Loading your cart...</Text>
                </Card>
              ) : items.length === 0 ? (
                <Card className="border border-orange-200 bg-white/60 p-8 text-center shadow">
                  <Heading size="5" className="mb-2">
                    Your cart is empty
                  </Heading>
                  <Text color="gray">
                    Add items in Marketplace and send requests to sellers.
                  </Text>
                  <div className="mt-6">
                    <Link href="/overview">
                      <Button highContrast>Go shopping</Button>
                    </Link>
                  </div>
                </Card>
              ) : (
                items.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    state={states[item.id]}
                    onNote={(value) => updateNote(item.id, value)}
                    onRemove={() => removeItem(item.id)}
                    onMinus={() => changeQty(item.id, -1)}
                    onPlus={() => changeQty(item.id, 1)}
                    onSend={() => sendRequest(item.id)}
                  />
                ))
              )}
            </section>

            <aside>
              <Card className="rounded-2xl border border-orange-200 bg-white/70 p-6 shadow">
                <Heading size="5" className="mb-4">
                  Request Summary
                </Heading>

                <div className="space-y-2">
                  <SummaryRow label="Items" value={String(items.length)} />
                  <SummaryRow label="Subtotal" value={currency(subtotal)} />
                  <SummaryRow
                    label="Pending / Total"
                    value={`${pendingCount} / ${items.length}`}
                  />
                  <SummaryRow label="Sent" value={String(sentCount)} />
                  <SummaryRow label="Failed" value={String(errorCount)} />
                </div>

                <Separator my="3" size="4" />

                <Button
                  size="3"
                  highContrast
                  className="w-full"
                  onClick={sendAll}
                  disabled={items.length === 0}
                >
                  Send all requests
                </Button>
              </Card>
            </aside>
          </div>
        </div>
      </main>
    </Theme>
  );
}

function ItemCard({
  item,
  state,
  onNote,
  onRemove,
  onMinus,
  onPlus,
  onSend,
}: {
  item: CartItem;
  state?: ItemState;
  onNote: (value: string) => void;
  onRemove: () => void;
  onMinus: () => void;
  onPlus: () => void;
  onSend: () => void;
}) {
  const disabled = state?.status === "sending";

  return (
    <Card className="rounded-2xl border border-orange-200 bg-white/60 p-4 shadow">
      <div className="flex gap-4">
        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-gray-100">
          <img
            src={item.imageUrl || "/images/Bike_0.jpg"}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Text className="block truncate text-base font-medium">
                {item.name}
              </Text>
              <Text color="gray" size="2">
                {item.category || "general"}
              </Text>
            </div>

            <button
              onClick={onRemove}
              className="inline-flex items-center gap-1 text-red-600 transition-colors hover:text-red-700"
              aria-label="Remove item"
              title="Remove item"
            >
              <TrashIcon /> <span className="text-sm">Remove</span>
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="inline-flex items-center overflow-hidden rounded-lg border border-gray-300 bg-white">
              <button
                onClick={onMinus}
                className="p-2 transition hover:bg-gray-50 active:scale-95"
                aria-label="Decrease quantity"
              >
                <MinusIcon />
              </button>
              <span className="px-4 select-none">{item.quantity}</span>
              <button
                onClick={onPlus}
                className="p-2 transition hover:bg-gray-50 active:scale-95"
                aria-label="Increase quantity"
              >
                <PlusIcon />
              </button>
            </div>

            <Text className="text-base font-medium">
              {currency(item.price * item.quantity)}
            </Text>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr,auto] sm:items-end">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Note to seller
              </label>
              <textarea
                rows={2}
                value={state?.note ?? ""}
                onChange={(event) => onNote(event.target.value)}
                placeholder="e.g., Can we meet at the library?"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                disabled={disabled}
              />
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={state?.status ?? "idle"} />
                {state?.status === "error" && state?.errorMsg ? (
                  <Text color="red" size="2">
                    {state.errorMsg}
                  </Text>
                ) : null}
              </div>
            </div>

            <Button
              highContrast
              disabled={disabled || state?.status === "sent"}
              onClick={onSend}
            >
              {state?.status === "sending"
                ? "Sending..."
                : state?.status === "sent"
                  ? "Sent"
                  : "Send request"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: ItemState["status"] }) {
  if (status === "sending") return <Badge color="amber">Sending</Badge>;
  if (status === "sent") return <Badge color="green">Sent</Badge>;
  if (status === "error") return <Badge color="red">Error</Badge>;
  return <Badge color="gray">Idle</Badge>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <Text>{label}</Text>
      <Text>{value}</Text>
    </div>
  );
}
