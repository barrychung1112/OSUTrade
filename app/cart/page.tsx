"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Theme,
  Heading,
  Card,
  Separator,
  Button,
  Text,
  Badge,
} from "@radix-ui/themes";
import {
  TrashIcon,
  MinusIcon,
  PlusIcon,
  ArrowLeftIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";

// ---- types ----
type CartItem = {
  id: string;
  name: string;
  price: number; // USD
  imageUrl?: string;
  quantity: number;
  category?: string;
};

type ItemState = {
  note: string;
  status: "idle" | "sending" | "sent" | "error";
  errorMsg?: string;
};

// ---- helpers ----
const currency = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

// ---- mock fetch (你可以接成 /api/cart) ----
async function fetchCart(): Promise<CartItem[]> {
  return [
    {
      id: "p1",
      name: "Mini Fridge",
      price: 49,
      quantity: 1,
      category: "electronics",
      imageUrl:
        "https://bmelflizqrhydlfuovnv.supabase.co/storage/v1/object/public/products//S__5005327_0.jpg",
    },
    {
      id: "p2",
      name: "Desk Lamp",
      price: 19,
      quantity: 2,
      category: "home",
      imageUrl:
        "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=1200&auto=format&fit=crop",
    },
  ];
}

// 真實情境可改成呼叫 /api/requests
async function sendRequestAPI(payload: {
  itemId: string;
  quantity: number;
  note: string;
}) {
  // DEMO：模擬 800ms 成功、20% 機率失敗
  await new Promise((r) => setTimeout(r, 800));
  if (Math.random() < 0.2) {
    const err = new Error("Network error. Please retry.");
    // throw err; // 模擬失敗
    throw err;
  }
  return { ok: true };
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [states, setStates] = useState<Record<string, ItemState>>({});
  const [loading, setLoading] = useState(true);

  // 載入購物車
  useEffect(() => {
    fetchCart()
      .then((data) => {
        setItems(data);
        // 初始化每個 item 的獨立狀態
        const init: Record<string, ItemState> = {};
        data.forEach((i) => {
          init[i.id] = { note: "", status: "idle" };
        });
        setStates(init);
      })
      .finally(() => setLoading(false));
  }, []);

  // 統計
  const subtotal = useMemo(
    () => items.reduce((acc, it) => acc + it.price * it.quantity, 0),
    [items]
  );
  const sentCount = useMemo(
    () => Object.values(states).filter((s) => s.status === "sent").length,
    [states]
  );
  const errorCount = useMemo(
    () => Object.values(states).filter((s) => s.status === "error").length,
    [states]
  );
  const pendingCount = useMemo(
    () => Object.values(states).filter((s) => s.status !== "sent").length,
    [states]
  );

  // 動作
  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setStates((prev) => {
      const c = { ...prev };
      delete c[id];
      return c;
    });
  };

  const changeQty = (id: string, delta: number) =>
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
      )
    );

  const updateNote = (id: string, note: string) =>
    setStates((prev) => ({ ...prev, [id]: { ...prev[id], note } }));

  const sendRequest = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    setStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], status: "sending", errorMsg: undefined },
    }));
    try {
      // 真實情境可改成 fetch('/api/requests', { method: 'POST', body: JSON.stringify({...}) })
      await sendRequestAPI({
        itemId: id,
        quantity: item.quantity,
        note: states[id]?.note || "",
      });
      setStates((prev) => ({ ...prev, [id]: { ...prev[id], status: "sent" } }));
    } catch (err: any) {
      setStates((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          status: "error",
          errorMsg: err?.message || "Failed",
        },
      }));
    }
  };

  const sendAll = async () => {
    // 逐一送出尚未 sent 的項目
    for (const it of items) {
      if (states[it.id]?.status === "sent") continue;
      // 串行送比較簡單，可以改 Promise.all 並行
      // eslint-disable-next-line no-await-in-loop
      await sendRequest(it.id);
    }
  };

  return (
    <Theme appearance="light" accentColor="orange" grayColor="sand">
      <main className="min-h-screen bg-gradient-to-br from-white via-[#fff1f1] to-[#ffe6e6] px-4 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <Heading size="8" className="text-[#333]">
              Your Requests
            </Heading>

            <Link href="/product" className="inline-flex items-center gap-2">
              <Button variant="soft">
                <ArrowLeftIcon /> Back to Marketplace
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-8">
            {/* LEFT: items */}
            <section className="space-y-4">
              {loading ? (
                <Card className="p-6 bg-white/60 backdrop-blur-md border border-orange-200 shadow">
                  <Text>Loading your cart...</Text>
                </Card>
              ) : items.length === 0 ? (
                <Card className="p-8 text-center bg-white/60 backdrop-blur-md border border-orange-200 shadow">
                  <Heading size="5" className="mb-2">
                    Your cart is empty
                  </Heading>
                  <Text color="gray">
                    Add items in Marketplace and send requests to sellers.
                  </Text>
                  <div className="mt-6">
                    <Link href="/product">
                      <Button highContrast>Go shopping</Button>
                    </Link>
                  </div>
                </Card>
              ) : (
                <>
                  {items.map((it) => (
                    <ItemCard
                      key={it.id}
                      item={it}
                      state={states[it.id]}
                      onNote={(v) => updateNote(it.id, v)}
                      onRemove={() => removeItem(it.id)}
                      onMinus={() => changeQty(it.id, -1)}
                      onPlus={() => changeQty(it.id, +1)}
                      onSend={() => sendRequest(it.id)}
                    />
                  ))}
                </>
              )}
            </section>

            {/* RIGHT: summary */}
            <aside>
              <Card className="p-6 bg-white/70 backdrop-blur-md border border-orange-200 shadow rounded-2xl">
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
                  Send ALL requests
                </Button>
              </Card>
            </aside>
          </div>
        </div>
      </main>
    </Theme>
  );
}

