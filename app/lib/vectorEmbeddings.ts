export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

const SUPPORTED_1536_DIMENSION_MODELS = new Set([
  "text-embedding-3-small",
  "text-embedding-ada-002",
]);

export function assertSupportedEmbeddingModel(model: string) {
  if (!SUPPORTED_1536_DIMENSION_MODELS.has(model)) {
    throw new Error(
      `${model} is not supported by the current vector(1536) schema. Use text-embedding-3-small or migrate the schema dimension first.`
    );
  }
}

export function parseEmbedding(
  value: number[] | string | null | undefined
) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  const trimmed = value.replace(/^\[|\]$/g, "");
  return trimmed
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((number) => Number.isFinite(number));
}

export async function embedTextsWithOpenAI(
  texts: string[],
  model = process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL
) {
  if (texts.length === 0) return [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required to generate embeddings.");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: texts,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI embeddings failed: ${response.status} ${body}`);
  }

  const payload = await response.json();
  return (payload.data ?? [])
    .sort(
      (left: { index: number }, right: { index: number }) =>
        left.index - right.index
    )
    .map((item: { embedding: number[] }) => item.embedding);
}
