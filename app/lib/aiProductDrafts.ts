export type AiProductDraft = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  quantity: number;
  confidence: number;
  warnings: string[];
  imageIndexes: number[];
};

export type ClientProductDraft = AiProductDraft & {
  imageUrls: string[];
};

const allowedCategories = new Set([
  "general",
  "electronics",
  "clothing",
  "books",
  "home",
]);

const categoryAliases: Record<string, string> = {
  appliance: "home",
  appliances: "home",
  furniture: "home",
  household: "home",
  kitchen: "home",
  dorm: "home",
  tech: "electronics",
  electronic: "electronics",
  electronics: "electronics",
  clothes: "clothing",
  apparel: "clothing",
  book: "books",
  books: "books",
};

export function createBulkDraftResponseFormat() {
  return {
    type: "json_schema",
    name: "bulk_product_drafts",
    strict: true,
    schema: {
      type: "object",
      properties: {
        drafts: {
          type: "array",
          minItems: 1,
          maxItems: 10,
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              category: { type: "string" },
              price: { type: "number" },
              quantity: { type: "integer" },
              confidence: { type: "number" },
              warnings: { type: "array", items: { type: "string" } },
              imageIndexes: {
                type: "array",
                minItems: 1,
                maxItems: 3,
                items: { type: "integer" },
              },
            },
            required: [
              "name",
              "description",
              "category",
              "price",
              "quantity",
              "confidence",
              "warnings",
              "imageIndexes",
            ],
            additionalProperties: false,
          },
        },
      },
      required: ["drafts"],
      additionalProperties: false,
    },
  } as const;
}

function cleanText(value: unknown, fallback: string) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function toPositiveInteger(value: unknown, fallback: number) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) return fallback;
  return number;
}

function toPrice(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 1;
  return Math.round(number * 100) / 100;
}

function toConfidence(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0.5;
  return Math.min(1, Math.max(0, number));
}

export function normalizeDraftCategory(value: unknown) {
  const normalized = String(value ?? "general")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");

  const category = categoryAliases[normalized] ?? normalized;
  return allowedCategories.has(category) ? category : "general";
}

function parseJsonText(text: string) {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  return JSON.parse(trimmed);
}

function normalizeImageIndexes(value: unknown, imageCount: number, fallbackIndex: number) {
  const rawIndexes = Array.isArray(value) ? value : [fallbackIndex];
  const indexes = rawIndexes
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 0 && item < imageCount);

  const uniqueIndexes = [...new Set(indexes)];
  return uniqueIndexes.length > 0 ? uniqueIndexes : [fallbackIndex];
}

export function parseAiDraftResponse(text: string, imageCount: number): AiProductDraft[] {
  if (imageCount < 1) return [];

  try {
    const parsed = parseJsonText(text);
    const rawDrafts = Array.isArray(parsed?.drafts) ? parsed.drafts : [];

    return rawDrafts
      .slice(0, imageCount)
      .map((draft, index) => ({
        id: `draft-${index + 1}`,
        name: cleanText(draft?.name, `Item ${index + 1}`),
        description: cleanText(draft?.description, ""),
        category: normalizeDraftCategory(draft?.category),
        price: toPrice(draft?.price),
        quantity: toPositiveInteger(draft?.quantity, 1),
        confidence: toConfidence(draft?.confidence),
        warnings: Array.isArray(draft?.warnings)
          ? draft.warnings.map((warning: unknown) => String(warning).trim()).filter(Boolean)
          : [],
        imageIndexes: normalizeImageIndexes(draft?.imageIndexes, imageCount, index),
      }));
  } catch {
    return [];
  }
}

export function createFallbackDrafts(imageCount: number): AiProductDraft[] {
  return Array.from({ length: Math.max(0, imageCount) }, (_, index) => ({
    id: `draft-${index + 1}`,
    name: `Item ${index + 1}`,
    description:
      "AI could not confidently identify this item. Please review the photo and fill in the details.",
    category: "general",
    price: 1,
    quantity: 1,
    confidence: 0.2,
    warnings: ["Please review and complete this draft before publishing."],
    imageIndexes: [index],
  }));
}

export function prepareDraftsForClient(
  drafts: AiProductDraft[],
  imageUrls: string[]
): ClientProductDraft[] {
  return drafts.map((draft) => ({
    ...draft,
    imageIndexes: draft.imageIndexes.slice(0, 3),
    imageUrls: draft.imageIndexes
      .slice(0, 3)
      .map((index) => imageUrls[index])
      .filter((url): url is string => Boolean(url)),
  }));
}

export function extractAiDraftResponseText(payload: any) {
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

  const legacyContent = payload?.choices?.[0]?.message?.content;
  return typeof legacyContent === "string" ? legacyContent : null;
}