// ---- components ----
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
  onNote: (v: string) => void;
  onRemove: () => void;
  onMinus: () => void;
  onPlus: () => void;
  onSend: () => void;
}) {
  const disabled = state?.status === "sending";

  return (
    <Card className="p-4 bg-white/60 backdrop-blur-md border border-orange-200 shadow rounded-2xl">
      <div className="flex gap-4">
        <div className="w-28 h-28 rounded-lg overflow-hidden shrink-0 bg-gray-100">
          <img
            src={
              item.imageUrl ||
              "https://bmelflizqrhydlfuovnv.supabase.co/storage/v1/object/public/products//S__5005327_0.jpg"
            }
            alt={item.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Text className="block text-base font-medium truncate">
                {item.name}
              </Text>
              <Text color="gray" size="2">
                {item.category || "general"}
              </Text>
            </div>

            <button
              onClick={onRemove}
              className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 transition-colors"
              aria-label="Remove item"
              title="Remove item"
            >
              <TrashIcon /> <span className="text-sm">Remove</span>
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="inline-flex items-center rounded-lg border border-gray-300 overflow-hidden bg-white">
              <button
                onClick={onMinus}
                className="p-2 hover:bg-gray-50 active:scale-95 transition"
                aria-label="Decrease quantity"
              >
                <MinusIcon />
              </button>
              <span className="px-4 select-none">{item.quantity}</span>
              <button
                onClick={onPlus}
                className="p-2 hover:bg-gray-50 active:scale-95 transition"
                aria-label="Increase quantity"
              >
                <PlusIcon />
              </button>
            </div>

            <Text className="text-base font-medium">
              {currency(item.price * item.quantity)}
            </Text>
          </div>

          {/* note + status + send */}
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr,auto] sm:items-end">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Note to seller
              </label>
              <textarea
                rows={2}
                value={state?.note ?? ""}
                onChange={(e) => onNote(e.target.value)}
                placeholder="e.g., Can we meet at library? Is there any scratch?"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
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
  if (status === "sending") return <Badge color="amber">Sending…</Badge>;
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
