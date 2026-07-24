export type WantedMatchReviewInput = {
  wanted: {
    query: string;
    description?: string | null;
    maxPrice?: number | null;
  };
  product: {
    name: string;
    description?: string | null;
    price?: number | null;
  };
  scores: {
    semantic: number;
    lexical: number;
    category: number;
    final: number;
  };
};

export type WantedMatchReviewResult =
  | {
      status: "accepted" | "rejected";
      relevant: boolean;
      confidence: number;
      reason: string;
    }
  | {
      status: "deferred";
      error: string;
    };

type ReviewOptions = {
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

type StructuredReview = {
  relevant: boolean;
  confidence: number;
  reason: string;
};

const REVIEW_CONFIDENCE_THRESHOLD = 0.75;
const DEFAULT_TIMEOUT_MS = 10_000;

function extractOutputText(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;

  const response = payload as {
    output_text?: unknown;
    output?: Array<{
      content?: Array<{
        type?: unknown;
        text?: unknown;
      }>;
    }>;
  };

  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  for (const output of response.output ?? []) {
    for (const content of output.content ?? []) {
      if (
        content.type === "output_text" &&
        typeof content.text === "string"
      ) {
        return content.text;
      }
    }
  }

  return null;
}

function parseStructuredReview(payload: unknown): StructuredReview | null {
  const text = extractOutputText(payload);
  if (!text) return null;

  try {
    const parsed = JSON.parse(text) as Partial<StructuredReview>;
    const reason =
      typeof parsed.reason === "string" ? parsed.reason.trim() : "";

    if (
      typeof parsed.relevant !== "boolean" ||
      typeof parsed.confidence !== "number" ||
      !Number.isFinite(parsed.confidence) ||
      parsed.confidence < 0 ||
      parsed.confidence > 1 ||
      !reason
    ) {
      return null;
    }

    return {
      relevant: parsed.relevant,
      confidence: parsed.confidence,
      reason,
    };
  } catch {
    return null;
  }
}

export async function reviewWantedMatch(
  input: WantedMatchReviewInput,
  options: ReviewOptions = {}
): Promise<WantedMatchReviewResult> {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      status: "deferred",
      error: "AI match review is unavailable.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  );

  try {
    const response = await (options.fetchImpl ?? fetch)(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model:
            options.model ??
            process.env.OPENAI_MATCH_REVIEW_MODEL ??
            "gpt-4.1-mini",
          max_output_tokens: 300,
          input: [
            {
              role: "system",
              content:
                "Decide whether the product satisfies the wanted request. Judge the requested item, not merely a shared topic. Use only the provided facts.",
            },
            {
              role: "user",
              content: JSON.stringify(input),
            },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "wanted_match_review",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  relevant: { type: "boolean" },
                  confidence: {
                    type: "number",
                    minimum: 0,
                    maximum: 1,
                  },
                  reason: { type: "string" },
                },
                required: ["relevant", "confidence", "reason"],
              },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      return {
        status: "deferred",
        error: "AI match review request failed.",
      };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return {
        status: "deferred",
        error: "AI match review returned invalid output.",
      };
    }

    const review = parseStructuredReview(payload);
    if (!review) {
      return {
        status: "deferred",
        error: "AI match review returned invalid output.",
      };
    }

    return {
      status:
        review.relevant &&
        review.confidence >= REVIEW_CONFIDENCE_THRESHOLD
          ? "accepted"
          : "rejected",
      ...review,
    };
  } catch {
    return {
      status: "deferred",
      error: "AI match review is temporarily unavailable.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
