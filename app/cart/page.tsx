"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
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
  CheckCircledIcon,
  CheckIcon,
  MinusIcon,
  PlusIcon,
  RocketIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import Header from "../components/Header";
import EmptyState from "../components/EmptyState";
import LoginModal from "../components/LoginModal";
import { useI18n } from "../i18n";
import { pickProductName, type ProductNameTranslations } from "../lib/productTranslations";
import { shouldPromptLoginForRequestAction } from "../lib/requestActionAccess";

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
  status: "sent" | "accepted" | "declined" | "cancelled" | "expired";
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
  const { data: session, status } = useSession();
  const [items, setItems] = useState<CartItem[]>([]);
  const [states, setStates] = useState<Record<string, ItemState>>({});
  const [activeRequestItemIds, setActiveRequestItemIds] = useState<Set<string>>(
    () => new Set()
  );
  const [loading, setLoading] = useState(true);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);

  useEffect(() => {
    if (status === "loading") return;

    const requestStatus =
      status === "authenticated" && session?.user
        ? fetch("/api/requests", { cache: "no-store" }).then((res) =>
            res.ok ? res.json() : { data: [] }
          )
        : Promise.resolve({ data: [] });

    Promise.all([
      fetch("/api/cart", { cache: "no-store" }).then((res) => res.json()),
      requestStatus,
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
  }, [session?.user, status]);

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
    if (
      shouldPromptLoginForRequestAction({
        authStatus: status,
        hasUser: !!session?.user,
      })
    ) {
      setLoginPromptOpen(true);
      return;
    }

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
    if (
      shouldPromptLoginForRequestAction({
        authStatus: status,
        hasUser: !!session?.user,
      })
    ) {
      setLoginPromptOpen(true);
      return;
    }

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
        <LoginModal
          redirectTo="/cart"
          open={loginPromptOpen}
          onOpenChange={setLoginPromptOpen}
          trigger={null}
        />
        <div className="app-container">
          <div className="app-hero flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="app-eyebrow">{t("nav.cart")}</p>
              <Heading size="8" className="app-title">
                {t("cart.title")}
              </Heading>
              <Text as="p" color="gray" className="mt-2 max-w-2xl leading-6">
                {t("cart.emptyHelp")}
              </Text>
            </div>

            <Link href="/overview" className="inline-flex">
              <Button variant="soft" size="3">
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
              <Card className="app-card sticky top-24 overflow-hidden p-0">
                <div className="border-b border-orange-100 bg-orange-50/60 px-5 py-4">
                  <Heading size="5">{t("cart.summary")}</Heading>
                  <Text as="p" color="gray" size="2" className="mt-1">
                    {allSent ? t("cart.complete") : t("cart.pendingTotal")}
                  </Text>
                </div>

                <div className="space-y-3 p-5">
                  <div className="grid grid-cols-3 gap-2">
                    <SummaryMetric label={t("cart.items")} value={String(items.length)} />
                    <SummaryMetric label={t("cart.sent")} value={String(sentCount)} tone="success" />
                    <SummaryMetric label={t("cart.failed")} value={String(errorCount)} tone="danger" />
                  </div>

                  <div className="rounded-lg border border-orange-100 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between text-sm font-semibold text-gray-700">
                      <span>{t("cart.pendingTotal")}</span>
                      <span>{`${pendingCount} / ${items.length}`}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-orange-100">
                      <div
                        className="h-full rounded-full bg-[#d73f09] transition-all"
                        style={{
                          width: items.length
                            ? `${Math.round((sentCount / items.length) * 100)}%`
                            : "0%",
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <SummaryRow label={t("cart.items")} value={String(items.length)} />
                  <SummaryRow label={t("cart.subtotal")} value={currency(subtotal)} />
                  <SummaryRow
                    label={t("cart.pendingTotal")}
                    value={`${pendingCount} / ${items.length}`}
                  />
                  <SummaryRow label={t("cart.sent")} value={String(sentCount)} />
                  <SummaryRow label={t("cart.failed")} value={String(errorCount)} />
                </div>

                  <Separator my="2" size="4" />

                {allSent && (
                  <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm leading-6 text-green-800">
                    {t("cart.complete")}
                  </p>
                )}

                <button
                  type="button"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#d73f09] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#b43305] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                  onClick={sendAll}
                  disabled={items.length === 0 || allSent}
                >
                  {allSent ? <CheckIcon /> : <RocketIcon />}
                  {allSent ? t("cart.allSent") : t("cart.sendAll")}
                </button>
                </div>
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
    <Card className="app-card overflow-hidden p-0">
      <div className="grid gap-0 lg:grid-cols-[160px,1fr,190px]">
        <div className="relative h-56 w-full overflow-hidden bg-gray-100 sm:h-64 lg:h-full lg:min-h-[248px]">
          <img
            src={item.imageUrl || "/images/Bike_0.jpg"}
            alt={displayName}
            className="h-full w-full object-cover"
          />
          <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold capitalize text-gray-700 shadow-sm">
            {item.category || "general"}
          </div>
        </div>

        <div className="min-w-0 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Text className="block text-xl font-bold leading-7 text-gray-950">
                {displayName}
              </Text>
              <Text color="gray" size="2" className="mt-1 block">
                {t("product.stock", { quantity: item.availableQuantity ?? 1 })}
              </Text>
            </div>

            <button
              type="button"
              onClick={onRemove}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 shadow-sm transition hover:border-red-300 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              aria-label={t("cart.remove")}
              title={t("cart.remove")}
            >
              <TrashIcon /> <span>{t("cart.remove")}</span>
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm">
              <button
                type="button"
                onClick={onMinus}
                className="flex h-11 w-11 items-center justify-center transition hover:bg-gray-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d73f09] focus-visible:ring-inset"
                aria-label={t("cart.decrease")}
              >
                <MinusIcon />
              </button>
              <span className="min-w-10 select-none px-3 text-center font-semibold">
                {item.quantity}
              </span>
              <button
                type="button"
                onClick={onPlus}
                disabled={
                  Number.isInteger(item.availableQuantity) &&
                  item.quantity >= Number(item.availableQuantity)
                }
                className="flex h-11 w-11 items-center justify-center transition hover:bg-gray-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d73f09] focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-45"
                aria-label={t("cart.increase")}
              >
                <PlusIcon />
              </button>
            </div>

            <Text className="rounded-full bg-orange-50 px-4 py-2 text-lg font-bold text-[#d73f09]">
              {currency(item.price * item.quantity)}
            </Text>
          </div>

          <div className="mt-5">
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
              <div className="mt-3 flex flex-wrap items-center gap-2">
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
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 border-t border-orange-100 bg-orange-50/40 p-5 lg:border-l lg:border-t-0">
          {state?.status === "sent" || requestBlocked ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-900">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <CheckCircledIcon /> {t("cart.sent")}
              </div>
              <Text as="p" size="2" className="leading-6 text-green-800">
                {t("cart.requestAlreadySent")}
              </Text>
            </div>
          ) : (
            <div className="rounded-lg border border-orange-100 bg-white p-4">
              <Text as="p" size="2" color="gray" className="leading-6">
                {t("cart.notePlaceholder")}
              </Text>
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#d73f09] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#b43305] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d73f09] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
              disabled={disabled || state?.status === "sent"}
              onClick={onSend}
            >
              {state?.status === "sent" || requestBlocked ? <CheckIcon /> : <RocketIcon />}
              {state?.status === "sending"
                ? t("cart.sending")
                : state?.status === "sent" || requestBlocked
                  ? t("cart.sent")
                  : t("cart.send")}
            </button>

            {(state?.status === "sent" || requestBlocked) && (
              <Link href="/requests" className="block">
                <Button variant="soft" size="3" className="w-full">
                  <ArrowLeftIcon /> {t("cart.viewRequests")}
                </Button>
              </Link>
            )}
          </div>
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
    <div className="flex items-center justify-between gap-3 text-sm">
      <Text color="gray">{label}</Text>
      <Text className="font-semibold tabular-nums">{value}</Text>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "border-green-200 bg-green-50 text-green-800"
      : tone === "danger"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-orange-100 bg-white text-gray-900";

  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <div className="text-xs font-semibold uppercase tracking-wide opacity-75">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
