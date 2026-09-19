import type { Metadata } from "next";

import { SITE_URL } from "./productMetadata";
import {
  guidePath,
  localeInfo,
  publicLocaleFromSegment,
  publicLocales,
  type PublicLocale,
} from "./publicLocale";
export {
  homeGuideForSeason,
  homeSeasonalCopy,
} from "./homeSeasonalCopy";
export type { HomepageSeasonalContent } from "./homeSeasonalCopy";
export { guidePath } from "./publicLocale";

export const guideIds = ["move-in", "move-out"] as const;

export type GuideId = (typeof guideIds)[number];
type GuideCategory = "home" | "books" | "electronics" | "general";

export type GuideCategoryLink = {
  category: GuideCategory;
  href: `/overview?category=${GuideCategory}`;
  label: string;
};

export type GuideSection = {
  title: string;
  bullets: readonly string[];
};

export type GuideContent = {
  title: string;
  description: string;
  eyebrow: string;
  summary: string;
  sections: readonly [GuideSection, GuideSection, GuideSection];
  categoryLinks: readonly GuideCategoryLink[];
  marketplaceNote: string;
  requestCtaLabel: string;
  sellCtaLabel: string;
  counterpartGuide: { guide: GuideId; label: string };
  breadcrumbs: { home: string; guides: string; current: string };
};

const categoryHrefs = {
  home: "/overview?category=home",
  books: "/overview?category=books",
  electronics: "/overview?category=electronics",
  general: "/overview?category=general",
} as const;

function categoryLink(category: GuideCategory, label: string): GuideCategoryLink {
  return { category, href: categoryHrefs[category], label };
}

export function isGuideId(value: string): value is GuideId {
  return guideIds.includes(value as GuideId);
}

export const guidePaths = publicLocales.flatMap((locale) =>
  guideIds.map((guide) => guidePath(locale, guide))
);

