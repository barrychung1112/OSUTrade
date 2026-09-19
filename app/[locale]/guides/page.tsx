import type { Metadata } from "next";
import Link from "next/link";
import { Theme } from "@radix-ui/themes";
import { notFound } from "next/navigation";

import Header from "@/app/components/Header";
import { SITE_URL } from "@/app/lib/productMetadata";
import { guideContent, guideIds, guidePath } from "@/app/lib/seasonalGuides";
import {
  localeInfo,
  publicLocaleFromSegment,
  publicLocales,
  type PublicLocale,
} from "@/app/lib/publicLocale";

type PageProps = {
  params: Promise<{ locale: string }>;
};

type GuideHubContent = {
  title: string;
  description: string;
  heading: string;
  intro: string;
};

const guideHubContent: Record<PublicLocale, GuideHubContent> = {
  en: {
    title: "Corvallis move-in and move-out guides | OSUTrade",
    description:
      "Practical Corvallis guides for finding useful secondhand items before move-in and passing them on before move-out.",
    heading: "Corvallis moving guides",
    intro:
      "Choose a practical checklist for settling in or listing useful items before you leave.",
  },
  "zh-tw": {
    title: "Corvallis 入住與搬離指南 | OSUTrade",
    description:
      "給 Corvallis 學生的實用入住與搬離指南：入住前尋找二手必需品，搬離前讓實用物品延續使用。",
    heading: "Corvallis 搬遷指南",
    intro: "選擇入住或搬離指南，了解如何安排實用物品的尋找、刊登與取貨。",
  },
  "zh-cn": {
    title: "Corvallis 入住与搬离指南 | OSUTrade",
    description:
      "为 Corvallis 学生准备的实用入住与搬离指南：入住前寻找二手必需品，搬离前让实用物品继续发挥价值。",
    heading: "Corvallis 搬迁指南",
    intro: "选择入住或搬离指南，了解如何安排实用物品的寻找、发布与取货。",
  },
};

function guideHubPath(locale: PublicLocale) {
  return `/${locale}/guides`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: localeSegment } = await params;
  const locale = publicLocaleFromSegment(localeSegment);
  if (!locale) return {};

  const content = guideHubContent[locale];
  const path = guideHubPath(locale);
  const languages = Object.fromEntries(
    publicLocales.map((alternateLocale) => [
      localeInfo(alternateLocale).hreflang,
      guideHubPath(alternateLocale),
    ])
  );

  return {
    metadataBase: SITE_URL,
    title: content.title,
    description: content.description,
    alternates: {
      canonical: path,
      languages: { ...languages, "x-default": guideHubPath("en") },
    },
    openGraph: {
      title: content.title,
      description: content.description,
      url: path,
      siteName: "OSUTrade",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: content.title,
      description: content.description,
    },
  };
}

export default async function LocalizedGuidesPage({ params }: PageProps) {
  const { locale: localeSegment } = await params;
  const locale = publicLocaleFromSegment(localeSegment);
  if (!locale) notFound();

  const content = guideHubContent[locale];

  return (
    <Theme appearance="light" accentColor="orange" grayColor="sand">
      <Header />
      <main className="app-page" lang={localeInfo(locale).documentLang}>
        <article className="mx-auto max-w-4xl">
          <header className="rounded-xl border border-orange-100 bg-white/90 p-6 shadow-sm md:p-10">
            <h1 className="text-3xl font-bold leading-tight text-gray-950 md:text-5xl">
              {content.heading}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-gray-700 md:text-lg">
              {content.intro}
            </p>
          </header>

          <section aria-label={content.heading} className="mt-8 grid gap-6 md:grid-cols-2">
            {guideIds.map((guide) => {
              const guideContentForLocale = guideContent[locale][guide];

              return (
                <Link
                  key={guide}
                  href={guidePath(locale, guide)}
                  className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-orange-300 hover:shadow-md"
                >
                  <h2 className="text-xl font-semibold text-gray-950">
                    {guideContentForLocale.breadcrumbs.current}
                  </h2>
                  <p className="mt-3 leading-7 text-gray-700">
                    {guideContentForLocale.summary}
                  </p>
                </Link>
              );
            })}
          </section>
        </article>
      </main>
    </Theme>
  );
}
