export type ProductNameTranslations = {
  en?: string | null;
  zhTw?: string | null;
  zhCn?: string | null;
};

export type ProductDescriptionTranslations = ProductNameTranslations;

export type LocaleLike = "en" | "zh" | "zhCn";

export function pickProductName(
  fallbackName: string,
  translations: ProductNameTranslations | null | undefined,
  locale: LocaleLike
) {
  if (locale === "zhCn") {
    return translations?.zhCn || translations?.zhTw || translations?.en || fallbackName;
  }

  if (locale === "zh") {
    return translations?.zhTw || translations?.zhCn || translations?.en || fallbackName;
  }

  return translations?.en || fallbackName;
}

export function pickProductDescription(
  fallbackDescription: string | null | undefined,
  translations: ProductDescriptionTranslations | null | undefined,
  locale: LocaleLike
) {
  const fallback = fallbackDescription ?? "";

  if (locale === "zhCn") {
    return translations?.zhCn || translations?.zhTw || translations?.en || fallback;
  }

  if (locale === "zh") {
    return translations?.zhTw || translations?.zhCn || translations?.en || fallback;
  }

  return translations?.en || fallback;
}

function cleanTranslation(value: unknown, fallback: string) {
  const text = String(value ?? "").trim();
  return text || fallback;
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

  const legacyContent = payload?.choices?.[0]?.message?.content;
  return typeof legacyContent === "string" ? legacyContent : null;
}

function parseTranslationJson(text: string) {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  return JSON.parse(trimmed);
}

async function translateProductText({
  text: inputText,
  systemPrompt,
  schemaName,
}: {
  text: string;
  systemPrompt: string;
  schemaName: string;
}): Promise<Required<ProductNameTranslations>> {
  const fallback = {
    en: inputText,
    zhTw: inputText,
    zhCn: inputText,
  };
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallback;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TRANSLATION_MODEL || "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: JSON.stringify({ text: inputText }),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: schemaName,
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                en: { type: "string" },
                zhTw: { type: "string" },
                zhCn: { type: "string" },
              },
              required: ["en", "zhTw", "zhCn"],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      return fallback;
    }

    const payload = await response.json();
    const responseText = extractResponseText(payload);

    if (!responseText) {
      return fallback;
    }

    const parsed = parseTranslationJson(responseText);

    return {
      en: cleanTranslation(parsed.en, inputText),
      zhTw: cleanTranslation(parsed.zhTw, inputText),
      zhCn: cleanTranslation(parsed.zhCn, inputText),
    };
  } catch {
    return fallback;
  }
}

export async function translateProductName(
  name: string
): Promise<Required<ProductNameTranslations>> {
  return translateProductText({
    text: name,
    schemaName: "product_name_translations",
    systemPrompt:
      "Translate short marketplace item names. Return compact JSON only with keys en, zhTw, zhCn. Preserve brand/model names and do not add extra descriptions.",
  });
}

export async function translateProductDescription(
  description: string
): Promise<Required<ProductDescriptionTranslations>> {
  return translateProductText({
    text: description,
    schemaName: "product_description_translations",
    systemPrompt:
      "Translate marketplace item descriptions. Return compact JSON only with keys en, zhTw, zhCn. Preserve item facts, condition, pickup notes, brand/model names, and line breaks. Do not add claims or extra details.",
  });
}
