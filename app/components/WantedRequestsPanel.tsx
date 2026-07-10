"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Heading, Text } from "@radix-ui/themes";
import {
  BellIcon,
  CheckIcon,
  Cross2Icon,
  PauseIcon,
  PlusIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import { useI18n } from "../i18n";

type WantedStatus = "active" | "paused" | "fulfilled" | "deleted";

type WantedRequest = {
  id: string;
  query: string;
  maxPrice: number | null;
  category: string | null;
  description: string;
  emailSubscribed: boolean;
  status: WantedStatus;
};

const copy = {
  en: {
    eyebrow: "Wanted items",
    title: "Tell OSUTrade what you are looking for",
    subtitle:
      "Save a wanted item and turn on email alerts. When a matching listing appears, OSUTrade will send you a link.",
    wantedItem: "Wanted item",
    wantedPlaceholder: "e.g., mini fridge, bike, monitor",
    budget: "Max budget",
    category: "Category",
    description: "Notes",
    descriptionPlaceholder: "Preferred size, condition, pickup timing...",
    emailAlerts: "Email me when matching listings appear",
    save: "Save wanted item",
    saving: "Saving...",
    active: "Active",
    paused: "Paused",
    fulfilled: "Fulfilled",
    alertsOn: "Email alerts on",
    alertsOff: "Email alerts off",
    budgetLabel: "Budget: {price}",
    noBudget: "No budget limit",
    empty: "No wanted items yet",
    emptyHelp:
      "Add the first item you are trying to find. You can pause alerts anytime.",
    pause: "Pause",
    resume: "Resume",
    markFulfilled: "Mark fulfilled",
    delete: "Delete",
    loadError: "Failed to load wanted items.",
    saveError: "Failed to save wanted item.",
  },
  zh: {
    eyebrow: "想買清單",
    title: "告訴 OSUTrade 你正在找什麼",
    subtitle:
      "留下想買的物品並開啟 email 訂閱；有相關商品上架時，系統會寄連結給你。",
    wantedItem: "想買的物品",
    wantedPlaceholder: "例如：小冰箱、腳踏車、螢幕",
    budget: "最高預算",
    category: "分類",
    description: "補充說明",
    descriptionPlaceholder: "偏好的尺寸、狀況、取貨時間...",
    emailAlerts: "有相關商品上架時寄 email 給我",
    save: "儲存想買清單",
    saving: "儲存中...",
    active: "訂閱中",
    paused: "已暫停",
    fulfilled: "已買到",
    alertsOn: "Email 通知開啟",
    alertsOff: "Email 通知關閉",
    budgetLabel: "預算：{price}",
    noBudget: "不限制預算",
    empty: "目前沒有想買清單",
    emptyHelp: "新增第一個你正在找的物品；之後可以隨時暫停通知。",
    pause: "暫停",
    resume: "重新開啟",
    markFulfilled: "標記已買到",
    delete: "刪除",
    loadError: "想買清單載入失敗。",
    saveError: "想買清單儲存失敗。",
  },
  zhCn: {
    eyebrow: "想买清单",
    title: "告诉 OSUTrade 你正在找什么",
    subtitle:
      "留下想买的物品并开启 email 订阅；有相关商品上架时，系统会寄链接给你。",
    wantedItem: "想买的物品",
    wantedPlaceholder: "例如：小冰箱、自行车、显示器",
    budget: "最高预算",
    category: "分类",
    description: "补充说明",
    descriptionPlaceholder: "偏好的尺寸、状况、取货时间...",
    emailAlerts: "有相关商品上架时寄 email 给我",
    save: "保存想买清单",
    saving: "保存中...",
    active: "订阅中",
    paused: "已暂停",
    fulfilled: "已买到",
    alertsOn: "Email 通知开启",
    alertsOff: "Email 通知关闭",
    budgetLabel: "预算：{price}",
    noBudget: "不限制预算",
    empty: "目前没有想买清单",
    emptyHelp: "新增第一个你正在找的物品；之后可以随时暂停通知。",
    pause: "暂停",
    resume: "重新开启",
    markFulfilled: "标记已买到",
    delete: "删除",
    loadError: "想买清单加载失败。",
    saveError: "想买清单保存失败。",
  },
};

const categories = ["general", "electronics", "clothing", "books", "home"];

const currency = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD" });

function statusColor(status: WantedStatus) {
  if (status === "active") return "green";
  if (status === "fulfilled") return "blue";
  return "amber";
}

export default function WantedRequestsPanel() {
  const { locale, t } = useI18n();
  const labels = copy[locale];
  const [items, setItems] = useState<WantedRequest[]>([]);
  const [query, setQuery] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [emailSubscribed, setEmailSubscribed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadItems() {
    setLoading(true);
    try {
      const response = await fetch("/api/wanted-requests", { cache: "no-store" });
      if (!response.ok) throw new Error(labels.loadError);
      const payload = await response.json();
      setItems((payload.data ?? []) as WantedRequest[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.loadError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createWantedRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/wanted-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query,
          maxPrice,
          category,
          description,
          emailSubscribed,
        }),
      });
      if (!response.ok) throw new Error(labels.saveError);
      const payload = await response.json();
      setItems((current) => [payload.data as WantedRequest, ...current]);
      setQuery("");
      setMaxPrice("");
      setCategory("");
      setDescription("");
      setEmailSubscribed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function updateWantedRequest(id: string, values: Record<string, unknown>) {
    const response = await fetch("/api/wanted-requests", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...values }),
    });
    if (!response.ok) throw new Error(labels.saveError);
    const payload = await response.json();
    setItems((current) =>
      current.map((item) => (item.id === id ? (payload.data as WantedRequest) : item))
    );
  }

  async function deleteWantedRequest(id: string) {
    const response = await fetch(`/api/wanted-requests?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error(labels.saveError);
    setItems((current) => current.filter((item) => item.id !== id));
  }

  const activeCount = useMemo(
    () => items.filter((item) => item.status === "active").length,
    [items]
  );

  return (
    <div className="space-y-5">
      <section className="app-panel">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="app-eyebrow">{labels.eyebrow}</p>
            <Heading size="6" className="text-gray-950">
              {labels.title}
            </Heading>
            <Text as="p" color="gray" className="mt-2 max-w-2xl">
              {labels.subtitle}
            </Text>
          </div>
          <div className="rounded-lg border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-semibold text-[#d73f09]">
            <BellIcon /> <span className="ml-2">{activeCount}</span>
          </div>
        </div>

        <form onSubmit={createWantedRequest} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-[1.4fr_0.7fr_0.8fr]">
            <label className="grid gap-1 text-sm font-semibold text-gray-700">
              {labels.wantedItem}
              <input
                className="app-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={labels.wantedPlaceholder}
                required
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-gray-700">
              {labels.budget}
              <input
                className="app-input"
                type="number"
                min="1"
                step="1"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                placeholder="100"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-gray-700">
              {labels.category}
              <select
                className="app-input"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="">{t("marketplace.allCategories")}</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {t(`common.category.${item}` as any)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="grid gap-1 text-sm font-semibold text-gray-700">
            {labels.description}
            <textarea
              className="app-input min-h-24 resize-y"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={labels.descriptionPlaceholder}
            />
          </label>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={emailSubscribed}
                onChange={(event) => setEmailSubscribed(event.target.checked)}
                className="h-4 w-4 accent-[#d73f09]"
              />
              {labels.emailAlerts}
            </label>
            <Button highContrast size="3" type="submit" disabled={saving}>
              <PlusIcon /> {saving ? labels.saving : labels.save}
            </Button>
          </div>
        </form>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </section>

      <section className="grid gap-3">
        {loading ? (
          <Card className="app-card p-5">{t("common.loading")}</Card>
        ) : items.length === 0 ? (
          <Card className="app-card border-dashed p-8 text-center">
            <Heading size="4">{labels.empty}</Heading>
            <Text as="p" color="gray" className="mx-auto mt-2 max-w-md">
              {labels.emptyHelp}
            </Text>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id} className="app-card p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Heading size="4" className="text-gray-950">
                      {item.query}
                    </Heading>
                    <Badge color={statusColor(item.status)}>
                      {labels[item.status] ?? item.status}
                    </Badge>
                    <Badge color={item.emailSubscribed ? "green" : "gray"} variant="soft">
                      {item.emailSubscribed ? labels.alertsOn : labels.alertsOff}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                    <span>
                      {item.maxPrice
                        ? labels.budgetLabel.replace("{price}", currency(item.maxPrice))
                        : labels.noBudget}
                    </span>
                    {item.category && <span>• {t(`common.category.${item.category}` as any)}</span>}
                  </div>
                  {item.description && (
                    <p className="mt-3 rounded-md bg-orange-50 px-3 py-2 text-sm text-gray-700">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 md:justify-end">
                  {item.status === "active" ? (
                    <Button
                      variant="soft"
                      color="amber"
                      onClick={() => updateWantedRequest(item.id, { status: "paused" })}
                    >
                      <PauseIcon /> {labels.pause}
                    </Button>
                  ) : item.status === "paused" ? (
                    <Button
                      variant="soft"
                      color="green"
                      onClick={() => updateWantedRequest(item.id, { status: "active" })}
                    >
                      <ReloadIcon /> {labels.resume}
                    </Button>
                  ) : null}
                  {item.status !== "fulfilled" && (
                    <Button
                      variant="soft"
                      color="blue"
                      onClick={() =>
                        updateWantedRequest(item.id, {
                          status: "fulfilled",
                          emailSubscribed: false,
                        })
                      }
                    >
                      <CheckIcon /> {labels.markFulfilled}
                    </Button>
                  )}
                  <Button
                    variant="soft"
                    color="red"
                    onClick={() => deleteWantedRequest(item.id)}
                  >
                    <Cross2Icon /> {labels.delete}
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
