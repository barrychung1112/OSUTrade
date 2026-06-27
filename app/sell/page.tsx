"use client";

import { FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Heading, Text, Theme } from "@radix-ui/themes";
import { CheckIcon, Cross2Icon, PlusIcon } from "@radix-ui/react-icons";
import Header from "../components/Header";
import type { AiProductDraft } from "../lib/aiProductDrafts";
import { createBulkDraftRequestTracker } from "../lib/bulkDraftRequest";
import type { Product } from "../lib/products";
import { useI18n } from "../i18n";

const categories = ["general", "electronics", "clothing", "books", "home"];
const maxProductImages = 3;
const maxAiBulkImages = 10;

type PricingAdvice = {
  suggestedPrice: number;
  minPrice: number;
  maxPrice: number;
  confidence: "low" | "medium" | "high";
  summary: string;
  signals: string[];
  supabaseComparables: Array<{ name: string; price: number }>;
  amazonComparables: Array<{ name: string; price: number }>;
};

type FormSectionProps = {
  step: string;
  title: string;
  description: string;
  children: ReactNode;
};

type ListingMode = "manual" | "ai";

type BulkDraft = AiProductDraft & {
  selected: boolean;
  status: "draft" | "publishing" | "published" | "error";
  error?: string | null;
};

function FormSection({ step, title, description, children }: FormSectionProps) {
  return (
    <section className="border-b border-orange-100 p-5 md:p-6">
      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <div className="flex gap-3 lg:block">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d73f09] text-sm font-semibold text-white lg:mb-3">
            {step}
          </div>
          <div>
            <Text as="p" size="3" weight="bold" className="text-gray-950">
              {title}
            </Text>
            <Text as="p" size="2" className="mt-1 leading-relaxed text-gray-600">
              {description}
            </Text>
          </div>
        </div>
        <div className="space-y-5">{children}</div>
      </div>
    </section>
  );
}

