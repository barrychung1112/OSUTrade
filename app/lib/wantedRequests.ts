import { sendEmail as defaultSendEmail, type SendEmail } from "./email";
import {
  buildProductEmbeddingInput,
  buildWantedRequestEmbeddingInput,
  contentHash,
  findSemanticWantedMatches,
  shouldEmbed,
  type ProductEmbeddingSource,
  type SemanticWantedMatch,
  type WantedRequestEmbeddingSource,
} from "./vectorMatching";
import {
  assertSupportedEmbeddingModel,
  DEFAULT_EMBEDDING_MODEL,
  embedTextsWithOpenAI,
  parseEmbedding,
} from "./vectorEmbeddings";
import {
  reviewWantedMatch,
  type WantedMatchReviewInput,
  type WantedMatchReviewResult,
} from "./wantedMatchReview";

export type WantedRequestStatus = "active" | "paused" | "fulfilled" | "deleted";

export type WantedRequestRow = {
  wanted_request_id: string;
  user_id: string;
  query: string;
  max_price?: number | string | null;
  category?: string | null;
  description?: string | null;
  email_subscribed: boolean;
  status: WantedRequestStatus | string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type WantedProductRow = {
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

export type WantedMatch = {
  wantedRequestId: string;
  userId: string;
  productId: string;
  score: number;
};

export type WantedRequestInput = {
  query?: unknown;
  maxPrice?: unknown;
  category?: unknown;
  description?: unknown;
  emailSubscribed?: unknown;
};

export type WantedRequestValues = {
  query: string;
  max_price: number | null;
  category: string | null;
  description: string | null;
  email_subscribed: boolean;
};

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeSearchText(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function normalizePrice(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://osutrade.com"
  ).replace(/\/$/, "");
}

function formatPrice(value: number | string | null | undefined) {
  const numeric = normalizePrice(value) ?? 0;
  return numeric.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function queryTokens(query: string) {
  const normalized = normalizeSearchText(query);
  const parts = normalized
    .split(/[\s,;，。]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

  return Array.from(new Set([normalized, ...parts].filter(Boolean)));
}

function productSearchText(product: WantedProductRow) {
  return [
    product.name,
    product.name_en,
    product.name_zh_tw,
    product.name_zh_cn,
    product.description,
    product.description_en,
    product.description_zh_tw,
    product.description_zh_cn,
    product.category,
  ]
    .map(normalizeSearchText)
    .filter(Boolean)
    .join(" ");
}

export function normalizeWantedRequestInput(input: WantedRequestInput):
  | { ok: true; values: WantedRequestValues }
  | { ok: false; message: string } {
  const query = normalizeText(input.query);
  if (!query) {
    return { ok: false, message: "Wanted item is required." };
  }

  const maxPrice = normalizePrice(input.maxPrice);
  if (
    input.maxPrice !== null &&
    input.maxPrice !== undefined &&
    input.maxPrice !== "" &&
    (maxPrice === null || maxPrice <= 0)
  ) {
    return { ok: false, message: "Budget must be greater than 0." };
  }

  const category = normalizeText(input.category);
  const description = normalizeText(input.description);

  return {
    ok: true,
    values: {
      query,
      max_price: maxPrice,
      category: category || null,
      description: description || null,
      email_subscribed: input.emailSubscribed === false ? false : true,
    },
  };
}

export function findWantedRequestMatches(
  product: WantedProductRow,
  requests: WantedRequestRow[]
): WantedMatch[] {
  const productPrice = normalizePrice(product.price);
  const productCategory = normalizeSearchText(product.category);
  const searchable = productSearchText(product);

  return requests
    .map((request) => {
      if (request.status !== "active" || !request.email_subscribed) return null;

      const budget = normalizePrice(request.max_price);
      if (budget !== null && productPrice !== null && productPrice > budget) {
        return null;
      }

      const requestCategory = normalizeSearchText(request.category);
      if (requestCategory && requestCategory !== productCategory) return null;

      const hits = queryTokens(request.query).filter((token) =>
        searchable.includes(token)
      );

      if (hits.length === 0) return null;

      const score = hits.length + (requestCategory ? 1 : 0);
      return {
        wantedRequestId: request.wanted_request_id,
        userId: request.user_id,
        productId: String(product.product_id),
        score,
      };
    })
    .filter((match): match is WantedMatch => Boolean(match))
    .sort((left, right) => right.score - left.score);
}

export function buildWantedRequestEmail({
  wantedQuery,
  productName,
  productPrice,
  productUrl,
}: {
  wantedQuery: string;
  productName: string;
  productPrice: number | string | null | undefined;
  productUrl: string;
}) {
  return {
    subject: `[OSUTrade] New listing matches your wanted item: ${productName}`,
    text: [
      "Hi,",
      "",
      "A new OSUTrade listing may match something you wanted.",
      "",
      `Wanted item: ${wantedQuery}`,
      `Matched listing: ${productName}`,
      `Price: ${formatPrice(productPrice)}`,
      "",
      "View listing:",
      productUrl,
      "",
      "If this is no longer relevant, open your Requests page and pause or mark the wanted item as fulfilled.",
      "",
      "OSUTrade",
      "Campus secondhand marketplace",
    ].join("\n"),
  };
}

export function buildProductUrl(productId: string | number) {
  return `${getAppUrl()}/product/${productId}`;
}

type NotifyWantedMatchesOptions = {
  supabase: {
    from: (table: string) => any;
    auth?: {
      admin?: {
        getUserById: (userId: string) => Promise<{
          data: { user?: { email?: string | null } | null };
          error: Error | null;
        }>;
      };
    };
  };
  product: WantedProductRow;
  sendEmail?: SendEmail;
  embedTexts?: (texts: string[], model: string) => Promise<number[][]>;
  reviewMatch?: (
    input: WantedMatchReviewInput
  ) => Promise<WantedMatchReviewResult>;
  model?: string;
  now?: () => Date;
};

type EmbeddingRow = {
  product_id?: string;
  wanted_request_id?: string;
  embedding?: number[] | string | null;
  content_hash?: string | null;
};

type AcceptedImmediateMatch = SemanticWantedMatch & {
  decisionSource: "hybrid" | "ai_review";
  decisionReason: string;
  reviewConfidence: number | null;
  reviewError: string | null;
};

const MAX_IMMEDIATE_REVIEW_CONCURRENCY = 3;
const MAX_IMMEDIATE_AI_REVIEWS = 6;

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, items.length) },
      () => worker()
    )
  );
  return results;
}

