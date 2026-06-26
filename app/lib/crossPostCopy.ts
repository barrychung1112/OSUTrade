import type { Product, SellerContact } from "./products";
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

type CrossPostOptions = {
  includeContactInfo?: boolean;
  productUrl?: string;
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

function contactLines(contact: SellerContact | null | undefined, language: CrossPostLanguage) {
  if (!contact) return [];

  if (language === "zhCn") {
    return [
      contact.phone ? `电话: ${contact.phone}` : null,
      contact.lineId ? `LINE: ${contact.lineId}` : null,
      contact.wechatId ? `微信: ${contact.wechatId}` : null,
    ].filter(Boolean) as string[];
  }

  if (language === "zhTw") {
    return [
      contact.phone ? `電話: ${contact.phone}` : null,
      contact.lineId ? `LINE: ${contact.lineId}` : null,
      contact.wechatId ? `微信: ${contact.wechatId}` : null,
    ].filter(Boolean) as string[];
  }

  return [
    contact.phone ? `Phone: ${contact.phone}` : null,
    contact.lineId ? `LINE: ${contact.lineId}` : null,
    contact.wechatId ? `WeChat: ${contact.wechatId}` : null,
  ].filter(Boolean) as string[];
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

function appendOptionalLines(lines: string[], optionalLines: Array<string | null | undefined>) {
  for (const line of optionalLines) {
    const text = clean(line);
    if (text) lines.push(text);
  }
  return lines;
}

function buildFallbackCopy(
  product: Product,
  platform: CrossPostPlatform,
  options: CrossPostOptions
): CrossPostCopy {
  const language = platformLanguage[platform];
  const localized = localizedProduct(product, language);
  const price = money(product.price);
  const quantity = Number(product.quantity ?? 1);
  const category = localizedCategory(product.category, language);
  const imageUrl = clean(product.imageUrl || product.imageUrls?.[0]);
  const contact = options.includeContactInfo
    ? contactLines(product.sellerContact, language)
    : [];

  if (language === "zhTw") {
    const lines = appendOptionalLines(
      [
        `出售：${localized.name}`,
        `價格：${price}`,
        `分類：${category}`,
        `數量：${quantity}`,
      ],
      [localized.description, imageUrl ? `照片：${imageUrl}` : null, options.productUrl]
    );
    lines.push(...contact);
    return {
      platform,
      language,
      title: localized.name,
      body: lines.join("\n"),
    };
  }

  if (language === "zhCn") {
    const lines = appendOptionalLines(
      [
        `出售：${localized.name}`,
        `价格：${price}`,
        `分类：${category}`,
        `数量：${quantity}`,
      ],
      [localized.description, imageUrl ? `照片：${imageUrl}` : null, options.productUrl]
    );
    lines.push(...contact);
    return {
      platform,
      language,
      title: localized.name,
      body: lines.join("\n"),
    };
  }

  if (platform === "discord") {
    const lines = appendOptionalLines(
      [
        `**Selling: ${localized.name}**`,
        `Price: ${price}`,
        `Category: ${category}`,
        `Quantity: ${quantity}`,
      ],
      [
        localized.description,
        imageUrl ? `Photo: ${imageUrl}` : null,
        options.productUrl ? `OSUTrade: ${options.productUrl}` : null,
      ]
    );
    lines.push(...contact);
    return {
      platform,
      language,
      title: localized.name,
      body: lines.join("\n"),
    };
  }

  if (platform === "craigslist") {
    const lines = appendOptionalLines(
      [
        `Item: ${localized.name}`,
        `Price: ${price}`,
        `Category: ${category}`,
        `Quantity: ${quantity}`,
      ],
      [
        localized.description,
        imageUrl ? `Photo: ${imageUrl}` : null,
        options.productUrl ? `OSUTrade listing: ${options.productUrl}` : null,
      ]
    );
    lines.push(...contact);
    return {
      platform,
      language,
      title: `${localized.name} - ${price}`,
      body: lines.join("\n"),
    };
  }

  const lines = appendOptionalLines(
    [
      `Selling ${localized.name} for ${price}.`,
      `Category: ${category}`,
      `Quantity available: ${quantity}`,
    ],
    [
      localized.description,
      imageUrl ? `Photo: ${imageUrl}` : null,
      options.productUrl ? `OSUTrade listing: ${options.productUrl}` : null,
    ]
  );
  lines.push(...contact);
  return {
    platform,
    language,
    title: localized.name,
    body: lines.join("\n"),
  };
}

export function buildFallbackCrossPostCopies(
  product: Product,
  options: CrossPostOptions = {}
): CrossPostCopy[] {
  return crossPostPlatforms.map((platform) =>
    buildFallbackCopy(product, platform, options)
  );
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

function productFacts(product: Product, options: CrossPostOptions) {
  return {
    id: product.id,
    price: product.price,
    category: product.category ?? "general",
    quantity: product.quantity ?? 1,
    imageUrls: product.imageUrls?.length
      ? product.imageUrls
      : [product.imageUrl].filter(Boolean),
    productUrl: options.productUrl ?? null,
    includeContactInfo: options.includeContactInfo === true,
    contact: options.includeContactInfo === true ? product.sellerContact ?? null : null,
    localizedText: {
      en: localizedProduct(product, "en"),
      zhTw: localizedProduct(product, "zhTw"),
      zhCn: localizedProduct(product, "zhCn"),
    },
  };
}

function normalizeAiCopies(parsed: any, fallback: CrossPostCopy[]) {
  const byPlatform = new Map<CrossPostPlatform, any>();
  const copies = Array.isArray(parsed?.copies) ? parsed.copies : [];

  for (const copy of copies) {
    if (crossPostPlatforms.includes(copy?.platform)) {
      byPlatform.set(copy.platform, copy);
    }
  }

  return fallback.map((fallbackCopy) => {
    const aiCopy = byPlatform.get(fallbackCopy.platform);
    const title = clean(aiCopy?.title);
    const body = clean(aiCopy?.body);

    if (!title || !body) return fallbackCopy;

    return {
      platform: fallbackCopy.platform,
      language: fallbackCopy.language,
      title,
      body,
    };
  });
}

export async function generateCrossPostCopies(
  product: Product,
  options: CrossPostOptions = {}
): Promise<CrossPostGenerationResult> {
  const fallback = buildFallbackCrossPostCopies(product, options);
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
              "Use only the provided facts to write marketplace cross-post copy. Do not invent condition, warranty, delivery, discount, pickup details, accessories, or brand/model facts. Preserve brand and model names. Generate each platform in its required language. Include contact info only when includeContactInfo is true.",
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
              product: productFacts(product, options),
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
                      body: { type: "string" },
                    },
                    required: ["platform", "title", "body"],
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

    return {
      source: "ai",
      copies: normalizeAiCopies(parseJsonBlock(responseText), fallback),
    };
  } catch {
    return { source: "fallback", copies: fallback };
  }
}