export default function SellPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [listingMode, setListingMode] = useState<ListingMode>("manual");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [category, setCategory] = useState("general");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [contactPhone, setContactPhone] = useState("");
  const [contactLineId, setContactLineId] = useState("");
  const [contactWechatId, setContactWechatId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successProduct, setSuccessProduct] = useState<Product | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [pricingAdvice, setPricingAdvice] = useState<PricingAdvice | null>(null);
  const [bulkImageFiles, setBulkImageFiles] = useState<File[]>([]);
  const [bulkImagePreviewUrls, setBulkImagePreviewUrls] = useState<string[]>([]);
  const [bulkDrafts, setBulkDrafts] = useState<BulkDraft[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkPublishing, setBulkPublishing] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccessCount, setBulkSuccessCount] = useState(0);
  const bulkDraftRequestTracker = useRef(createBulkDraftRequestTracker());

  useEffect(() => {
    if (imageFiles.length === 0) {
      setImagePreviewUrls([]);
      return;
    }

    const objectUrls = imageFiles.map((file) => URL.createObjectURL(file));
    setImagePreviewUrls(objectUrls);

    return () => objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
  }, [imageFiles]);

  useEffect(() => {
    if (!successProduct) return;
    if (listingMode !== "manual") return;

    const timer = window.setTimeout(() => {
      router.push(`/product/${successProduct.id}`);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [listingMode, router, successProduct]);

  useEffect(() => {
    if (bulkImageFiles.length === 0) {
      setBulkImagePreviewUrls([]);
      return;
    }

    const objectUrls = bulkImageFiles.map((file) => URL.createObjectURL(file));
    setBulkImagePreviewUrls(objectUrls);

    return () => objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
  }, [bulkImageFiles]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessProduct(null);

    let nextImageUrls = imageUrl.trim() ? [imageUrl.trim()] : [];

    try {
      if (imageFiles.length > maxProductImages) {
        throw new Error(t("sell.imageLimitError"));
      }

      if (imageFiles.length > 0) {
        const uploadForm = new FormData();
        imageFiles.forEach((file) => uploadForm.append("images", file));

        const uploadRes = await fetch("/api/products/images", {
          method: "POST",
          body: uploadForm,
        });

        if (!uploadRes.ok) {
          const payload = await uploadRes.json().catch(() => null);
          throw new Error(payload?.message || t("sell.uploadError"));
        }

        const uploadPayload = await uploadRes.json();
        nextImageUrls = Array.isArray(uploadPayload.imageUrls)
          ? uploadPayload.imageUrls
          : [uploadPayload.imageUrl].filter(Boolean);
      }

      if (nextImageUrls.length === 0) {
        throw new Error(t("sell.imageRequired"));
      }

      if (nextImageUrls.length > maxProductImages) {
        throw new Error(t("sell.imageLimitError"));
      }

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          price: Number(price),
          quantity: Number(quantity),
          category,
          imageUrl: nextImageUrls[0] ?? "",
          imageUrls: nextImageUrls,
          contactPhone,
          contactLineId,
          contactWechatId,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message || t("sell.listError"));
      }

      const product = (await res.json()) as Product;
      setSuccessProduct(product);
      setName("");
      setDescription("");
      setPrice("");
      setQuantity("1");
      setCategory("general");
      setImageUrl("");
      setImageFiles([]);
      setContactPhone("");
      setContactLineId("");
      setContactWechatId("");
      setPricingAdvice(null);
      setPricingError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("sell.listError"));
    } finally {
      setLoading(false);
    }
  }

  function selectImageFiles(files: FileList | null) {
    const selectedFiles = Array.from(files ?? []);
    setImageFiles(selectedFiles.slice(0, maxProductImages));
    if (selectedFiles.length > maxProductImages) {
      setError(t("sell.imageLimitError"));
    } else {
      setError(null);
    }
  }

  function goToProductNow() {
    if (successProduct) {
      router.push(`/product/${successProduct.id}`);
    }
  }

  function listAnotherItem() {
    setSuccessProduct(null);
    setError(null);
  }

  async function requestPricingAdvice() {
    if (!name.trim()) {
      setPricingError(t("sell.itemName"));
      return;
    }

    setPricingLoading(true);
    setPricingError(null);
    setPricingAdvice(null);

    try {
      const res = await fetch("/api/pricing/advice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, description, category }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message || t("sell.pricingAdvisorError"));
      }

      const payload = (await res.json()) as PricingAdvice;
      setPricingAdvice(payload);
    } catch (err) {
      setPricingError(
        err instanceof Error ? err.message : t("sell.pricingAdvisorError")
      );
    } finally {
      setPricingLoading(false);
    }
  }

  function selectBulkImageFiles(files: FileList | null) {
    const selectedFiles = Array.from(files ?? []);
    bulkDraftRequestTracker.current.invalidate();
    setBulkLoading(false);
    setBulkImageFiles(selectedFiles.slice(0, maxAiBulkImages));
    setBulkDrafts([]);
    setBulkSuccessCount(0);

    if (selectedFiles.length > maxAiBulkImages) {
      setBulkError(t("sell.aiBulkLimit"));
    } else {
      setBulkError(null);
    }
  }

  async function generateBulkDrafts() {
    if (bulkImageFiles.length === 0) {
      setBulkError(t("sell.imageRequired"));
      return;
    }

    setBulkLoading(true);
    setBulkError(null);
    setBulkSuccessCount(0);
    const requestId = bulkDraftRequestTracker.current.start();

    try {
      const formData = new FormData();
      bulkImageFiles.forEach((file) => formData.append("images", file));

      const res = await fetch("/api/products/bulk-drafts", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message || t("sell.aiBulkError"));
      }

      const payload = (await res.json()) as { drafts?: AiProductDraft[] };
      if (!bulkDraftRequestTracker.current.isCurrent(requestId)) return;

      const nextDrafts = (payload.drafts ?? []).map((draft) => ({
        ...draft,
        selected: true,
        status: "draft" as const,
        error: null,
      }));

      setBulkDrafts(nextDrafts);
    } catch (err) {
      if (!bulkDraftRequestTracker.current.isCurrent(requestId)) return;
      setBulkError(err instanceof Error ? err.message : t("sell.aiBulkError"));
    } finally {
      if (bulkDraftRequestTracker.current.isCurrent(requestId)) {
        setBulkLoading(false);
      }
    }
  }

  function clearBulkImageFiles() {
    bulkDraftRequestTracker.current.invalidate();
    setBulkLoading(false);
    setBulkImageFiles([]);
    setBulkDrafts([]);
    setBulkSuccessCount(0);
    setBulkError(null);
  }

  function updateBulkDraft(
    draftId: string,
    values: Partial<Pick<BulkDraft, "name" | "description" | "category" | "price" | "quantity" | "selected">>
  ) {
    setBulkDrafts((drafts) =>
      drafts.map((draft) =>
        draft.id === draftId
          ? {
              ...draft,
              ...values,
              status: draft.status === "published" ? "published" : "draft",
              error: null,
            }
          : draft
      )
    );
  }

  function deleteBulkDraft(draftId: string) {
    setBulkDrafts((drafts) => drafts.filter((draft) => draft.id !== draftId));
  }

  async function uploadDraftImages(draft: BulkDraft) {
    const uploadForm = new FormData();
    draft.imageIndexes
      .slice(0, maxProductImages)
      .map((index) => bulkImageFiles[index])
      .filter((file): file is File => Boolean(file))
      .forEach((file) => uploadForm.append("images", file));

    const uploadRes = await fetch("/api/products/images", {
      method: "POST",
      body: uploadForm,
    });

    if (!uploadRes.ok) {
      const payload = await uploadRes.json().catch(() => null);
      throw new Error(payload?.message || t("sell.uploadError"));
    }

    const uploadPayload = await uploadRes.json();
    return Array.isArray(uploadPayload.imageUrls)
      ? uploadPayload.imageUrls
      : [uploadPayload.imageUrl].filter(Boolean);
  }

  async function publishBulkDrafts() {
    const selectedDrafts = bulkDrafts.filter(
      (draft) => draft.selected && draft.status !== "published"
    );

    if (selectedDrafts.length === 0) {
      setBulkError(t("sell.aiBulkNeedsSelection"));
      return;
    }

    setBulkPublishing(true);
    setBulkError(null);
    setBulkSuccessCount(0);

    let publishedCount = 0;

    for (const draft of selectedDrafts) {
      setBulkDrafts((drafts) =>
        drafts.map((item) =>
          item.id === draft.id ? { ...item, status: "publishing", error: null } : item
        )
      );

      try {
        const imageUrls = await uploadDraftImages(draft);
        if (imageUrls.length === 0) {
          throw new Error(t("sell.imageRequired"));
        }

        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: draft.name,
            description: draft.description,
            price: Number(draft.price),
            quantity: Number(draft.quantity),
            category: draft.category,
            imageUrl: imageUrls[0] ?? "",
            imageUrls,
            contactPhone,
            contactLineId,
            contactWechatId,
          }),
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.message || t("sell.listError"));
        }

        publishedCount += 1;
        setBulkDrafts((drafts) =>
          drafts.map((item) =>
            item.id === draft.id ? { ...item, status: "published", selected: false } : item
          )
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t("sell.aiBulkPublishError");
        setBulkDrafts((drafts) =>
          drafts.map((item) =>
            item.id === draft.id ? { ...item, status: "error", error: message } : item
          )
        );
      }
    }

    setBulkSuccessCount(publishedCount);
    if (publishedCount < selectedDrafts.length) {
      setBulkError(t("sell.aiBulkPublishError"));
    }
    setBulkPublishing(false);
  }

  return (
    <Theme appearance="light" accentColor="orange" grayColor="sand">
      <Header />
      <main className="app-page">
        <section className="mx-auto max-w-5xl">
          <div className="app-hero text-center md:text-left">
            <p className="app-eyebrow">{t("nav.sell")}</p>
            <Heading size="8" className="app-title">
              {t("sell.title")}
            </Heading>
            <div className="mt-6 inline-flex rounded-lg border border-orange-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setListingMode("manual")}
                className={`min-h-11 rounded-md px-4 text-sm font-semibold transition ${
                  listingMode === "manual"
                    ? "bg-[#d73f09] text-white"
                    : "text-gray-700 hover:bg-orange-50"
                }`}
              >
                {t("sell.modeManual")}
              </button>
              <button
                type="button"
                onClick={() => setListingMode("ai")}
                className={`min-h-11 rounded-md px-4 text-sm font-semibold transition ${
                  listingMode === "ai"
                    ? "bg-[#d73f09] text-white"
                    : "text-gray-700 hover:bg-orange-50"
                }`}
              >
                {t("sell.modeAiBulk")}
              </button>
            </div>
          </div>

          {listingMode === "manual" && successProduct && (
            <Card className="mb-5 border border-green-200 bg-green-50 p-5 shadow">
              <Heading size="5" className="text-green-900">
                {t("sell.successTitle")}
              </Heading>
              <Text as="p" size="2" className="mt-2 text-green-800">
                {t("sell.successBody", { name: successProduct.name })}
              </Text>
              <Text as="p" size="1" color="gray" className="mt-1">
                {t("sell.redirecting")}
              </Text>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button type="button" highContrast onClick={goToProductNow}>
                  <CheckIcon /> {t("sell.viewListing")}
                </Button>
                <Button type="button" variant="soft" onClick={listAnotherItem}>
                  <PlusIcon /> {t("sell.listAnother")}
                </Button>
                <Link href="/seller">
                  <Button type="button" variant="outline">
                    {t("sell.goSellerDashboard")}
                  </Button>
                </Link>
              </div>
            </Card>
          )}

          {listingMode === "manual" ? (
          <Card className="app-card overflow-hidden p-0">
            <form onSubmit={onSubmit}>
              <FormSection
                step="1"
                title={t("sell.sectionDetails")}
                description={t("sell.sectionDetailsHelp")}
              >
                <label className="block">
                  <Text as="span" size="2" weight="medium">
                    {t("sell.itemName")}
                  </Text>
                  <input
                    className="app-input mt-2"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </label>

                <label className="block">
                  <Text as="span" size="2" weight="medium">
                    {t("sell.description")}
                  </Text>
                  <textarea
                    className="app-input mt-2 min-h-32"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder={t("sell.descriptionPlaceholder")}
                  />
                  <Text as="p" size="1" color="gray" className="mt-1">
                    {t("sell.descriptionHelp")}
                  </Text>
                </label>

                <label className="block">
                  <Text as="span" size="2" weight="medium">
                    {t("marketplace.category")}
                  </Text>
                  <select
                    className="app-input mt-2"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    {categories.map((item) => (
                      <option key={item} value={item}>
                        {t(`common.category.${item}` as any)}
                      </option>
                    ))}
                  </select>
                </label>
              </FormSection>

              <FormSection
                step="2"
                title={t("sell.sectionPrice")}
                description={t("sell.sectionPriceHelp")}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <Text as="span" size="2" weight="medium">
                      {t("sell.price")}
                    </Text>
                    <input
                      className="app-input mt-2"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={price}
                      onChange={(event) => setPrice(event.target.value)}
                      required
                    />
                  </label>

                  <label className="block">
                    <Text as="span" size="2" weight="medium">
                      {t("sell.quantity")}
                    </Text>
                    <input
                      className="app-input mt-2"
                      type="number"
                      min="1"
                      step="1"
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      required
                    />
                  </label>
                </div>

                <div className="rounded-lg border border-orange-100 bg-orange-50/60 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <Text as="p" size="2" weight="medium">
                        {t("sell.pricingAdvisor")}
                      </Text>
                      <Text as="p" size="1" color="gray" className="mt-1">
                        {t("sell.pricingAdvisorHelp")}
                      </Text>
                    </div>
                    <Button
                      type="button"
                      variant="soft"
                      onClick={requestPricingAdvice}
                      disabled={pricingLoading || !name.trim()}
                      className="whitespace-nowrap"
                    >
                      <CheckIcon />
                      {pricingLoading
                        ? t("sell.pricingAdvisorLoading")
                        : t("sell.pricingAdvisor")}
                    </Button>
                  </div>

                  {pricingError && (
                    <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                      {pricingError}
                    </p>
                  )}

                  {pricingAdvice && (
                    <div className="mt-4 rounded-md border border-orange-200 bg-white p-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-2xl font-bold text-[#d73f09]">
                            ${pricingAdvice.suggestedPrice}
                          </p>
                          <p className="mt-1 text-sm text-gray-700">
                            {t("sell.pricingAdvisorRange", {
                              min: pricingAdvice.minPrice,
                              max: pricingAdvice.maxPrice,
                            })}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {t("sell.pricingAdvisorConfidence", {
                              confidence: pricingAdvice.confidence,
                            })}
                          </p>
                        </div>
                        <Button
                          type="button"
                          highContrast
                          onClick={() =>
                            setPrice(String(pricingAdvice.suggestedPrice))
                          }
                        >
                          <CheckIcon />
                          {t("sell.pricingAdvisorApply")}
                        </Button>
                      </div>
                      <p className="mt-3 text-sm text-gray-700">
                        {pricingAdvice.summary}
                      </p>
                      <div className="mt-3">
                        <Text as="p" size="1" weight="medium" color="gray">
                          {t("sell.pricingAdvisorSignals")}
                        </Text>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-gray-600">
                          {pricingAdvice.signals.map((signal) => (
                            <li key={signal}>{signal}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </FormSection>

              <FormSection
                step="3"
                title={t("sell.sectionMedia")}
                description={t("sell.sectionMediaHelp")}
              >
                <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                  <div className="space-y-5">
                    <div>
                      <Text as="span" size="2" weight="medium">
                        {t("sell.productImage")}
                      </Text>
                      <input
                        key={imageFiles.length === 0 ? "empty" : "selected"}
                        id="product-images"
                        className="sr-only"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        multiple
                        onChange={(event) => selectImageFiles(event.target.files)}
                      />
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <label
                          htmlFor="product-images"
                          className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-[#d73f09] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#b43305]"
                        >
                          <PlusIcon /> {t("sell.uploadMedia")}
                        </label>
                        {imageFiles.length > 0 && (
                          <button
                            type="button"
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-orange-200 bg-white px-3 text-sm font-semibold text-[#d73f09] shadow-sm transition hover:bg-orange-50"
                            onClick={() => setImageFiles([])}
                          >
                            <Cross2Icon /> {t("common.clear")}
                          </button>
                        )}
                      </div>
                      <Text as="p" size="1" color="gray" className="mt-1">
                        {t("sell.imageHelp")} {t("sell.imageCountHelp")}
                      </Text>
                      {imageFiles.length > 0 && (
                        <Text as="p" size="1" color="gray" className="mt-1">
                          {t("sell.selectedImages", {
                            count: imageFiles.length,
                          })}
                        </Text>
                      )}
                    </div>

                    <label className="block">
                      <Text as="span" size="2" weight="medium">
                        {t("sell.imageUrlFallback")}
                      </Text>
                      <input
                        className="app-input mt-2"
                        type="url"
                        value={imageUrl}
                        onChange={(event) => setImageUrl(event.target.value)}
                        disabled={imageFiles.length > 0}
                        placeholder="https://..."
                      />
                    </label>
                  </div>

                  <div className="rounded-lg border border-orange-100 bg-orange-50/60 p-3">
                    <Text as="p" size="2" weight="medium" className="mb-2">
                      {t("sell.preview")}
                    </Text>
                    {imagePreviewUrls.length > 0 || imageUrl.trim() ? (
                      <div className="grid grid-cols-2 gap-2">
                        {(imagePreviewUrls.length > 0
                          ? imagePreviewUrls
                          : [imageUrl.trim()]
                        ).map((previewUrl, index) => (
                          <img
                            key={previewUrl}
                            src={previewUrl}
                            alt={`${name || t("sell.productImage")} ${index + 1}`}
                            className={`h-24 w-full rounded-md border border-orange-100 object-cover ${
                              index === 0 ? "col-span-2 h-44" : ""
                            }`}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-44 items-center justify-center rounded-md border border-dashed border-orange-200 bg-white/70 text-sm text-gray-500">
                        {t("sell.previewEmpty")}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-orange-100 bg-orange-50/60 p-4">
                  <Text as="p" size="2" weight="medium">
                    {t("sell.contactMethods")}
                  </Text>
                  <Text as="p" size="1" color="gray" className="mt-1">
                    {t("sell.contactMethodsHelp")}
                  </Text>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <label className="block">
                      <Text as="span" size="2" weight="medium">
                        {t("sell.contactPhone")}
                      </Text>
                      <input
                        className="app-input mt-2"
                        type="tel"
                        value={contactPhone}
                        onChange={(event) => setContactPhone(event.target.value)}
                        placeholder="541-..."
                      />
                    </label>

                    <label className="block">
                      <Text as="span" size="2" weight="medium">
                        {t("sell.contactLine")}
                      </Text>
                      <input
                        className="app-input mt-2"
                        value={contactLineId}
                        onChange={(event) => setContactLineId(event.target.value)}
                        placeholder="line-id"
                      />
                    </label>

                    <label className="block">
                      <Text as="span" size="2" weight="medium">
                        {t("sell.contactWechat")}
                      </Text>
                      <input
                        className="app-input mt-2"
                        value={contactWechatId}
                        onChange={(event) => setContactWechatId(event.target.value)}
                        placeholder="wechat-id"
                      />
                    </label>
                  </div>
                </div>
              </FormSection>

              <div className="flex flex-col gap-3 bg-white p-5 md:flex-row md:items-center md:justify-between md:p-6">
                {error ? (
                  <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                ) : (
                  <Text as="p" size="2" className="text-gray-600">
                    {t("sell.submitHelp")}
                  </Text>
                )}

                <Button
                  highContrast
                  size="3"
                  type="submit"
                  disabled={loading}
                  className="md:min-w-36"
                >
                  <PlusIcon />
                  {loading ? t("sell.listing") : t("sell.submit")}
                </Button>
              </div>
            </form>
          </Card>
          ) : (
            <Card className="app-card overflow-hidden p-0">
              <div className="border-b border-orange-100 bg-orange-50/60 p-5 md:p-6">
                <p className="app-eyebrow">{t("sell.modeAiBulk")}</p>
                <Heading size="6" className="mt-2">
                  {t("sell.aiBulkTitle")}
                </Heading>
                <Text as="p" color="gray" className="mt-2 max-w-3xl leading-6">
                  {t("sell.aiBulkHelp")}
                </Text>
              </div>

              <div className="grid gap-6 p-5 lg:grid-cols-[320px_1fr] md:p-6">
                <aside className="space-y-5">
                  <div className="rounded-lg border border-orange-100 bg-orange-50/60 p-4">
                    <Text as="p" size="2" weight="medium">
                      {t("sell.aiBulkUpload")}
                    </Text>
                    <input
                      key={bulkImageFiles.length === 0 ? "bulk-empty" : "bulk-selected"}
                      id="ai-bulk-images"
                      className="sr-only"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      onChange={(event) => selectBulkImageFiles(event.target.files)}
                    />
                    <div className="mt-3 flex flex-wrap gap-3">
                      <label
                        htmlFor="ai-bulk-images"
                        className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-[#d73f09] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#b43305]"
                      >
                        <PlusIcon /> {t("sell.aiBulkUpload")}
                      </label>
                      {bulkImageFiles.length > 0 && (
                        <button
                          type="button"
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-orange-200 bg-white px-3 text-sm font-semibold text-[#d73f09] shadow-sm transition hover:bg-orange-50"
                          onClick={clearBulkImageFiles}
                        >
                          <Cross2Icon /> {t("common.clear")}
                        </button>
                      )}
                    </div>
                    <Text as="p" size="1" color="gray" className="mt-2">
                      {t("sell.imageHelp")} {t("sell.aiBulkLimit")}
                    </Text>
                    {bulkImageFiles.length > 0 && (
                      <Text as="p" size="1" color="gray" className="mt-1">
                        {t("sell.selectedImages", { count: bulkImageFiles.length })}
                      </Text>
                    )}

                    <Button
                      type="button"
                      highContrast
                      className="mt-4 w-full"
                      disabled={bulkLoading || bulkImageFiles.length === 0}
                      onClick={generateBulkDrafts}
                    >
                      <CheckIcon />
                      {bulkLoading
                        ? t("sell.aiBulkGenerating")
                        : t("sell.aiBulkGenerate")}
                    </Button>
                  </div>

                  <div className="rounded-lg border border-orange-100 bg-white p-3">
                    <Text as="p" size="2" weight="medium" className="mb-2">
                      {t("sell.preview")}
                    </Text>
                    {bulkImagePreviewUrls.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {bulkImagePreviewUrls.map((previewUrl, index) => (
                          <img
                            key={previewUrl}
                            src={previewUrl}
                            alt={`${t("sell.productImage")} ${index + 1}`}
                            className="h-28 w-full rounded-md border border-orange-100 object-cover"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-44 items-center justify-center rounded-md border border-dashed border-orange-200 bg-orange-50/50 text-sm text-gray-500">
                        {t("sell.previewEmpty")}
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-orange-100 bg-orange-50/60 p-4">
                    <Text as="p" size="2" weight="medium">
                      {t("sell.contactMethods")}
                    </Text>
                    <Text as="p" size="1" color="gray" className="mt-1">
                      {t("sell.contactMethodsHelp")}
                    </Text>
                    <div className="mt-4 space-y-3">
                      <input
                        className="app-input"
                        type="tel"
                        value={contactPhone}
                        onChange={(event) => setContactPhone(event.target.value)}
                        placeholder={t("sell.contactPhone")}
                      />
                      <input
                        className="app-input"
                        value={contactLineId}
                        onChange={(event) => setContactLineId(event.target.value)}
                        placeholder={t("sell.contactLine")}
                      />
                      <input
                        className="app-input"
                        value={contactWechatId}
                        onChange={(event) => setContactWechatId(event.target.value)}
                        placeholder={t("sell.contactWechat")}
                      />
                    </div>
                  </div>
                </aside>

                <section className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <Heading size="5">{t("sell.aiBulkDrafts")}</Heading>
                      <Text as="p" color="gray" size="2" className="mt-1">
                        {t("sell.aiBulkDraftsHelp")}
                      </Text>
                    </div>
                    <div className="text-sm font-semibold text-[#d73f09]">
                      {t("sell.aiBulkSelected", {
                        count: bulkDrafts.filter((draft) => draft.selected).length,
                      })}
                    </div>
                  </div>

                  {bulkError && (
                    <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                      {bulkError}
                    </p>
                  )}

                  {bulkSuccessCount > 0 && (
                    <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
                      {t("sell.aiBulkPublished", { count: bulkSuccessCount })}
                    </p>
                  )}

                  {bulkDrafts.length === 0 ? (
                    <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed border-orange-200 bg-orange-50/40 p-6 text-center text-gray-600">
                      {t("sell.aiBulkNoDrafts")}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bulkDrafts.map((draft, index) => {
                        const draftImages = draft.imageIndexes
                          .slice(0, maxProductImages)
                          .map((imageIndex) => bulkImagePreviewUrls[imageIndex])
                          .filter(Boolean);
                        const confidence = Math.round(draft.confidence * 100);

                        return (
                          <article
                            key={draft.id}
                            className="rounded-lg border border-orange-100 bg-white p-4 shadow-sm"
                          >
                            <div className="grid gap-4 md:grid-cols-[140px_1fr]">
                              <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
                                {draftImages.length > 0 ? (
                                  draftImages.map((url, imageIndex) => (
                                    <img
                                      key={url}
                                      src={url}
                                      alt={`${draft.name || t("sell.productImage")} ${imageIndex + 1}`}
                                      className="h-28 w-full rounded-md border border-orange-100 object-cover"
                                    />
                                  ))
                                ) : (
                                  <div className="flex h-28 items-center justify-center rounded-md border border-dashed border-orange-200 bg-orange-50/60 text-xs text-gray-500">
                                    {t("sell.previewEmpty")}
                                  </div>
                                )}
                              </div>

                              <div className="space-y-3">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                  <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
                                    <input
                                      type="checkbox"
                                      checked={draft.selected}
                                      disabled={draft.status === "published"}
                                      onChange={(event) =>
                                        updateBulkDraft(draft.id, {
                                          selected: event.target.checked,
                                        })
                                      }
                                    />
                                    {t("sell.aiBulkSelect")}
                                  </label>
                                  <button
                                    type="button"
                                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                                    onClick={() => deleteBulkDraft(draft.id)}
                                  >
                                    <Cross2Icon /> {t("sell.aiBulkDelete")}
                                  </button>
                                </div>

                                <input
                                  className="app-input"
                                  value={draft.name}
                                  onChange={(event) =>
                                    updateBulkDraft(draft.id, {
                                      name: event.target.value,
                                    })
                                  }
                                  placeholder={`${t("sell.itemName")} ${index + 1}`}
                                />

                                <textarea
                                  className="app-input min-h-24"
                                  value={draft.description}
                                  onChange={(event) =>
                                    updateBulkDraft(draft.id, {
                                      description: event.target.value,
                                    })
                                  }
                                  placeholder={t("sell.descriptionPlaceholder")}
                                />

                                <div className="grid gap-3 sm:grid-cols-3">
                                  <input
                                    className="app-input"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={draft.price}
                                    onChange={(event) =>
                                      updateBulkDraft(draft.id, {
                                        price: Number(event.target.value),
                                      })
                                    }
                                    aria-label={t("sell.price")}
                                  />
                                  <input
                                    className="app-input"
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={draft.quantity}
                                    onChange={(event) =>
                                      updateBulkDraft(draft.id, {
                                        quantity: Number(event.target.value),
                                      })
                                    }
                                    aria-label={t("sell.quantity")}
                                  />
                                  <select
                                    className="app-input"
                                    value={draft.category}
                                    onChange={(event) =>
                                      updateBulkDraft(draft.id, {
                                        category: event.target.value,
                                      })
                                    }
                                    aria-label={t("marketplace.category")}
                                  >
                                    {categories.map((item) => (
                                      <option key={item} value={item}>
                                        {t(`common.category.${item}` as any)}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <span className="rounded-full bg-orange-50 px-3 py-1 font-semibold text-[#d73f09]">
                                    {t("sell.aiBulkConfidence", { confidence })}
                                  </span>
                                  {draft.status === "publishing" && (
                                    <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">
                                      {t("sell.aiBulkPublishing")}
                                    </span>
                                  )}
                                  {draft.status === "published" && (
                                    <span className="rounded-full bg-green-50 px-3 py-1 font-semibold text-green-700">
                                      {t("sell.successTitle")}
                                    </span>
                                  )}
                                  {draft.status === "error" && draft.error && (
                                    <span className="rounded-full bg-red-50 px-3 py-1 font-semibold text-red-700">
                                      {draft.error}
                                    </span>
                                  )}
                                </div>

                                {draft.warnings.length > 0 && (
                                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                                    <p className="font-semibold">
                                      {t("sell.aiBulkWarnings")}
                                    </p>
                                    <ul className="mt-1 list-disc space-y-1 pl-5">
                                      {draft.warnings.map((warning) => (
                                        <li key={warning}>{warning}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}

                  <div className="sticky bottom-4 rounded-lg border border-orange-100 bg-white/95 p-4 shadow-lg backdrop-blur">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <Text as="p" size="2" className="text-gray-600">
                        {t("sell.aiBulkDraftsHelp")}
                      </Text>
                      <Button
                        type="button"
                        highContrast
                        size="3"
                        disabled={bulkPublishing || bulkDrafts.length === 0}
                        onClick={publishBulkDrafts}
                      >
                        <PlusIcon />
                        {bulkPublishing
                          ? t("sell.aiBulkPublishing")
                          : t("sell.aiBulkPublishSelected")}
                      </Button>
                    </div>
                  </div>
                </section>
              </div>
            </Card>
          )}
        </section>
      </main>
    </Theme>
  );
}
