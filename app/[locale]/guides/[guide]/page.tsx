import type { Metadata } from "next";
import Link from "next/link";
import { Theme } from "@radix-ui/themes";

import Header from "@/app/components/Header";
import { SITE_URL } from "@/app/lib/productMetadata";
import {
  buildGuideMetadata,
  getGuideContent,
  guidePath,
  isGuideId,
} from "@/app/lib/seasonalGuides";
import { localeInfo, publicLocaleFromSegment } from "@/app/lib/publicLocale";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ locale: string; guide: string }>;
};

function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: localeSegment, guide: guideSegment } = await params;
  const locale = publicLocaleFromSegment(localeSegment);
  if (!locale || !isGuideId(guideSegment)) return {};

  return buildGuideMetadata(locale, guideSegment);
}

export default async function LocalizedGuidePage({ params }: PageProps) {
  const { locale: localeSegment, guide: guideSegment } = await params;
  const locale = publicLocaleFromSegment(localeSegment);
  if (!locale || !isGuideId(guideSegment)) notFound();

  const content = getGuideContent(localeSegment, guideSegment);
  if (!content) notFound();

  const homePath = `/${locale}`;
  const guidesPath = `/${locale}/guides`;
  const currentPath = guidePath(locale, guideSegment);
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: content.breadcrumbs.home,
        item: absoluteUrl(homePath),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: content.breadcrumbs.guides,
        item: absoluteUrl(guidesPath),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: content.breadcrumbs.current,
        item: absoluteUrl(currentPath),
      },
    ],
  };

  return (
    <Theme appearance="light" accentColor="orange" grayColor="sand">
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <main className="app-page" lang={localeInfo(locale).documentLang}>
        <article className="mx-auto max-w-4xl">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-600">
            <ol className="flex flex-wrap items-center gap-2">
              <li><Link href={homePath} className="hover:text-[#d73f09]">{content.breadcrumbs.home}</Link></li>
              <li aria-hidden="true">/</li>
              <li>{content.breadcrumbs.guides}</li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="font-medium text-gray-900">{content.breadcrumbs.current}</li>
            </ol>
          </nav>

          <header className="rounded-xl border border-orange-100 bg-white/90 p-6 shadow-sm md:p-10">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#d73f09]">{content.eyebrow}</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-gray-950 md:text-5xl">{content.title}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-gray-700 md:text-lg">{content.summary}</p>
          </header>

          <div className="mt-8 space-y-6">
            {content.sections.map((section) => (
              <section key={section.title} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-950">{section.title}</h2>
                <ul className="mt-4 list-disc space-y-2 pl-5 leading-7 text-gray-700">
                  {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                </ul>
              </section>
            ))}
          </div>

          <section aria-labelledby="guide-browse-heading" className="mt-8 rounded-xl border border-orange-100 bg-orange-50/60 p-6">
            <h2 id="guide-browse-heading" className="text-xl font-semibold text-gray-950">{content.requestCtaLabel}</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/overview" className="app-action-secondary">{content.requestCtaLabel}</Link>
              {content.categoryLinks.map(({ href, label }) => (
                <Link key={href} href={href} className="app-action-secondary">{label}</Link>
              ))}
            </div>
          </section>

          <aside className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm" aria-label={content.marketplaceNote}>
            <p className="text-sm leading-6 text-gray-600">{content.marketplaceNote}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/sell" className="app-action-primary">{content.sellCtaLabel}</Link>
              <Link href={guidePath(locale, content.counterpartGuide.guide)} className="app-action-secondary">{content.counterpartGuide.label}</Link>
            </div>
          </aside>
        </article>
      </main>
    </Theme>
  );
}