async function getEmailByUserId(
  supabase: NotifyWantedMatchesOptions["supabase"],
  userId: string
) {
  const result = await supabase.auth?.admin?.getUserById(userId);
  if (result?.error) throw result.error;
  return result?.data.user?.email ?? null;
}

export async function notifyMatchingWantedRequests({
  supabase,
  product,
  sendEmail = defaultSendEmail,
  embedTexts = embedTextsWithOpenAI,
  reviewMatch = reviewWantedMatch,
  model = process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL,
  now = () => new Date(),
}: NotifyWantedMatchesOptions) {
  const results: Array<{
    wantedRequestId: string;
    productId: string;
    emailed: boolean;
    emailError: string | null;
  }> = [];

  try {
    assertSupportedEmbeddingModel(model);

    const { data: wantedRequests, error: requestError } = await supabase
      .from("wanted_requests")
      .select("*")
      .eq("status", "active")
      .eq("email_subscribed", true);

    if (requestError) throw requestError;

    const requestRows = (wantedRequests ?? []) as WantedRequestRow[];
    if (requestRows.length === 0) return { matches: results };

    const productId = String(product.product_id);
    const requestIds = requestRows.map((row) => row.wanted_request_id);
    const [
      { data: existingProductEmbedding, error: productEmbeddingError },
      { data: existingRequestEmbeddings, error: requestEmbeddingError },
    ] = await Promise.all([
      supabase
        .from("product_embeddings")
        .select("*")
        .eq("product_id", productId)
        .maybeSingle(),
      supabase
        .from("wanted_request_embeddings")
        .select("*")
        .in("wanted_request_id", requestIds),
    ]);

    if (productEmbeddingError) throw productEmbeddingError;
    if (requestEmbeddingError) throw requestEmbeddingError;

    const productInput = buildProductEmbeddingInput(
      product as ProductEmbeddingSource
    );
    const productHash = contentHash(model, productInput);
    const requestEmbeddingById = new Map(
      ((existingRequestEmbeddings ?? []) as EmbeddingRow[]).map((row) => [
        String(row.wanted_request_id),
        row,
      ])
    );
    const requestInputs = requestRows.map((request) => {
      const input = buildWantedRequestEmbeddingInput(
        request as WantedRequestEmbeddingSource
      );
      return {
        request,
        input,
        hash: contentHash(model, input),
      };
    });

    const productNeedsEmbedding = shouldEmbed(
      existingProductEmbedding as EmbeddingRow | null,
      productHash
    );
    const pendingRequests = requestInputs.filter(({ request, hash }) =>
      shouldEmbed(requestEmbeddingById.get(request.wanted_request_id), hash)
    );
    const pendingInputs = [
      ...(productNeedsEmbedding ? [productInput] : []),
      ...pendingRequests.map(({ input }) => input),
    ];
    const embeddings = await embedTexts(pendingInputs, model);
    if (embeddings.length !== pendingInputs.length) {
      throw new Error("Embedding response count did not match input count.");
    }

    const embeddedAt = now().toISOString();
    let embeddingIndex = 0;
    const productEmbedding = productNeedsEmbedding
      ? embeddings[embeddingIndex++]
      : parseEmbedding(
          (existingProductEmbedding as EmbeddingRow | null)?.embedding
        );

    if (productNeedsEmbedding) {
      const { error } = await supabase.from("product_embeddings").upsert({
        product_id: productId,
        embedding_model: model,
        embedding_input: productInput,
        embedding: productEmbedding,
        content_hash: productHash,
        embedded_at: embeddedAt,
      });
      if (error) throw error;
    }

    const nextRequestEmbeddings = new Map(requestEmbeddingById);
    const requestUpserts = pendingRequests.map(({ request, input, hash }) => {
      const row = {
        wanted_request_id: request.wanted_request_id,
        embedding_model: model,
        embedding_input: input,
        embedding: embeddings[embeddingIndex++],
        content_hash: hash,
        embedded_at: embeddedAt,
      };
      nextRequestEmbeddings.set(request.wanted_request_id, row);
      return row;
    });

    if (requestUpserts.length > 0) {
      const { error } = await supabase
        .from("wanted_request_embeddings")
        .upsert(requestUpserts);
      if (error) throw error;
    }

    const candidates = findSemanticWantedMatches({
      products: [
        {
          row: product as ProductEmbeddingSource,
          embedding: productEmbedding,
        },
      ],
      wantedRequests: requestRows
        .map((request) => ({
          row: request as WantedRequestEmbeddingSource,
          embedding: parseEmbedding(
            nextRequestEmbeddings.get(request.wanted_request_id)?.embedding
          ),
        }))
        .filter((item) => item.embedding.length > 0),
    });
    const requestById = new Map(
      requestRows.map((request) => [request.wanted_request_id, request])
    );
    const automaticMatches = candidates
      .filter((candidate) => candidate.decision === "accept")
      .map<AcceptedImmediateMatch>((candidate) => ({
          ...candidate,
          decisionSource: "hybrid",
          decisionReason: "Automatically accepted by hybrid score.",
          reviewConfidence: null,
          reviewError: null,
      }));
    const reviewCandidates = candidates
      .filter((candidate) => candidate.decision === "review")
      .sort((left, right) => right.finalScore - left.finalScore)
      .slice(0, MAX_IMMEDIATE_AI_REVIEWS);
    const reviewedMatches = await mapWithConcurrency(
      reviewCandidates,
      MAX_IMMEDIATE_REVIEW_CONCURRENCY,
      async (
        candidate
      ): Promise<AcceptedImmediateMatch | null> => {
        const request = requestById.get(candidate.wantedRequestId);
        if (!request) return null;

        let review: WantedMatchReviewResult;
        try {
          review = await reviewMatch({
            wanted: {
              query: request.query,
              description: request.description,
              maxPrice: normalizePrice(request.max_price),
            },
            product: {
              name: product.name || "Unnamed listing",
              description: product.description,
              price: normalizePrice(product.price),
            },
            scores: {
              semantic: candidate.semanticScore,
              lexical: candidate.lexicalScore,
              category: candidate.categoryScore,
              final: candidate.finalScore,
            },
          });
        } catch {
          return null;
        }

        if (review.status !== "accepted") return null;
        return {
          ...candidate,
          decisionSource: "ai_review",
          decisionReason: review.reason,
          reviewConfidence: review.confidence,
          reviewError: null,
        };
      }
    );
    const accepted = [
      ...automaticMatches,
      ...reviewedMatches.filter(
        (match): match is AcceptedImmediateMatch => match !== null
      ),
    ].sort((left, right) => right.finalScore - left.finalScore);

    for (const match of accepted) {
      const { data: matchRow, error: matchError } = await supabase
        .from("wanted_request_matches")
        .insert({
          wanted_request_id: match.wantedRequestId,
          product_id: match.productId,
          score: match.finalScore,
          semantic_score: match.semanticScore,
          lexical_score: match.lexicalScore,
          category_score: match.categoryScore,
          decision_source: match.decisionSource,
          decision_reason: match.decisionReason,
          review_confidence: match.reviewConfidence,
          review_error: match.reviewError,
        })
        .select("match_id")
        .single();

      if (matchError) {
        if (matchError.code === "23505") continue;
        throw matchError;
      }

      const wantedRequest = requestById.get(match.wantedRequestId);
      const productName = product.name || "New OSUTrade listing";
      let emailError: string | null = null;
      let emailed = false;

      try {
        const emailEnabled =
          process.env.WANTED_MATCH_EMAIL_ENABLED !== "false";
        const email = emailEnabled
          ? await getEmailByUserId(supabase, match.userId)
          : null;
        if (emailEnabled && email) {
          await sendEmail({
            to: email,
            ...buildWantedRequestEmail({
              wantedQuery: wantedRequest?.query ?? "your wanted item",
              productName,
              productPrice: product.price,
              productUrl: buildProductUrl(product.product_id),
            }),
          });
          emailed = true;
        }
      } catch (error) {
        emailError =
          error instanceof Error
            ? error.message
            : "Failed to send wanted email.";
      }

      await supabase
        .from("wanted_request_matches")
        .update({
          emailed_at: emailed ? now().toISOString() : null,
          email_error: emailError,
        })
        .eq("match_id", matchRow?.match_id);

      results.push({
        wantedRequestId: match.wantedRequestId,
        productId: match.productId,
        emailed,
        emailError,
      });
    }
  } catch (error) {
    console.error("Failed to match new product to wanted requests.", error);
  }

  return { matches: results };
}
