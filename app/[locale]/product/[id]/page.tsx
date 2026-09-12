import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Store } from "lucide-react";
import { Theme } from "@radix-ui/themes";

import Header from "@/app/components/Header";
import { buildLocalizedProductMetadata } from "@/app/lib/productMetadata";
import { shouldBypassProductImageOptimization } from "@/app/lib/productImageOptimization";
import { getPublicProduct, localizedProduct } from "@/app/lib/publicProduct";
import {
  localeInfo,
  publicLocaleFromSegment,
} from "@/app/lib/publicLocale";
import { getMarketplaceReturnPath } from "@/app/lib/marketplaceUrlState";

import ProductRequestActions from "./ProductRequestActions";

const fallbackImage = "https://placehold.co/1000x750/f9fafb/d73f09?text=OSUTrade";

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
  searchParams?: Promise<{ returnTo?: string | string[] }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: segment, id } = await params;
  const locale = publicLocaleFromSegment(segment);
  if (!locale) return {};

  const product = await getPublicProduct(id);
  return product ? buildLocalizedProductMetadata(product, locale) : {};
}

const copyByLocale = {
  en: {
    back: "Back to marketplace", details: "Item details", category: "Category",
    availability: "Availability", stock: "available", seller: "Seller",
    contact: "Contact is handled after you send a request.",
    request: "Add the item to your request cart, then send one request with notes.",
    response: "The seller can accept or decline from their seller dashboard.",
  },
  "zh-tw": {
    back: "回到市集", details: "商品資訊", category: "分類", availability: "狀態",
    stock: "件可交易", seller: "賣家", contact: "送出交易需求後才會處理聯絡方式。",
    request: "先將商品加入交易需求，再附上備註送出。", response: "賣家可在後台接受或拒絕需求。",
  },
  "zh-cn": {
    back: "回到市集", details: "商品信息", category: "分类", availability: "状态",
    stock: "件可交易", seller: "卖家", contact: "送出交易需求后才会处理联系方式。",
    request: "先将商品加入交易需求，再附上备注发送。", response: "卖家可在后台接受或拒绝需求。",
  },
} as const;

function displayPrice(price: number, locale: string) {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(price);
}

export default async function LocalizedProductPage({ params, searchParams }: PageProps) {
  const { locale: segment, id } = await params;
  const query = await searchParams;
  const locale = publicLocaleFromSegment(segment);
  if (!locale) notFound();

  const product = await getPublicProduct(id);
  if (!product) notFound();

  const item = localizedProduct(product, locale);
  const returnTo = getMarketplaceReturnPath(
    Array.isArray(query?.returnTo) ? query.returnTo[0] ?? null : query?.returnTo ?? null
  );
  const pageCopy = copyByLocale[locale];
  const images = product.imageUrls?.length
    ? product.imageUrls
    : [product.imageUrl || fallbackImage];
  const primaryImage = images[0] || fallbackImage;
  const quantity = product.quantity ?? 0;
  const category = product.category || "general";
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: item.name,
    description: item.description,
    image: images,
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: product.price,
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <Theme appearance="light" accentColor="orange" grayColor="sand">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <main className="app-page" lang={localeInfo(locale).documentLang}>
        <div className="mx-auto max-w-6xl">
          <Link href={returnTo} className="app-action-secondary mb-6 h-10">
            <ArrowLeft size={16} /> {pageCopy.back}
          </Link>

          <section className="grid gap-8 rounded-lg border border-orange-100 bg-white/90 p-4 shadow-sm md:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)] md:p-6">
            <div className="space-y-3">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-100">
                <Image
                  src={primaryImage}
                  alt={item.name}
                  fill
                  sizes="(min-width: 768px) 55vw, 100vw"
                  unoptimized={shouldBypassProductImageOptimization(primaryImage)}
                  className="object-cover"
                  priority
                />
              </div>
              {images.length > 1 ? (
                <div className="grid grid-cols-3 gap-2">
                  {images.map((image, index) => (
                    <div key={image} className="relative aspect-[4/3] overflow-hidden rounded-md bg-gray-100">
                      <Image
                        src={image}
                        alt={`${item.name} ${index + 1}`}
                        fill
                        sizes="(min-width: 768px) 180px, 33vw"
                        unoptimized={shouldBypassProductImageOptimization(image)}
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#d73f09]">
                  {category}
                </span>
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-green-700">
                  {quantity} {pageCopy.stock}
                </span>
              </div>
              <h1 className="text-3xl font-bold leading-tight text-gray-950">{item.name}</h1>
              <p className="mt-3 text-3xl font-bold text-[#d73f09]">
                {product.isClearance && product.clearancePrice === 0
                  ? locale === "en" ? "Free" : locale === "zh-tw" ? "免費" : "免费"
                  : displayPrice(product.price, locale)}
              </p>
              <p className="mt-2 text-sm font-medium text-gray-600">{quantity} {pageCopy.stock}</p>

              <div className="mt-6 rounded-lg border border-orange-100 bg-orange-50/60 p-4">
                <p className="mb-3 text-sm font-semibold text-gray-900">{pageCopy.details}</p>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-gray-500">{pageCopy.category}</dt><dd className="mt-1 font-medium text-gray-900">{category}</dd></div>
                  <div><dt className="text-gray-500">{pageCopy.availability}</dt><dd className="mt-1 font-medium text-gray-900">{quantity} {pageCopy.stock}</dd></div>
                </dl>
              </div>

              {item.description ? (
                <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
                  <p className="whitespace-pre-line text-sm leading-6 text-gray-700">{item.description}</p>
                </div>
              ) : null}

              <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center gap-3 text-gray-800">
                  <Store size={20} className="text-[#d73f09]" />
                  <div><p className="font-semibold">{pageCopy.seller}</p><p className="text-sm text-gray-600">{pageCopy.contact}</p></div>
                </div>
              </div>
              <div className="mt-6 space-y-3 text-sm text-gray-600">
                <div className="flex gap-2"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600" /><p>{pageCopy.request}</p></div>
                <div className="flex gap-2"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600" /><p>{pageCopy.response}</p></div>
              </div>
              <ProductRequestActions product={product} />
            </div>
          </section>
        </div>
      </main>
    </Theme>
  );
}
