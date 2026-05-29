"use client";

import { FormEvent, type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Heading, Text, Theme } from "@radix-ui/themes";
import { CheckIcon, PlusIcon } from "@radix-ui/react-icons";
import Header from "../components/Header";
import type { Product } from "../lib/products";
import { useI18n } from "../i18n";

const categories = ["general", "electronics", "clothing", "books", "home"];

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
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [category, setCategory] = useState("general");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactLineId, setContactLineId] = useState("");
  const [contactWechatId, setContactWechatId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successProduct, setSuccessProduct] = useState<Product | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [pricingAdvice, setPricingAdvice] = useState<PricingAdvice | null>(null);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  useEffect(() => {
    if (!successProduct) return;

    const timer = window.setTimeout(() => {
      router.push(`/product/${successProduct.id}`);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [router, successProduct]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessProduct(null);

    let nextImageUrl = imageUrl.trim();

    try {
      if (imageFile) {
        const uploadForm = new FormData();
        uploadForm.append("image", imageFile);

        const uploadRes = await fetch("/api/products/images", {
          method: "POST",
          body: uploadForm,
        });

        if (!uploadRes.ok) {
          const payload = await uploadRes.json().catch(() => null);
          throw new Error(payload?.message || t("sell.uploadError"));
        }

        const uploadPayload = await uploadRes.json();
        nextImageUrl = uploadPayload.imageUrl;
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
          imageUrl: nextImageUrl,
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
      setImageFile(null);
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

  return (
    <Theme appearance="light" accentColor="orange" grayColor="sand">
      <main className="app-page">
        <Header />
        <section className="mx-auto max-w-5xl">
          <div className="app-hero text-center md:text-left">
            <p className="app-eyebrow">{t("nav.sell")}</p>
            <Heading size="8" className="app-title">
              {t("sell.title")}
            </Heading>
          </div>

          {successProduct && (
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
                    <label className="block">
                      <Text as="span" size="2" weight="medium">
                        {t("sell.productImage")}
                      </Text>
                      <input
                        className="app-input mt-2"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) =>
                          setImageFile(event.target.files?.[0] ?? null)
                        }
                      />
                      <Text as="p" size="1" color="gray" className="mt-1">
                        {t("sell.imageHelp")}
                      </Text>
                    </label>

                    <label className="block">
                      <Text as="span" size="2" weight="medium">
                        {t("sell.imageUrlFallback")}
                      </Text>
                      <input
                        className="app-input mt-2"
                        type="url"
                        value={imageUrl}
                        onChange={(event) => setImageUrl(event.target.value)}
                        disabled={!!imageFile}
                        placeholder="https://..."
                      />
                    </label>
                  </div>

                  <div className="rounded-lg border border-orange-100 bg-orange-50/60 p-3">
                    <Text as="p" size="2" weight="medium" className="mb-2">
                      {t("sell.preview")}
                    </Text>
                    {imagePreviewUrl || imageUrl.trim() ? (
                      <img
                        src={imagePreviewUrl || imageUrl.trim()}
                        alt={name || t("sell.productImage")}
                        className="h-44 w-full rounded-md object-cover"
                      />
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
        </section>
      </main>
    </Theme>
  );
}
