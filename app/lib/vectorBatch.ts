import { sendEmail as defaultSendEmail, type SendEmail } from "./email";
import { buildProductUrl, buildWantedRequestEmail } from "./wantedRequests";
import {
  buildProductEmbeddingInput,
  buildWantedRequestEmbeddingInput,
  contentHash,
  findSemanticWantedMatches,
  shouldEmbed,
  WANTED_MATCH_CONFIG,
  type ProductEmbeddingSource,
  type SemanticWantedMatch,
  type WantedRequestEmbeddingSource,
} from "./vectorMatching";
import {
  reviewWantedMatch,
  type WantedMatchReviewInput,
  type WantedMatchReviewResult,
} from "./wantedMatchReview";

const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_BATCH_LIMIT = 100;
const DEFAULT_MATCH_THRESHOLD = WANTED_MATCH_CONFIG.minimumSemanticScore;
const MAX_AI_REVIEW_CONCURRENCY = 3;
const SUPPORTED_1536_DIMENSION_MODELS = new Set([
  "text-embedding-3-small",
  "text-embedding-ada-002",
]);

type SupabaseLike = {
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

type EmbeddingRow = {
  product_id?: string;
  wanted_request_id?: string;
  embedding?: number[] | string | null;
  content_hash?: string | null;
};

export type VectorBatchResult = {
  status: "completed" | "failed";
  productsChecked: number;
  productsEmbedded: number;
  wantedRequestsChecked: number;
  wantedRequestsEmbedded: number;
  matchesCreated: number;
  emailsSent: number;
  errorMessage?: string;
};

type RunVectorMatchBatchOptions = {
  supabase: SupabaseLike;
  embedTexts?: (texts: string[], model: string) => Promise<number[][]>;
  sendEmail?: SendEmail;
  reviewMatch?: (
    input: WantedMatchReviewInput
  ) => Promise<WantedMatchReviewResult>;
  model?: string;
  batchLimit?: number;
  threshold?: number;
  now?: () => Date;
};

type AcceptedMatch = SemanticWantedMatch & {
  decisionSource: "hybrid" | "ai_review";
  decisionReason: string;
  reviewConfidence: number | null;
  reviewError: string | null;
};

function parseEmbedding(value: number[] | string | null | undefined) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  const trimmed = value.replace(/^\[|\]$/g, "");
  return trimmed
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((number) => Number.isFinite(number));
}

async function insertBatchRun(supabase: SupabaseLike) {
  const { data, error } = await supabase
    .from("vector_batch_runs")
    .insert({ status: "running" })
    .select("run_id")
    .single();

  if (error) throw error;
  return data?.run_id as string | undefined;
}

async function updateBatchRun(
  supabase: SupabaseLike,
  runId: string | undefined,
  values: Record<string, unknown>
) {
  if (!runId) return;
  await supabase.from("vector_batch_runs").update(values).eq("run_id", runId);
}

async function getEmailByUserId(supabase: SupabaseLike, userId: string) {
  const result = await supabase.auth?.admin?.getUserById(userId);
  if (result?.error) throw result.error;
  return result?.data.user?.email ?? null;
}

function assertSupportedEmbeddingModel(model: string) {
  if (!SUPPORTED_1536_DIMENSION_MODELS.has(model)) {
    throw new Error(
      `${model} is not supported by the current vector(1536) schema. Use text-embedding-3-small or migrate the schema dimension first.`
    );
  }
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error.trim();

  if (error && typeof error === "object") {
    const details = error as {
      message?: unknown;
      code?: unknown;
      details?: unknown;
      hint?: unknown;
    };
    const parts = [
      details.message,
      details.code ? `code: ${String(details.code)}` : null,
      details.details,
      details.hint,
    ]
      .filter((value) => typeof value === "string" && value.trim())
      .map((value) => String(value).trim());

    if (parts.length > 0) return parts.join(" | ");

    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== "{}") return serialized;
    } catch {
      // Fall through to the stable batch error below.
    }
  }

  return "Vector batch failed.";
}

