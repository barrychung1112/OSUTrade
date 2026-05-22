"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Heading, Text, Theme } from "@radix-ui/themes";
import Header from "../components/Header";
import type { Product } from "../lib/products";
import { useI18n } from "../i18n";

const categories = ["general", "electronics", "clothing", "books", "home"];

export default function SellPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("general");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    let nextImageUrl = imageUrl.trim();

    if (imageFile) {
      const uploadForm = new FormData();
      uploadForm.append("image", imageFile);

      const uploadRes = await fetch("/api/products/images", {
        method: "POST",
        body: uploadForm,
      });

      if (!uploadRes.ok) {
        const payload = await uploadRes.json().catch(() => null);
        setLoading(false);
        setError(payload?.message || t("sell.uploadError"));
        return;
      }

      const uploadPayload = await uploadRes.json();
      nextImageUrl = uploadPayload.imageUrl;
    }

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        price: Number(price),
        category,
        imageUrl: nextImageUrl,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      setError(payload?.message || t("sell.listError"));
      return;
    }

    const product = (await res.json()) as Product;
    router.push(`/product/${product.id}`);
  }

  return (
    <Theme appearance="light" accentColor="orange" grayColor="sand">
      <main className="min-h-screen bg-gradient-to-br from-white via-[#fff1f1] to-[#ffe6e6] px-4 py-20">
        <Header />
        <section className="mx-auto max-w-2xl">
          <Heading size="8" className="mb-8 text-center text-[#333]">
            {t("sell.title")}
          </Heading>

          <Card className="border border-orange-200 bg-white/75 p-6 shadow">
            <form className="space-y-5" onSubmit={onSubmit}>
              <label className="block">
                <Text as="span" size="2" weight="medium">
                  {t("sell.itemName")}
                </Text>
                <input
                  className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>

              <label className="block">
                <Text as="span" size="2" weight="medium">
                  {t("sell.price")}
                </Text>
                <input
                  className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
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
                  {t("marketplace.category")}
                </Text>
                <select
                  className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
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

              <label className="block">
                <Text as="span" size="2" weight="medium">
                  {t("sell.productImage")}
                </Text>
                <input
                  className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
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
                  className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  type="url"
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  disabled={!!imageFile}
                  placeholder="https://..."
                />
              </label>

              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <Button highContrast type="submit" disabled={loading}>
                {loading ? t("sell.listing") : t("sell.submit")}
              </Button>
            </form>
          </Card>
        </section>
      </main>
    </Theme>
  );
}
