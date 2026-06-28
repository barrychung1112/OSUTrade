import type { Product } from "./products";
import {
  pickProductDescription,
  pickProductName,
  type LocaleLike,
} from "./productTranslations";

export const crossPostPlatforms = [
  "facebook",
  "craigslist",
  "line",
  "wechat",
  "discord",
] as const;

export type CrossPostPlatform = (typeof crossPostPlatforms)[number];
export type CrossPostLanguage = "en" | "zhTw" | "zhCn";

export type CrossPostCopy = {
  platform: CrossPostPlatform;
  language: CrossPostLanguage;
  title: string;
  body: string;
};

export type CrossPostGenerationResult = {
  source: "ai" | "fallback";
  copies: CrossPostCopy[];
};

export type CrossPostListing = {
  product: Product;
  productUrl?: string;
};

export type CrossPostHeading = {
  title: string;
  introduction: string;
};

export type CrossPostHeadings = Record<CrossPostPlatform, CrossPostHeading>;

type AiPlatformDraft = {
  platform: CrossPostPlatform;
  title: string;
  introduction: string;
};

export const platformLanguage: Record<CrossPostPlatform, CrossPostLanguage> = {
  facebook: "en",
  craigslist: "en",
  line: "zhTw",
  wechat: "zhCn",
  discord: "en",
};

const platformLabels: Record<CrossPostPlatform, string> = {
  facebook: "Facebook Marketplace",
  craigslist: "Craigslist",
  line: "LINE",
  wechat: "WeChat",
  discord: "Discord",
};

const languageNames: Record<CrossPostLanguage, string> = {
  en: "English",
  zhTw: "Traditional Chinese",
  zhCn: "Simplified Chinese",
};

const categoryLabels: Record<CrossPostLanguage, Record<string, string>> = {
  en: {
    general: "general",
    electronics: "electronics",
    clothing: "clothing",
    books: "books",
    home: "home",
  },
  zhTw: {
    general: "一般",
    electronics: "電子產品",
    clothing: "服飾",
    books: "書籍",
    home: "居家",
  },
  zhCn: {
    general: "一般",
    electronics: "电子产品",
    clothing: "服饰",
    books: "书籍",
    home: "家居",
  },
};

function languageToLocale(language: CrossPostLanguage): LocaleLike {
  if (language === "zhTw") return "zh";
  if (language === "zhCn") return "zhCn";
  return "en";
}

