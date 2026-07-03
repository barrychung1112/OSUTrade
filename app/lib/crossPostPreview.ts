import type { Product } from "./products";
import {
  assembleCrossPostCopies,
  crossPostPlatforms,
  type CrossPostGenerationResult,
  type CrossPostHeadings,
  type CrossPostPlatform,
} from "./crossPostCopy";

export const maxCrossPostPreviewItems = 10;

export class CrossPostTranslationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CrossPostTranslationError";
  }
}

export type CrossPostFlowStage =
  | "idle"
  | "generating"
  | "reviewing"
  | "publishing"
  | "finalized";

export type CrossPostPreviewItem = {
  clientId: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  category: string;
};

export type PreviewItemParseResult =
  | { ok: true; items: CrossPostPreviewItem[] }
  | { ok: false; message: string };

type AiLocalizedItem = {
  clientId: string;
  enName: string;
  enDescription: string;
  zhTwName: string;
  zhTwDescription: string;
  zhCnName: string;
  zhCnDescription: string;
};

type AiHeading = {
  platform: CrossPostPlatform;
  title: string;
  introduction: string;
};

const categories = new Set([
  "general",
  "electronics",
  "clothing",
  "books",
  "home",
]);

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export function parseCrossPostPreviewItems(
  value: unknown
): PreviewItemParseResult {
  if (!Array.isArray(value) || value.length < 1 || value.length > 10) {
    return { ok: false, message: "Select between 1 and 10 items." };
  }

  const seen = new Set<string>();
  const items: CrossPostPreviewItem[] = [];

  for (const rawItem of value) {
    if (!rawItem || typeof rawItem !== "object") {
      return { ok: false, message: "Each preview item must be an object." };
    }

    const item = rawItem as Record<string, unknown>;
    const clientId = clean(item.clientId);
    const name = clean(item.name);
    const description = clean(item.description);
    const price = Number(item.price);
    const quantity = Number(item.quantity);
    const rawCategory = clean(item.category).toLowerCase();
    const category = categories.has(rawCategory) ? rawCategory : "general";

    if (!clientId || seen.has(clientId)) {
      return { ok: false, message: "Preview item ids must be unique." };
    }
    if (!name || !Number.isFinite(price) || price <= 0) {
      return { ok: false, message: "Each item needs a name and valid price." };
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { ok: false, message: "Each item quantity must be at least 1." };
    }

    seen.add(clientId);
    items.push({ clientId, name, description, price, quantity, category });
  }

  return { ok: true, items };
}

function toProduct(
  item: CrossPostPreviewItem,
  localized?: AiLocalizedItem
): Product {
  const fallbackName = item.name;
  const fallbackDescription = item.description;
  return {
    id: item.clientId,
    name: fallbackName,
    description: fallbackDescription,
    nameTranslations: {
      en: clean(localized?.enName) || fallbackName,
      zhTw: clean(localized?.zhTwName) || fallbackName,
      zhCn: clean(localized?.zhCnName) || fallbackName,
    },
    descriptionTranslations: {
      en: clean(localized?.enDescription) || fallbackDescription,
      zhTw: clean(localized?.zhTwDescription) || fallbackDescription,
      zhCn: clean(localized?.zhCnDescription) || fallbackDescription,
    },
    price: item.price,
    quantity: item.quantity,
    category: item.category,
  };
}

function buildCopies(
  items: CrossPostPreviewItem[],
  headings: CrossPostHeadings,
  localizedById?: Map<string, AiLocalizedItem>
) {
  return assembleCrossPostCopies(
    items.map((item) => ({
      product: toProduct(item, localizedById?.get(item.clientId)),
    })),
    headings
  );
}

function extractResponseText(payload: any) {
  if (typeof payload?.output_text === "string") return payload.output_text;

  const output = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (typeof part?.text === "string") return part.text;
    }
  }

  return null;
}

function parseJsonBlock(text: string) {
  return JSON.parse(
    text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
  );
}

