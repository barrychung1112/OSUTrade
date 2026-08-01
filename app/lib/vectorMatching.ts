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
  effective_price?: number | string | null;
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
  semanticScore: number;
  lexicalScore: number;
  categoryScore: number;
  finalScore: number;
  decision: WantedMatchDecision;
};

export type WantedMatchDecision = "accept" | "review" | "reject";

export type WantedMatchScore = {
  eligible: boolean;
  semanticScore: number;
  lexicalScore: number;
  categoryScore: number;
  finalScore: number;
  decision: WantedMatchDecision;
};

export const WANTED_MATCH_CONFIG = {
  semanticWeight: 0.75,
  lexicalWeight: 0.2,
  categoryWeight: 0.05,
  minimumSemanticScore: 0.55,
  aiReviewMinimumScore: 0.68,
  automaticAcceptScore: 0.8,
  maxMatchesPerRequest: 3,
  budgetTolerance: 1.1,
} as const;

function clean(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizedKey(value: unknown) {
  return clean(value).normalize("NFKC").toLowerCase();
}

function firstNonEmpty(values: unknown[]) {
  return values.map(clean).find(Boolean) ?? "";
}

function semanticLines(entries: Array<[label: string, value: unknown]>) {
  const seen = new Set<string>();

  return entries.flatMap(([label, value]) => {
    const text = clean(value);
    const key = normalizedKey(text);
    if (!text || seen.has(key)) return [];
    seen.add(key);
    return [`${label}: ${text}`];
  });
}

export function buildProductEmbeddingInput(product: ProductEmbeddingSource) {
  const name = firstNonEmpty([
    product.name,
    product.name_en,
    product.name_zh_tw,
    product.name_zh_cn,
  ]);
  const description = firstNonEmpty([
    product.description,
    product.description_en,
    product.description_zh_tw,
    product.description_zh_cn,
  ]);

  return semanticLines([
    ["Name", name],
    ["Description", description],
  ]).join("\n");
}

export function buildWantedRequestEmbeddingInput(
  request: WantedRequestEmbeddingSource
) {
  return semanticLines([
    ["Wanted item", request.query],
    ["Description", request.description],
  ]).join("\n");
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

  const budget = toNumber(request.max_price);
  const price = toNumber(product.effective_price ?? product.price);
  if (
    budget !== null &&
    price !== null &&
    price > budget * WANTED_MATCH_CONFIG.budgetTolerance
  ) {
    return false;
  }

  return true;
}

type WordSegment = {
  segment: string;
  isWordLike?: boolean;
};

type WordSegmenter = {
  segment(input: string): Iterable<WordSegment>;
};

type WordSegmenterConstructor = new (
  locale: string,
  options: { granularity: "word" }
) => WordSegmenter;

const WordSegmenter = (
  Intl as typeof Intl & { Segmenter?: WordSegmenterConstructor }
).Segmenter;
const sharedWordSegmenter = WordSegmenter
  ? new WordSegmenter("und", { granularity: "word" })
  : null;

function fallbackWordSegments(value: string) {
  // Keep combining marks attached to their base word. CJK substring matching
  // below covers runtimes whose fallback cannot infer CJK word boundaries.
  return value.match(/[\p{L}\p{N}][\p{L}\p{N}\p{M}]*/gu) ?? [];
}

function wordSegments(value: unknown) {
  const text = normalizedKey(value);
  if (!text) return [];

  if (!sharedWordSegmenter) return fallbackWordSegments(text);

  return [...sharedWordSegmenter.segment(text)]
    .filter((part) => part.isWordLike)
    .map((part) => part.segment);
}

function uniqueTokens(values: unknown[]) {
  return new Set(values.flatMap(wordSegments));
}

function lexicalRequestTokenCoverage(
  product: ProductEmbeddingSource,
  request: WantedRequestEmbeddingSource
) {
  const requestTokens = uniqueTokens([request.query, request.description]);
  if (requestTokens.size === 0) return 0;

  const productTokens = uniqueTokens([
    product.name,
    product.name_en,
    product.name_zh_tw,
    product.name_zh_cn,
    product.description,
    product.description_en,
    product.description_zh_tw,
    product.description_zh_cn,
  ]);
  const productSearchText = [
    product.name,
    product.name_en,
    product.name_zh_tw,
    product.name_zh_cn,
    product.description,
    product.description_en,
    product.description_zh_tw,
    product.description_zh_cn,
  ]
    .map(normalizedKey)
    .join(" ");
  let covered = 0;

  for (const token of requestTokens) {
    const isCjk = /\p{Script=Han}/u.test(token);
    if (
      productTokens.has(token) ||
      (isCjk && productSearchText.includes(token))
    ) {
      covered += 1;
    }
  }

  return covered / requestTokens.size;
}

function categoryMatchScore(
  product: ProductEmbeddingSource,
  request: WantedRequestEmbeddingSource
) {
  const productCategory = normalizedKey(product.category);
  const requestCategory = normalizedKey(request.category);
  return productCategory && productCategory === requestCategory ? 1 : 0;
}

function decisionForScore(semanticScore: number, finalScore: number) {
  if (semanticScore < WANTED_MATCH_CONFIG.minimumSemanticScore) return "reject";
  if (finalScore >= WANTED_MATCH_CONFIG.automaticAcceptScore) return "accept";
  if (finalScore >= WANTED_MATCH_CONFIG.aiReviewMinimumScore) return "review";
  return "reject";
}

export function scoreWantedMatchCandidate({
  product,
  wantedRequest,
}: {
  product: EmbeddedProduct;
  wantedRequest: EmbeddedWantedRequest;
}): WantedMatchScore {
  const semanticScore = cosineSimilarity(
    product.embedding,
    wantedRequest.embedding
  );
  const lexicalScore = lexicalRequestTokenCoverage(
    product.row,
    wantedRequest.row
  );
  const categoryScore = categoryMatchScore(product.row, wantedRequest.row);
  const finalScore =
    semanticScore * WANTED_MATCH_CONFIG.semanticWeight +
    lexicalScore * WANTED_MATCH_CONFIG.lexicalWeight +
    categoryScore * WANTED_MATCH_CONFIG.categoryWeight;
  const eligible = passesGuardrails(product.row, wantedRequest.row);

  return {
    eligible,
    semanticScore,
    lexicalScore,
    categoryScore,
    finalScore,
    decision: eligible
      ? decisionForScore(semanticScore, finalScore)
      : "reject",
  };
}

export function findSemanticWantedMatches({
  products,
  wantedRequests,
  threshold = WANTED_MATCH_CONFIG.minimumSemanticScore,
}: {
  products: EmbeddedProduct[];
  wantedRequests: EmbeddedWantedRequest[];
  threshold?: number;
}) {
  const matchesByRequest = new Map<string, SemanticWantedMatch[]>();

  for (const product of products) {
    for (const request of wantedRequests) {
      const result = scoreWantedMatchCandidate({
        product,
        wantedRequest: request,
      });
      if (
        !result.eligible ||
        result.semanticScore < threshold ||
        result.decision === "reject"
      ) {
        continue;
      }

      const match: SemanticWantedMatch = {
        wantedRequestId: request.row.wanted_request_id,
        userId: request.row.user_id,
        productId: String(product.row.product_id),
        score: result.finalScore,
        semanticScore: result.semanticScore,
        lexicalScore: result.lexicalScore,
        categoryScore: result.categoryScore,
        finalScore: result.finalScore,
        decision: result.decision,
      };
      const requestMatches = matchesByRequest.get(match.wantedRequestId) ?? [];
      requestMatches.push(match);
      matchesByRequest.set(match.wantedRequestId, requestMatches);
    }
  }

  return [...matchesByRequest.values()]
    .flatMap((matches) =>
      matches.sort((left, right) => right.finalScore - left.finalScore)
    )
    .sort((left, right) => right.finalScore - left.finalScore);
}