function money(value: unknown) {
  const price = Number(value);
  if (!Number.isFinite(price)) return "$0";
  return `$${price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function localizedCategory(value: unknown, language: CrossPostLanguage) {
  const category = clean(value).toLowerCase() || "general";
  return categoryLabels[language][category] ?? category;
}

function localizedProduct(product: Product, language: CrossPostLanguage) {
  const locale = languageToLocale(language);
  return {
    name: pickProductName(product.name, product.nameTranslations, locale),
    description: pickProductDescription(
      product.description,
      product.descriptionTranslations,
      locale
    ),
  };
}

function appendOptionalLines(
  lines: string[],
  optionalLines: Array<string | null | undefined>
) {
  for (const line of optionalLines) {
    const text = clean(line);
    if (text) lines.push(text);
  }
  return lines;
}

function fallbackHeading(
  listings: CrossPostListing[],
  platform: CrossPostPlatform
): CrossPostHeading {
  const count = listings.length;

  if (platform === "line") {
    return {
      title: count === 1 ? "商品出售" : `${count} 項商品出售`,
      introduction: "以下商品目前可在 OSUTrade 上購買：",
    };
  }

  if (platform === "wechat") {
    return {
      title: count === 1 ? "商品出售" : `${count} 件商品出售`,
      introduction: "以下商品目前可在 OSUTrade 上购买：",
    };
  }

  return {
    title: count === 1 ? "Item for sale" : `${count} items for sale`,
    introduction: "These items are currently available on OSUTrade:",
  };
}

function buildItemBlock(
  listing: CrossPostListing,
  platform: CrossPostPlatform,
  index: number
) {
  const language = platformLanguage[platform];
  const localized = localizedProduct(listing.product, language);
  const price = money(listing.product.price);
  const quantity = Number(listing.product.quantity ?? 1);
  const category = localizedCategory(listing.product.category, language);
  const imageUrl = clean(
    listing.product.imageUrl || listing.product.imageUrls?.[0]
  );
  const productUrl = clean(listing.productUrl);

  if (language === "zhTw") {
    return appendOptionalLines(
      [
        `${index + 1}. ${localized.name}`,
        `價格：${price}`,
        `分類：${category}`,
        `數量：${quantity}`,
      ],
      [
        localized.description,
        imageUrl ? `照片：${imageUrl}` : null,
        productUrl ? `OSUTrade：${productUrl}` : null,
      ]
    ).join("\n");
  }

  if (language === "zhCn") {
    return appendOptionalLines(
      [
        `${index + 1}. ${localized.name}`,
        `价格：${price}`,
        `分类：${category}`,
        `数量：${quantity}`,
      ],
      [
        localized.description,
        imageUrl ? `照片：${imageUrl}` : null,
        productUrl ? `OSUTrade：${productUrl}` : null,
      ]
    ).join("\n");
  }

  const nameLine =
    platform === "discord"
      ? `${index + 1}. **${localized.name}**`
      : `${index + 1}. ${localized.name}`;

  return appendOptionalLines(
    [
      nameLine,
      `Price: ${price}`,
      `Category: ${category}`,
      `Quantity: ${quantity}`,
    ],
    [
      localized.description,
      imageUrl ? `Photo: ${imageUrl}` : null,
      productUrl ? `OSUTrade: ${productUrl}` : null,
    ]
  ).join("\n");
}

function assembleCopy(
  listings: CrossPostListing[],
  platform: CrossPostPlatform,
  heading: CrossPostHeading
): CrossPostCopy {
  const introduction = clean(heading.introduction);
  const itemBlocks = listings.map((listing, index) =>
    buildItemBlock(listing, platform, index)
  );

  return {
    platform,
    language: platformLanguage[platform],
    title: clean(heading.title),
    body: [introduction, ...itemBlocks].filter(Boolean).join("\n\n"),
  };
}

export function assembleCrossPostCopies(
  listings: CrossPostListing[],
  headings: CrossPostHeadings
): CrossPostCopy[] {
  return crossPostPlatforms.map((platform) =>
    assembleCopy(listings, platform, headings[platform])
  );
}

export function buildFallbackCrossPostCopies(
  listings: CrossPostListing[]
): CrossPostCopy[] {
  const headings = Object.fromEntries(
    crossPostPlatforms.map((platform) => [
      platform,
      fallbackHeading(listings, platform),
    ])
  ) as CrossPostHeadings;

  return assembleCrossPostCopies(listings, headings);
}

function extractResponseText(payload: any) {
  if (typeof payload?.output_text === "string") {
    return payload.output_text;
  }

  const output = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (typeof part?.text === "string") {
        return part.text;
      }
    }
  }

  return null;
}

function parseJsonBlock(text: string) {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  return JSON.parse(trimmed);
}

function listingFacts(listing: CrossPostListing) {
  const { product, productUrl } = listing;
  return {
    id: product.id,
    price: product.price,
    category: product.category ?? "general",
    quantity: product.quantity ?? 1,
    imageUrls: product.imageUrls?.length
      ? product.imageUrls
      : [product.imageUrl].filter(Boolean),
    productUrl,
    localizedText: {
      en: localizedProduct(product, "en"),
      zhTw: localizedProduct(product, "zhTw"),
      zhCn: localizedProduct(product, "zhCn"),
    },
  };
}

function normalizeAiDrafts(parsed: any): Map<CrossPostPlatform, AiPlatformDraft> | null {
  const drafts = Array.isArray(parsed?.copies) ? parsed.copies : [];
  if (drafts.length !== crossPostPlatforms.length) return null;

  const byPlatform = new Map<CrossPostPlatform, AiPlatformDraft>();
  for (const draft of drafts) {
    if (!crossPostPlatforms.includes(draft?.platform)) return null;

    const platform = draft.platform as CrossPostPlatform;
    const title = clean(draft?.title);
    const introduction = clean(draft?.introduction);
    if (!title || !introduction || byPlatform.has(platform)) return null;

    byPlatform.set(platform, { platform, title, introduction });
  }

  return byPlatform.size === crossPostPlatforms.length ? byPlatform : null;
}

export async function generateCrossPostCopies(
  listings: CrossPostListing[]
): Promise<CrossPostGenerationResult> {
  const fallback = buildFallbackCrossPostCopies(listings);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { source: "fallback", copies: fallback };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_CROSS_POST_MODEL || "gpt-4.1-mini",
        max_output_tokens: 1_600,
        input: [
          {
            role: "system",
            content:
              "Use only the provided facts. Write a short title and introduction for each marketplace platform in its required language. Do not repeat item details, links, contact information, condition, warranty, delivery, discounts, pickup details, accessories, or brand/model facts in the introduction. Item details and links are appended by the application.",
          },
          {
            role: "user",
            content: JSON.stringify({
              platformRequirements: crossPostPlatforms.map((platform) => ({
                platform,
                label: platformLabels[platform],
                language: platformLanguage[platform],
                languageName: languageNames[platformLanguage[platform]],
              })),
              listings: listings.map(listingFacts),
            }),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "cross_post_copies",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                copies: {
                  type: "array",
                  minItems: crossPostPlatforms.length,
                  maxItems: crossPostPlatforms.length,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      platform: {
                        type: "string",
                        enum: [...crossPostPlatforms],
                      },
                      title: { type: "string" },
                      introduction: { type: "string" },
                    },
                    required: ["platform", "title", "introduction"],
                  },
                },
              },
              required: ["copies"],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      return { source: "fallback", copies: fallback };
    }

    const payload = await response.json();
    const responseText = extractResponseText(payload);
    if (!responseText) {
      return { source: "fallback", copies: fallback };
    }

    const aiDrafts = normalizeAiDrafts(parseJsonBlock(responseText));
    if (!aiDrafts) {
      return { source: "fallback", copies: fallback };
    }

    return {
      source: "ai",
      copies: assembleCrossPostCopies(
        listings,
        Object.fromEntries(
          crossPostPlatforms.map((platform) => {
            const draft = aiDrafts.get(platform)!;
            return [
              platform,
              { title: draft.title, introduction: draft.introduction },
            ];
          })
        ) as CrossPostHeadings
      ),
    };
  } catch {
    return { source: "fallback", copies: fallback };
  }
}