function normalizeAiResult(
  parsed: any,
  items: CrossPostPreviewItem[]
): { localizedById: Map<string, AiLocalizedItem>; headings: CrossPostHeadings } | null {
  const localizedItems = Array.isArray(parsed?.localizedItems)
    ? parsed.localizedItems
    : [];
  const copies = Array.isArray(parsed?.copies) ? parsed.copies : [];
  if (
    localizedItems.length !== items.length ||
    copies.length !== crossPostPlatforms.length
  ) {
    return null;
  }

  const expectedIds = new Set(items.map((item) => item.clientId));
  const localizedById = new Map<string, AiLocalizedItem>();
  for (const value of localizedItems) {
    const clientId = clean(value?.clientId);
    const localized: AiLocalizedItem = {
      clientId,
      enName: clean(value?.enName),
      enDescription: clean(value?.enDescription),
      zhTwName: clean(value?.zhTwName),
      zhTwDescription: clean(value?.zhTwDescription),
      zhCnName: clean(value?.zhCnName),
      zhCnDescription: clean(value?.zhCnDescription),
    };
    if (
      !expectedIds.has(clientId) ||
      localizedById.has(clientId) ||
      !localized.enName ||
      !localized.zhTwName ||
      !localized.zhCnName
    ) {
      return null;
    }
    localizedById.set(clientId, localized);
  }

  const headingsByPlatform = new Map<CrossPostPlatform, AiHeading>();
  for (const value of copies) {
    if (!crossPostPlatforms.includes(value?.platform)) return null;
    const platform = value.platform as CrossPostPlatform;
    const heading = {
      platform,
      title: clean(value?.title),
      introduction: clean(value?.introduction),
    };
    if (
      !heading.title ||
      !heading.introduction ||
      headingsByPlatform.has(platform)
    ) {
      return null;
    }
    headingsByPlatform.set(platform, heading);
  }

  if (
    localizedById.size !== expectedIds.size ||
    headingsByPlatform.size !== crossPostPlatforms.length
  ) {
    return null;
  }

  const headings = Object.fromEntries(
    crossPostPlatforms.map((platform) => {
      const heading = headingsByPlatform.get(platform)!;
      return [
        platform,
        { title: heading.title, introduction: heading.introduction },
      ];
    })
  ) as CrossPostHeadings;

  return { localizedById, headings };
}

export async function generateCrossPostPreview(
  items: CrossPostPreviewItem[]
): Promise<CrossPostGenerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new CrossPostTranslationError(
      "Cross-post translation is not configured."
    );
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
        max_output_tokens: 3_200,
        input: [
          {
            role: "system",
            content:
              "Translate only the provided marketplace item names and descriptions, then write a short title and introduction for each platform. Use English for Facebook, Craigslist, and Discord; Traditional Chinese for LINE; Simplified Chinese for WeChat. Preserve every item fact. Do not add links, contact information, pickup details, warranties, discounts, condition claims, or accessories.",
          },
          {
            role: "user",
            content: JSON.stringify({
              items: items.map((item) => ({
                clientId: item.clientId,
                name: item.name,
                description: item.description,
                price: item.price,
                quantity: item.quantity,
                category: item.category,
              })),
            }),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "cross_post_preview",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                localizedItems: {
                  type: "array",
                  minItems: items.length,
                  maxItems: items.length,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      clientId: {
                        type: "string",
                        enum: items.map((item) => item.clientId),
                      },
                      enName: { type: "string" },
                      enDescription: { type: "string" },
                      zhTwName: { type: "string" },
                      zhTwDescription: { type: "string" },
                      zhCnName: { type: "string" },
                      zhCnDescription: { type: "string" },
                    },
                    required: [
                      "clientId",
                      "enName",
                      "enDescription",
                      "zhTwName",
                      "zhTwDescription",
                      "zhCnName",
                      "zhCnDescription",
                    ],
                  },
                },
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
              required: ["localizedItems", "copies"],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new CrossPostTranslationError(
        "Cross-post translation provider returned an error."
      );
    }
    const responseText = extractResponseText(await response.json());
    if (!responseText) {
      throw new CrossPostTranslationError(
        "Cross-post translation response was empty."
      );
    }

    const normalized = normalizeAiResult(parseJsonBlock(responseText), items);
    if (!normalized) {
      throw new CrossPostTranslationError(
        "Cross-post translation response was incomplete."
      );
    }

    return {
      source: "ai",
      copies: buildCopies(items, normalized.headings, normalized.localizedById),
    };
  } catch (error) {
    if (error instanceof CrossPostTranslationError) throw error;
    throw new CrossPostTranslationError(
      "Cross-post translation request failed."
    );
  }
}
