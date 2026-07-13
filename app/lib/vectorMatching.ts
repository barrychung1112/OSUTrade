import { createHash } from "node:crypto";

export type ProductEmbeddingSource = {
  product_id: string | number;
  name: string;
  name_en?: string | null;
  name_zh_tw?: string | null;
  name_zh_cn?: string | null;
  description?: string | null;
  description_en?: string | null;
  description_zh_tw?: string | null;
  description_zh_cn?: string | null;
  price?: number | string | null;
  category?: string | null;
  status?: string | null;
  quantity?: number | string | null;
  seller_id?: string | null;
};

export type WantedRequestEmbeddingSource = {
  wanted_request_id: string;
  user_id: string;
  query: string;
  description?: string | null;
  max_price?: number | string | null;
  category?: string | null;
  email_subscribed: boolean;
  status: string;
};

export type ExistingEmbedding = {
  content_hash?: string | null;
};

export type EmbeddedProduct = {
  row: ProductEmbeddingSource;
  embedding: number[];
};

export type EmbeddedWantedRequest = {
  row: WantedRequestEmbeddingSource;
  embedding: number[];
};

export type SemanticWantedMatch = {
  wantedRequestId: string;
  userId: string;
  productId: string;
  score: number;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function optionalLine(label: string, value: unknown) {
  const text = clean(value);
  return text ? `${label}: ${text}` : null;
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizedCategory(value: unknown) {
  return clean(value).toLowerCase();
}

export function buildProductEmbeddingInput(product: ProductEmbeddingSource) {
  return [
    optionalLine("Name", product.name),
    optionalLine("English name", product.name_en),
    optionalLine("Traditional Chinese name", product.name_zh_tw),
    optionalLine("Simplified Chinese name", product.name_zh_cn),
    optionalLine("Description", product.description),
    optionalLine("English description", product.description_en),
    optionalLine("Traditional Chinese description", product.description_zh_tw),
    optionalLine("Simplified Chinese description", product.description_zh_cn),
    optionalLine("Category", product.category),
    optionalLine("Price", product.price),
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

export function buildWantedRequestEmbeddingInput(
  request: WantedRequestEmbeddingSource
) {
  return [
    optionalLine("Wanted item", request.query),
    optionalLine("Description", request.description),
    optionalLine("Category", request.category),
    optionalLine("Maximum price", request.max_price),
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

export function contentHash(model: string, input: string) {
  return createHash("sha256").update(`${model}\n${input}`).digest("hex");
}

export function shouldEmbed(
  existing: ExistingEmbedding | null | undefined,
  nextContentHash: string
) {
  return existing?.content_hash !== nextContentHash;
}

export function cosineSimilarity(left: number[], right: number[]) {
  if (left.length !== right.length || left.length === 0) return 0;

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) return 0;
  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function passesGuardrails(
  product: ProductEmbeddingSource,
  request: WantedRequestEmbeddingSource
) {
  if (request.status !== "active" || !request.email_subscribed) return false;
  if (product.status && product.status !== "available") return false;

  const quantity = toNumber(product.quantity);
  if (quantity !== null && quantity <= 0) return false;
  if (product.seller_id && product.seller_id === request.user_id) return false;

  const requestCategory = normalizedCategory(request.category);
  const productCategory = normalizedCategory(product.category);
  if (requestCategory && productCategory && requestCategory !== productCategory) {
    return false;
  }

  const budget = toNumber(request.max_price);
  const price = toNumber(product.price);
  if (budget !== null && price !== null && price > budget * 1.15) return false;

  return true;
}

export function findSemanticWantedMatches({
  products,
  wantedRequests,
  threshold = 0.78,
}: {
  products: EmbeddedProduct[];
  wantedRequests: EmbeddedWantedRequest[];
  threshold?: number;
}) {
  const matches: SemanticWantedMatch[] = [];

  for (const product of products) {
    for (const request of wantedRequests) {
      if (!passesGuardrails(product.row, request.row)) continue;

      const score = cosineSimilarity(product.embedding, request.embedding);
      if (score < threshold) continue;

      matches.push({
        wantedRequestId: request.row.wanted_request_id,
        userId: request.row.user_id,
        productId: String(product.row.product_id),
        score,
      });
    }
  }

  return matches.sort((left, right) => right.score - left.score);
}
