export type ProductNameTranslations = {
  en?: string | null;
  zhTw?: string | null;
  zhCn?: string | null;
};

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

function cleanTranslation(value: unknown, fallback: string) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export async function translateProductName(
  name: string
): Promise<Required<ProductNameTranslations>> {
  const fallback = {
    en: name,
    zhTw: name,
    zhCn: name,
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
            content:
              "Translate short marketplace item names. Return compact JSON only with keys en, zhTw, zhCn. Preserve brand/model names and do not add extra descriptions.",
          },
          {
            role: "user",
            content: JSON.stringify({ name }),
          },
        ],
        text: {
          format: {
            type: "json_object",
          },
        },
      }),
    });

    if (!response.ok) {
      return fallback;
    }

    const payload = await response.json();
    const text = payload.output_text || payload.output?.[0]?.content?.[0]?.text;

    if (!text) {
      return fallback;
    }

    const parsed = JSON.parse(text);

    return {
      en: cleanTranslation(parsed.en, name),
      zhTw: cleanTranslation(parsed.zhTw, name),
      zhCn: cleanTranslation(parsed.zhCn, name),
    };
  } catch {
    return fallback;
  }
}
