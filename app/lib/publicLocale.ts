export const publicLocales = ["en", "zh-tw", "zh-cn"] as const;

export type PublicLocale = (typeof publicLocales)[number];
export type ClientLocale = "en" | "zh" | "zhCn";

const localeDetails = {
  en: { documentLang: "en", hreflang: "en", clientLocale: "en" },
  "zh-tw": {
    documentLang: "zh-Hant",
    hreflang: "zh-TW",
    clientLocale: "zh",
  },
  "zh-cn": {
    documentLang: "zh-Hans",
    hreflang: "zh-CN",
    clientLocale: "zhCn",
  },
} as const;

export function publicLocaleFromSegment(value: string): PublicLocale | null {
  return publicLocales.includes(value as PublicLocale)
    ? (value as PublicLocale)
    : null;
}

export function publicLocaleFromClientLocale(locale: ClientLocale): PublicLocale {
  if (locale === "zh") return "zh-tw";
  if (locale === "zhCn") return "zh-cn";
  return "en";
}

export function localeInfo(locale: PublicLocale) {
  return localeDetails[locale];
}

export function productPath(locale: PublicLocale, id: string | number) {
  return `/${locale}/product/${encodeURIComponent(String(id))}`;
}