export const guideContent: Record<PublicLocale, Record<GuideId, GuideContent>> = {
  en: {
    "move-in": {
      title: "Move-in guide for Corvallis and Oregon State students | OSUTrade",
      description:
        "A practical move-in checklist for Corvallis and Oregon State students: find local essentials, arrange pickup, and send clear trade requests.",
      eyebrow: "Corvallis move-in guide",
      summary:
        "Set up your first week in Corvallis with useful secondhand finds from Oregon State students, then arrange a pickup that works for both people.",
      sections: [
        {
          title: "Start with the essentials",
          bullets: [
            "Check what your residence hall already provides before buying furniture.",
            "Prioritize bedding, towels, laundry supplies, hangers, and a desk light.",
            "Renting off campus? Measure your room and kitchen before looking for larger items.",
          ],
        },
        {
          title: "Browse with a plan",
          bullets: [
            "Save a short list of needed items and compare condition, price, and pickup area.",
            "Look for books, small electronics, and home basics that can be picked up locally.",
            "Ask the seller a clear question if a listing is missing a size, accessory, or condition detail.",
          ],
        },
        {
          title: "Request and pick up thoughtfully",
          bullets: [
            "Send a trade request only when you are ready to coordinate a realistic pickup time.",
            "Confirm the item, price, condition, and meeting place directly with the seller after acceptance.",
            "Follow residence-hall and apartment rules for appliances, power strips, and shared spaces.",
          ],
        },
      ],
      categoryLinks: [
        categoryLink("home", "Home essentials"),
        categoryLink("books", "Books and study supplies"),
        categoryLink("electronics", "Electronics"),
      ],
      marketplaceNote:
        "OSUTrade is an independent marketplace for local listings. It does not process payments and cannot guarantee any transaction.",
      requestCtaLabel: "Request an item",
      sellCtaLabel: "List an item",
      counterpartGuide: { guide: "move-out", label: "Read the move-out guide" },
      breadcrumbs: { home: "Home", guides: "Guides", current: "Move-in" },
    },
    "move-out": {
      title: "Move-out guide for Corvallis and Oregon State students | OSUTrade",
      description:
        "A practical move-out guide for Corvallis and Oregon State students: sort useful items, list early, and coordinate local pickup.",
      eyebrow: "Corvallis move-out guide",
      summary:
        "Help useful belongings find their next home before you leave Corvallis, while giving Oregon State students time to request and collect them.",
      sections: [
        {
          title: "Sort before finals week",
          bullets: [
            "Separate items you will keep, donate, recycle, or list while you still have time.",
            "Group small home goods, books, and accessories so each listing is easy to understand.",
            "Set aside damaged or unsafe items instead of offering them as usable.",
          ],
        },
        {
          title: "Make listings clear",
          bullets: [
            "Use current photos and state the condition, included parts, and any wear honestly.",
            "List a realistic price and explain when local pickup can happen.",
            "Post sought-after basics early so other students can plan their move-in.",
          ],
        },
        {
          title: "Close out responsibly",
          bullets: [
            "Review trade requests and accept only when you can follow through on the pickup.",
            "Confirm the final item details and meeting plan directly with the other person.",
            "Remove or update a listing when it is no longer available.",
          ],
        },
      ],
      categoryLinks: [
        categoryLink("home", "Home goods"),
        categoryLink("books", "Books"),
        categoryLink("general", "Other useful items"),
      ],
      marketplaceNote:
        "OSUTrade is an independent marketplace for local listings. It does not process payments and cannot guarantee any transaction.",
      requestCtaLabel: "Browse items",
      sellCtaLabel: "Create a listing",
      counterpartGuide: { guide: "move-in", label: "Read the move-in guide" },
      breadcrumbs: { home: "Home", guides: "Guides", current: "Move-out" },
    },
  },
  "zh-tw": {
    "move-in": {
      title: "Corvallis 與 Oregon State 學生入住指南 | OSUTrade",
      description:
        "給 Corvallis 與 Oregon State 學生的實用入住清單：尋找在地必需品、安排取貨，並清楚送出交易請求。",
      eyebrow: "Corvallis 入住指南",
      summary:
        "透過 Oregon State 學生提供的實用二手物品，準備在 Corvallis 的第一週，並安排雙方都方便的取貨時間。",
      sections: [
        {
          title: "先準備必需品",
          bullets: [
            "購買家具前，先確認宿舍已提供哪些設備。",
            "優先準備寢具、毛巾、洗衣用品、衣架與檯燈。",
            "若在校外租屋，找大型物品前先量好房間與廚房空間。",
          ],
        },
        {
          title: "有計畫地瀏覽",
          bullets: [
            "列出需要的物品，並比較狀況、價格與取貨地點。",
            "尋找可在當地取貨的書籍、小型電子產品與居家用品。",
            "若商品缺少尺寸、配件或狀況資訊，請清楚詢問賣家。",
          ],
        },
        {
          title: "妥善提出請求與取貨",
          bullets: [
            "確認能安排合理取貨時間後，再送出交易請求。",
            "請求被接受後，直接和賣家確認商品、價格、狀況與見面地點。",
            "使用電器、延長線與共用空間時，請遵守宿舍和公寓規定。",
          ],
        },
      ],
      categoryLinks: [
        categoryLink("home", "居家必需品"),
        categoryLink("books", "書籍與學習用品"),
        categoryLink("electronics", "電子產品"),
      ],
      marketplaceNote:
        "OSUTrade 是獨立的在地刊登平台，不處理付款，也無法保證任何交易。",
      requestCtaLabel: "請求商品",
      sellCtaLabel: "刊登商品",
      counterpartGuide: { guide: "move-out", label: "閱讀搬離指南" },
      breadcrumbs: { home: "首頁", guides: "指南", current: "入住" },
    },
    "move-out": {
      title: "Corvallis 與 Oregon State 學生搬離指南 | OSUTrade",
      description:
        "給 Corvallis 與 Oregon State 學生的實用搬離指南：整理可用物品、及早刊登，並協調在地取貨。",
      eyebrow: "Corvallis 搬離指南",
      summary:
        "在離開 Corvallis 前，讓實用物品找到下一位主人，也讓 Oregon State 學生有時間提出請求並取貨。",
      sections: [
        {
          title: "期末週前先分類",
          bullets: [
            "趁還有時間，分出要保留、捐贈、回收或刊登的物品。",
            "將小型居家用品、書籍與配件分組，讓每則刊登內容清楚易懂。",
            "損壞或不安全的物品不應當作可用商品提供。",
          ],
        },
        {
          title: "清楚刊登商品",
          bullets: [
            "使用近期照片，誠實說明狀況、包含的配件與使用痕跡。",
            "設定合理價格，並說明可以在何時當地取貨。",
            "及早刊登熱門必需品，讓其他學生能安排入住。",
          ],
        },
        {
          title: "負責任地完成整理",
          bullets: [
            "查看交易請求，只在能配合取貨時接受。",
            "直接與對方確認最終商品細節與見面安排。",
            "商品不再可取時，請移除或更新刊登。",
          ],
        },
      ],
      categoryLinks: [
        categoryLink("home", "居家用品"),
        categoryLink("books", "書籍"),
        categoryLink("general", "其他實用物品"),
      ],
      marketplaceNote:
        "OSUTrade 是獨立的在地刊登平台，不處理付款，也無法保證任何交易。",
      requestCtaLabel: "瀏覽商品",
      sellCtaLabel: "建立刊登",
      counterpartGuide: { guide: "move-in", label: "閱讀入住指南" },
      breadcrumbs: { home: "首頁", guides: "指南", current: "搬離" },
    },
  },
  "zh-cn": {
    "move-in": {
      title: "Corvallis 与 Oregon State 学生入住指南 | OSUTrade",
      description:
        "为 Corvallis 与 Oregon State 学生准备的实用入住清单：寻找本地必需品、安排取货，并清楚发送交易请求。",
      eyebrow: "Corvallis 入住指南",
      summary:
        "通过 Oregon State 学生提供的实用二手物品，准备在 Corvallis 的第一周，并安排双方都方便的取货时间。",
      sections: [
        {
          title: "先准备必需品",
          bullets: [
            "购买家具前，先确认宿舍已经提供哪些设备。",
            "优先准备寝具、毛巾、洗衣用品、衣架和台灯。",
            "如果在校外租房，找大型物品前先量好房间和厨房空间。",
          ],
        },
        {
          title: "有计划地浏览",
          bullets: [
            "列出需要的物品，并比较状况、价格和取货地点。",
            "寻找可在当地取货的书籍、小型电子产品和家居用品。",
            "如果商品缺少尺寸、配件或状况信息，请清楚询问卖家。",
          ],
        },
        {
          title: "妥善发送请求与取货",
          bullets: [
            "确认能安排合理取货时间后，再发送交易请求。",
            "请求被接受后，直接和卖家确认商品、价格、状况和见面地点。",
            "使用电器、插线板和共用空间时，请遵守宿舍和公寓规定。",
          ],
        },
      ],
      categoryLinks: [
        categoryLink("home", "家居必需品"),
        categoryLink("books", "书籍和学习用品"),
        categoryLink("electronics", "电子产品"),
      ],
      marketplaceNote:
        "OSUTrade 是独立的本地刊登平台，不处理付款，也无法保证任何交易。",
      requestCtaLabel: "请求商品",
      sellCtaLabel: "发布商品",
      counterpartGuide: { guide: "move-out", label: "阅读搬离指南" },
      breadcrumbs: { home: "首页", guides: "指南", current: "入住" },
    },
    "move-out": {
      title: "Corvallis 与 Oregon State 学生搬离指南 | OSUTrade",
      description:
        "为 Corvallis 与 Oregon State 学生准备的实用搬离指南：整理可用物品、尽早发布，并协调本地取货。",
      eyebrow: "Corvallis 搬离指南",
      summary:
        "在离开 Corvallis 前，让实用物品找到下一位主人，也让 Oregon State 学生有时间发送请求并取货。",
      sections: [
        {
          title: "期末周前先分类",
          bullets: [
            "趁还有时间，分出要保留、捐赠、回收或发布的物品。",
            "将小型家居用品、书籍和配件分组，让每条发布内容清楚易懂。",
            "损坏或不安全的物品不应作为可用商品提供。",
          ],
        },
        {
          title: "清楚发布商品",
          bullets: [
            "使用近期照片，如实说明状况、包含的配件和使用痕迹。",
            "设定合理价格，并说明何时可以在本地取货。",
            "尽早发布热门必需品，让其他学生能安排入住。",
          ],
        },
        {
          title: "负责任地完成整理",
          bullets: [
            "查看交易请求，只在能配合取货时接受。",
            "直接与对方确认最终商品细节和见面安排。",
            "商品不再可取时，请移除或更新发布内容。",
          ],
        },
      ],
      categoryLinks: [
        categoryLink("home", "家居用品"),
        categoryLink("books", "书籍"),
        categoryLink("general", "其他实用物品"),
      ],
      marketplaceNote:
        "OSUTrade 是独立的本地刊登平台，不处理付款，也无法保证任何交易。",
      requestCtaLabel: "浏览商品",
      sellCtaLabel: "创建发布",
      counterpartGuide: { guide: "move-in", label: "阅读入住指南" },
      breadcrumbs: { home: "首页", guides: "指南", current: "搬离" },
    },
  },
};

export function getGuideContent(localeSegment: string, guideSegment: string) {
  const locale = publicLocaleFromSegment(localeSegment);
  if (!locale || !isGuideId(guideSegment)) return null;
  return guideContent[locale][guideSegment];
}

export function buildGuideMetadata(
  locale: PublicLocale,
  guide: GuideId
): Metadata {
  const content = guideContent[locale][guide];
  const path = guidePath(locale, guide);
  const languages = Object.fromEntries(
    publicLocales.map((alternateLocale) => [
      localeInfo(alternateLocale).hreflang,
      guidePath(alternateLocale, guide),
    ])
  );

  return {
    metadataBase: SITE_URL,
    title: content.title,
    description: content.description,
    alternates: {
      canonical: path,
      languages: { ...languages, "x-default": guidePath("en", guide) },
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
