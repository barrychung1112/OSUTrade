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
  CheckIcon,
  MinusIcon,
  PlusIcon,
  RocketIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import Header from "../components/Header";
import EmptyState from "../components/EmptyState";
import { useI18n } from "../i18n";
import { pickProductName, type ProductNameTranslations } from "../lib/productTranslations";

type CartItem = {
  id: string;
  name: string;
  nameTranslations?: ProductNameTranslations | null;
  price: number;
  imageUrl?: string | null;
  quantity: number;
  availableQuantity?: number | null;
  category?: string | null;
};

type BuyerRequest = {
  itemId: string;
  status: "sent" | "accepted" | "declined" | "cancelled";
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
  const { t, locale } = useI18n();
  const [items, setItems] = useState<CartItem[]>([]);
  const [states, setStates] = useState<Record<string, ItemState>>({});
  const [activeRequestItemIds, setActiveRequestItemIds] = useState<Set<string>>(
    () => new Set()
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/cart", { cache: "no-store" }).then((res) => res.json()),
      fetch("/api/requests", { cache: "no-store" }).then((res) =>
        res.ok ? res.json() : { data: [] }
      ),
    ])
      .then(([cartPayload, requestsPayload]) => {
        const cart = (cartPayload.data ?? []) as CartItem[];
        const requests = (requestsPayload.data ?? []) as BuyerRequest[];
        const activeItems = new Set(
          requests
            .filter((request) => ["sent", "accepted"].includes(request.status))
            .map((request) => String(request.itemId))
        );

        setItems(cart);
        setActiveRequestItemIds(activeItems);
        setStates(
          Object.fromEntries(
            cart.map((item) => [
              item.id,
              {
                note: "",
                status: activeItems.has(String(item.id)) ? "sent" : "idle",
              },
            ])
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
  const allSent = items.length > 0 && sentCount === items.length;

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
          ? {
              ...item,
              quantity: Math.min(
                item.availableQuantity ?? Number.MAX_SAFE_INTEGER,
                Math.max(1, item.quantity + delta)
              ),
            }
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
    if (activeRequestItemIds.has(String(id))) {
      setStates((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          status: "sent",
          errorMsg: t("cart.duplicateRequest"),
        },
      }));
      return;
    }

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
      if (res.status === 409 && payload?.existingRequestId) {
        setActiveRequestItemIds((prev) => new Set(prev).add(String(id)));
      }
      setStates((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          status: res.status === 409 && payload?.existingRequestId ? "sent" : "error",
          errorMsg: payload?.message || t("cart.sendFailed"),
        },
      }));
      return;
    }

    setStates((prev) => ({ ...prev, [id]: { ...prev[id], status: "sent" } }));
    setActiveRequestItemIds((prev) => new Set(prev).add(String(id)));
  }

  async function sendAll() {
    if (allSent) return;

    for (const item of items) {
      if (
        states[item.id]?.status !== "sent" &&
        !activeRequestItemIds.has(String(item.id))
      ) {
        await sendRequest(item.id);
      }
    }
  }

  return (
    <Theme appearance="light" accentColor="orange" grayColor="sand">
      <main className="app-page">
        <Header />
        <div className="app-container">
          <div className="app-hero flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="app-eyebrow">{t("nav.cart")}</p>
              <Heading size="8" className="app-title">
                {t("cart.title")}
              </Heading>
            </div>

            <Link href="/overview" className="inline-flex items-center gap-2">
              <Button variant="soft">
                <ArrowLeftIcon /> {t("cart.backMarketplace")}
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr,380px]">
            <section className="space-y-4">
              {loading ? (
                <Card className="app-card p-6">
                  <Text>{t("cart.loading")}</Text>
                </Card>
              ) : items.length === 0 ? (
                <EmptyState
                  title={t("cart.empty")}
                  body={t("cart.emptyHelp")}
                  action={
                    <Link href="/overview">
                      <Button highContrast>
                        <ArrowLeftIcon /> {t("cart.goShopping")}
                      </Button>
                    </Link>
                  }
                />
              ) : (
                items.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    state={states[item.id]}
                    locale={locale}
                    onNote={(value) => updateNote(item.id, value)}
                    onRemove={() => removeItem(item.id)}
                    onMinus={() => changeQty(item.id, -1)}
                    onPlus={() => changeQty(item.id, 1)}
                    onSend={() => sendRequest(item.id)}
                    requestBlocked={activeRequestItemIds.has(String(item.id))}
                    t={t}
                  />
                ))
              )}
            </section>

            <aside>
              <Card className="app-card p-6">
                <Heading size="5" className="mb-4">
                  {t("cart.summary")}
                </Heading>

                <div className="space-y-2">
                  <SummaryRow label={t("cart.items")} value={String(items.length)} />
                  <SummaryRow label={t("cart.subtotal")} value={currency(subtotal)} />
                  <SummaryRow
                    label={t("cart.pendingTotal")}
                    value={`${pendingCount} / ${items.length}`}
                  />
                  <SummaryRow label={t("cart.sent")} value={String(sentCount)} />
                  <SummaryRow label={t("cart.failed")} value={String(errorCount)} />
                </div>

                <Separator my="3" size="4" />

                {allSent && (
                  <p className="mb-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                    {t("cart.complete")}
                  </p>
                )}

                <Button
                  size="3"
                  highContrast
                  className="w-full"
                  onClick={sendAll}
                  disabled={items.length === 0 || allSent}
                >
                  {allSent ? <CheckIcon /> : <RocketIcon />}
                  {allSent ? t("cart.allSent") : t("cart.sendAll")}
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
  locale,
  onNote,
  onRemove,
  onMinus,
  onPlus,
  onSend,
  requestBlocked,
  t,
}: {
  item: CartItem;
  state?: ItemState;
  locale: ReturnType<typeof useI18n>["locale"];
  onNote: (value: string) => void;
  onRemove: () => void;
  onMinus: () => void;
  onPlus: () => void;
  onSend: () => void;
  requestBlocked: boolean;
  t: ReturnType<typeof useI18n>["t"];
}) {
  const disabled = state?.status === "sending" || requestBlocked;
  const displayName = pickProductName(item.name, item.nameTranslations, locale);

  return (
    <Card className="app-card p-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="h-48 w-full shrink-0 overflow-hidden rounded-md bg-gray-100 sm:h-28 sm:w-28">
          <img
            src={item.imageUrl || "/images/Bike_0.jpg"}
            alt={displayName}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Text className="block truncate text-base font-medium">
                {displayName}
              </Text>
              <Text color="gray" size="2">
                {item.category || "general"}
              </Text>
            </div>

            <button
              onClick={onRemove}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100"
              aria-label={t("cart.remove")}
              title={t("cart.remove")}
            >
              <TrashIcon /> <span>{t("cart.remove")}</span>
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center overflow-hidden rounded-lg border border-gray-300 bg-white">
              <button
                onClick={onMinus}
                className="flex h-10 w-10 items-center justify-center transition hover:bg-gray-50 active:scale-95"
                aria-label={t("cart.decrease")}
              >
                <MinusIcon />
              </button>
              <span className="min-w-10 select-none px-3 text-center font-semibold">
                {item.quantity}
              </span>
              <button
                onClick={onPlus}
                disabled={
                  Number.isInteger(item.availableQuantity) &&
                  item.quantity >= Number(item.availableQuantity)
                }
                className="flex h-10 w-10 items-center justify-center transition hover:bg-gray-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
                aria-label={t("cart.increase")}
              >
                <PlusIcon />
              </button>
            </div>

            <Text className="text-base font-medium">
              {currency(item.price * item.quantity)}
            </Text>
          </div>
          <Text as="p" color="gray" size="1" className="mt-2">
            {t("product.stock", { quantity: item.availableQuantity ?? 1 })}
          </Text>

          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr,auto] sm:items-end">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t("cart.note")}
              </label>
              <textarea
                rows={2}
                value={state?.note ?? ""}
                onChange={(event) => onNote(event.target.value)}
                placeholder={t("cart.notePlaceholder")}
                className="app-input"
                disabled={disabled}
              />
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={state?.status ?? "idle"} />
                {state?.status === "error" && state?.errorMsg ? (
                  <Text color="red" size="2">
                    {state.errorMsg}
                  </Text>
                ) : requestBlocked ? (
                  <Text color="green" size="2">
                    {t("cart.requestAlreadySent")}
                  </Text>
                ) : null}
              </div>
            </div>

            <Button
              size="3"
              highContrast
              className="min-w-full sm:min-w-[168px]"
              disabled={disabled || state?.status === "sent"}
              onClick={onSend}
            >
              {state?.status === "sent" || requestBlocked ? <CheckIcon /> : <RocketIcon />}
              {state?.status === "sending"
                ? t("cart.sending")
                : state?.status === "sent" || requestBlocked
                  ? t("cart.sent")
                  : t("cart.send")}
            </Button>
          </div>
          {(state?.status === "sent" || requestBlocked) && (
            <Link href="/requests" className="mt-3 inline-flex">
              <Button variant="soft" size="2">
                <ArrowLeftIcon /> {t("cart.viewRequests")}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: ItemState["status"] }) {
  const { t } = useI18n();

  if (status === "sending") return <Badge color="amber">{t("cart.sending")}</Badge>;
  if (status === "sent") return <Badge color="green">{t("cart.sent")}</Badge>;
  if (status === "error") return <Badge color="red">{t("cart.error")}</Badge>;
  return <Badge color="gray">{t("cart.idle")}</Badge>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <Text>{label}</Text>
      <Text>{value}</Text>
    </div>
  );
}