function rankAcceptedMatches(matches: AcceptedMatch[]) {
  const byRequest = new Map<string, AcceptedMatch[]>();

  for (const match of matches) {
    const requestMatches = byRequest.get(match.wantedRequestId) ?? [];
    requestMatches.push(match);
    byRequest.set(match.wantedRequestId, requestMatches);
  }

  return [...byRequest.values()].flatMap((requestMatches) =>
    requestMatches.sort((left, right) => right.finalScore - left.finalScore)
  );
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(
    Array.from({ length: workerCount }, () => worker())
  );
  return results;
}

async function selectAllPages<T>(
  buildQuery: () => any,
  pageSize: number
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await buildQuery().range(from, to);
    if (error) throw error;

    const page = (data ?? []) as T[];
    rows.push(...page);

    if (page.length < pageSize) break;
    from += pageSize;
  }

  return rows;
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
    .sort((left: { index: number }, right: { index: number }) => left.index - right.index)
    .map((item: { embedding: number[] }) => item.embedding);
}

export async function runVectorMatchBatch({
  supabase,
  embedTexts = embedTextsWithOpenAI,
  sendEmail = defaultSendEmail,
  reviewMatch = reviewWantedMatch,
  model = process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL,
  batchLimit = DEFAULT_BATCH_LIMIT,
  threshold = DEFAULT_MATCH_THRESHOLD,
  now = () => new Date(),
}: RunVectorMatchBatchOptions): Promise<VectorBatchResult> {
  const runId = await insertBatchRun(supabase);

  try {
    assertSupportedEmbeddingModel(model);

    const [productRows, wantedRows] = await Promise.all([
      selectAllPages<ProductEmbeddingSource>(
        () =>
          supabase
          .from("products")
          .select("*")
          .eq("status", "available")
          .gt("quantity", 0)
          .order("created_at", { ascending: true }),
        batchLimit
      ),
      selectAllPages<WantedRequestEmbeddingSource>(
        () =>
          supabase
          .from("wanted_requests")
          .select("*")
          .eq("status", "active")
          .eq("email_subscribed", true)
          .order("created_at", { ascending: true }),
        batchLimit
      ),
    ]);

    const productIds = productRows.map((product) => String(product.product_id));
    const wantedIds = wantedRows.map((request) => request.wanted_request_id);
    const productRowsById = new Map(
      productRows.map((product) => [
        String(product.product_id),
        product,
      ])
    );
    const wantedRowsById = new Map(
      wantedRows.map((request) => [
        request.wanted_request_id,
        request,
      ])
    );

    const [{ data: productEmbeddings, error: productEmbeddingError }, { data: wantedEmbeddings, error: wantedEmbeddingError }] =
      await Promise.all([
        productIds.length
          ? supabase
              .from("product_embeddings")
              .select("*")
              .in("product_id", productIds)
          : Promise.resolve({ data: [], error: null }),
        wantedIds.length
          ? supabase
              .from("wanted_request_embeddings")
              .select("*")
              .in("wanted_request_id", wantedIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

    if (productEmbeddingError) throw productEmbeddingError;
    if (wantedEmbeddingError) throw wantedEmbeddingError;

    const productEmbeddingById = new Map(
      ((productEmbeddings ?? []) as EmbeddingRow[]).map((row) => [
        String(row.product_id),
        row,
      ])
    );
    const wantedEmbeddingById = new Map(
      ((wantedEmbeddings ?? []) as EmbeddingRow[]).map((row) => [
        String(row.wanted_request_id),
        row,
      ])
    );

    const productInputs = productRows.map((product) => ({
      product,
      input: buildProductEmbeddingInput(product),
    }));
    const wantedInputs = wantedRows.map((request) => ({
      request,
      input: buildWantedRequestEmbeddingInput(request),
    }));

    const productPending = productInputs.filter(({ product, input }) => {
      const hash = contentHash(model, input);
      return shouldEmbed(productEmbeddingById.get(String(product.product_id)), hash);
    });
    const wantedPending = wantedInputs.filter(({ request, input }) => {
      const hash = contentHash(model, input);
      return shouldEmbed(wantedEmbeddingById.get(request.wanted_request_id), hash);
    });

    const pendingInputs = [
      ...productPending.map((item) => item.input),
      ...wantedPending.map((item) => item.input),
    ];
    const pendingEmbeddings = await embedTexts(pendingInputs, model);
    const embeddedAt = now().toISOString();

    const productUpserts = productPending.map((item, index) => ({
      product_id: String(item.product.product_id),
      embedding_model: model,
      embedding_input: item.input,
      embedding: pendingEmbeddings[index],
      content_hash: contentHash(model, item.input),
      embedded_at: embeddedAt,
    }));

    const wantedOffset = productUpserts.length;
    const wantedUpserts = wantedPending.map((item, index) => ({
      wanted_request_id: item.request.wanted_request_id,
      embedding_model: model,
      embedding_input: item.input,
      embedding: pendingEmbeddings[wantedOffset + index],
      content_hash: contentHash(model, item.input),
      embedded_at: embeddedAt,
    }));

    if (productUpserts.length > 0) {
      const { error } = await supabase
        .from("product_embeddings")
        .upsert(productUpserts);
      if (error) throw error;
    }

    if (wantedUpserts.length > 0) {
      const { error } = await supabase
        .from("wanted_request_embeddings")
        .upsert(wantedUpserts);
      if (error) throw error;
    }

    const nextProductEmbeddings = new Map(productEmbeddingById);
    for (const row of productUpserts) {
      nextProductEmbeddings.set(row.product_id, row);
    }

    const nextWantedEmbeddings = new Map(wantedEmbeddingById);
    for (const row of wantedUpserts) {
      nextWantedEmbeddings.set(row.wanted_request_id, row);
    }

    const embeddedProducts = productRows
      .map((product) => ({
        row: product,
        embedding: parseEmbedding(
          nextProductEmbeddings.get(String(product.product_id))?.embedding
        ),
      }))
      .filter((item) => item.embedding.length > 0);

    const embeddedWantedRequests = wantedRows
      .map((request) => ({
        row: request,
        embedding: parseEmbedding(
          nextWantedEmbeddings.get(request.wanted_request_id)?.embedding
        ),
      }))
      .filter((item) => item.embedding.length > 0);

    const matches = findSemanticWantedMatches({
      products: embeddedProducts,
      wantedRequests: embeddedWantedRequests,
      threshold,
    });
    const automaticMatches = matches
      .filter((match) => match.decision === "accept")
      .map<AcceptedMatch>((match) => ({
        ...match,
        decisionSource: "hybrid",
        decisionReason: "Automatically accepted by hybrid score.",
        reviewConfidence: null,
        reviewError: null,
      }));
    const automaticMatchesByRequest = new Map<string, AcceptedMatch[]>();
    for (const match of automaticMatches) {
      const requestMatches =
        automaticMatchesByRequest.get(match.wantedRequestId) ?? [];
      requestMatches.push(match);
      automaticMatchesByRequest.set(match.wantedRequestId, requestMatches);
    }

    const reviewCandidates = matches.filter((match) => {
      if (match.decision !== "review") return false;
      const higherAutomaticMatches = (
        automaticMatchesByRequest.get(match.wantedRequestId) ?? []
      ).filter(
        (automaticMatch) =>
          automaticMatch.finalScore > match.finalScore
      );
      return (
        higherAutomaticMatches.length <
        WANTED_MATCH_CONFIG.maxMatchesPerRequest
      );
    });
    const reviewOutcomes = await mapWithConcurrency(
      reviewCandidates,
      MAX_AI_REVIEW_CONCURRENCY,
      async (match): Promise<AcceptedMatch | null> => {
        const wantedRequest = wantedRowsById.get(match.wantedRequestId);
        const product = productRowsById.get(match.productId);
        if (!wantedRequest || !product) return null;

        let review: WantedMatchReviewResult;
        try {
          review = await reviewMatch({
            wanted: {
              query: wantedRequest.query,
              description: wantedRequest.description,
              maxPrice: nullableNumber(wantedRequest.max_price),
            },
            product: {
              name: product.name || "Unnamed listing",
              description: product.description,
              price: nullableNumber(product.price),
            },
            scores: {
              semantic: match.semanticScore,
              lexical: match.lexicalScore,
              category: match.categoryScore,
              final: match.finalScore,
            },
          });
        } catch {
          return null;
        }

        if (review.status !== "accepted") return null;

        return {
          ...match,
          decisionSource: "ai_review",
          decisionReason: review.reason,
          reviewConfidence: review.confidence,
          reviewError: null,
        };
      }
    );
    const acceptedMatches = [
      ...automaticMatches,
      ...reviewOutcomes.filter(
        (match): match is AcceptedMatch => match !== null
      ),
    ];

    const finalMatches = rankAcceptedMatches(acceptedMatches);

    let matchesCreated = 0;
    let emailsSent = 0;
    const createdMatchesByRequest = new Map<string, number>();

    for (const match of finalMatches) {
      const requestMatchesCreated =
        createdMatchesByRequest.get(match.wantedRequestId) ?? 0;
      if (
        requestMatchesCreated >= WANTED_MATCH_CONFIG.maxMatchesPerRequest
      ) {
        continue;
      }

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

      matchesCreated += 1;
      createdMatchesByRequest.set(
        match.wantedRequestId,
        requestMatchesCreated + 1
      );

      const wantedRequest = wantedRowsById.get(match.wantedRequestId);
      const product = productRowsById.get(match.productId);
      let emailed = false;
      let emailError: string | null = null;

      try {
        const emailEnabled =
          process.env.WANTED_MATCH_EMAIL_ENABLED !== "false";
        const email = emailEnabled
          ? await getEmailByUserId(supabase, match.userId)
          : null;
        if (emailEnabled && email && product) {
          await sendEmail({
            to: email,
            ...buildWantedRequestEmail({
              wantedQuery: wantedRequest?.query ?? "your wanted item",
              productName: product.name || "New OSUTrade listing",
              productPrice: product.price,
              productUrl: buildProductUrl(product.product_id),
            }),
          });
          emailed = true;
          emailsSent += 1;
        }
      } catch (error) {
        emailError =
          error instanceof Error ? error.message : "Failed to send wanted email.";
      }

      await supabase
        .from("wanted_request_matches")
        .update({
          emailed_at: emailed ? now().toISOString() : null,
          email_error: emailError,
        })
        .eq("match_id", matchRow?.match_id);
    }

    const result: VectorBatchResult = {
      status: "completed",
      productsChecked: productRows.length,
      productsEmbedded: productUpserts.length,
      wantedRequestsChecked: wantedRows.length,
      wantedRequestsEmbedded: wantedUpserts.length,
      matchesCreated,
      emailsSent,
    };

    await updateBatchRun(supabase, runId, {
      status: "completed",
      products_checked: result.productsChecked,
      products_embedded: result.productsEmbedded,
      wanted_requests_checked: result.wantedRequestsChecked,
      wanted_requests_embedded: result.wantedRequestsEmbedded,
      matches_created: result.matchesCreated,
      emails_sent: result.emailsSent,
      finished_at: now().toISOString(),
    });

    return result;
  } catch (error) {
    const message = errorMessage(error);

    await updateBatchRun(supabase, runId, {
      status: "failed",
      error_message: message,
      finished_at: now().toISOString(),
    });

    return {
      status: "failed",
      productsChecked: 0,
      productsEmbedded: 0,
      wantedRequestsChecked: 0,
      wantedRequestsEmbedded: 0,
      matchesCreated: 0,
      emailsSent: 0,
      errorMessage: message,
    };
  }
}
