import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  buildWantedRequestEmail,
  findWantedRequestMatches,
  normalizeWantedRequestInput,
  notifyMatchingWantedRequests,
} from "./wantedRequests";
import { contentHash } from "./vectorMatching";

const product = {
  product_id: "product-1",
  name: "Acer Computer Monitor",
  name_en: "Acer Computer Monitor",
  name_zh_tw: "電腦螢幕",
  name_zh_cn: "电脑显示器",
  description: "24 inch display with HDMI cable",
  description_en: "24 inch display with HDMI cable",
  description_zh_tw: "24 吋螢幕，附 HDMI 線",
  description_zh_cn: "24 寸显示器，附 HDMI 线",
  price: 30,
  category: "electronics",
};

describe("wanted request matching", () => {
  test("matches products by keyword across translated names and descriptions", () => {
    const matches = findWantedRequestMatches(product, [
      {
        wanted_request_id: "wanted-1",
        user_id: "buyer-1",
        query: "螢幕",
        max_price: 40,
        category: "electronics",
        description: null,
        email_subscribed: true,
        status: "active",
      },
    ]);

    expect(matches).toEqual([
      expect.objectContaining({
        wantedRequestId: "wanted-1",
        userId: "buyer-1",
        score: expect.any(Number),
      }),
    ]);
    expect(matches[0]?.score).toBeGreaterThanOrEqual(2);
  });

  test("does not match inactive, unsubscribed, over-budget, or wrong-category requests", () => {
    const matches = findWantedRequestMatches(product, [
      {
        wanted_request_id: "paused",
        user_id: "buyer-1",
        query: "monitor",
        max_price: 40,
        category: "electronics",
        description: null,
        email_subscribed: true,
        status: "paused",
      },
      {
        wanted_request_id: "unsubscribed",
        user_id: "buyer-2",
        query: "monitor",
        max_price: 40,
        category: "electronics",
        description: null,
        email_subscribed: false,
        status: "active",
      },
      {
        wanted_request_id: "budget",
        user_id: "buyer-3",
        query: "monitor",
        max_price: 20,
        category: "electronics",
        description: null,
        email_subscribed: true,
        status: "active",
      },
      {
        wanted_request_id: "category",
        user_id: "buyer-4",
        query: "monitor",
        max_price: 40,
        category: "books",
        description: null,
        email_subscribed: true,
        status: "active",
      },
    ]);

    expect(matches).toEqual([]);
  });

  test("normalizes form input for API persistence", () => {
    expect(
      normalizeWantedRequestInput({
        query: "  mini fridge  ",
        maxPrice: "85",
        category: " home ",
        description: " Need it before move-in ",
        emailSubscribed: false,
      })
    ).toEqual({
      ok: true,
      values: {
        query: "mini fridge",
        max_price: 85,
        category: "home",
        description: "Need it before move-in",
        email_subscribed: false,
      },
    });
  });

  test("rejects empty query and invalid budgets", () => {
    expect(normalizeWantedRequestInput({ query: "" })).toEqual({
      ok: false,
      message: "Wanted item is required.",
    });
    expect(
      normalizeWantedRequestInput({ query: "bike", maxPrice: "-1" })
    ).toEqual({
      ok: false,
      message: "Budget must be greater than 0.",
    });
  });
});

describe("wanted request email", () => {
  test("builds clear email copy for a matching product", () => {
    const email = buildWantedRequestEmail({
      wantedQuery: "monitor under $40",
      productName: "Acer Computer Monitor",
      productPrice: 30,
      productUrl: "https://osutrade.com/product/product-1",
    });

    expect(email.subject).toBe(
      "[OSUTrade] New listing matches your wanted item: Acer Computer Monitor"
    );
    expect(email.text).toContain("Wanted item: monitor under $40");
    expect(email.text).toContain("Matched listing: Acer Computer Monitor");
    expect(email.text).toContain("Price: $30.00");
    expect(email.text).toContain("https://osutrade.com/product/product-1");
  });
});

function wantedRequest(overrides: Record<string, unknown> = {}) {
  return {
    wanted_request_id: "wanted-1",
    user_id: "buyer-1",
    query: "computer monitor",
    max_price: 50,
    category: "electronics",
    description: "display",
    email_subscribed: true,
    status: "active",
    ...overrides,
  };
}

function immediateSupabase({
  requests = [wantedRequest()],
  productEmbedding = null,
  requestEmbeddings = [],
  duplicate = false,
}: {
  requests?: Array<Record<string, unknown>>;
  productEmbedding?: Record<string, unknown> | null;
  requestEmbeddings?: Array<Record<string, unknown>>;
  duplicate?: boolean;
} = {}) {
  const productEmbeddingUpserts: unknown[] = [];
  const requestEmbeddingUpserts: unknown[] = [];
  const matchInserts: unknown[] = [];
  const matchUpdates: unknown[] = [];

  const from = vi.fn((table: string) => {
    if (table === "wanted_requests") {
      const query = {
        select: vi.fn(),
        eq: vi.fn(),
        then: (
          resolve: (value: { data: unknown[]; error: null }) => unknown
        ) => resolve({ data: requests, error: null }),
      };
      query.select.mockReturnValue(query);
      query.eq.mockReturnValue(query);
      return query;
    }

    if (table === "product_embeddings") {
      const query = {
        select: vi.fn(),
        eq: vi.fn(),
        maybeSingle: vi
          .fn()
          .mockResolvedValue({ data: productEmbedding, error: null }),
        upsert: vi.fn((values: unknown) => {
          productEmbeddingUpserts.push(values);
          return Promise.resolve({ error: null });
        }),
      };
      query.select.mockReturnValue(query);
      query.eq.mockReturnValue(query);
      return query;
    }

    if (table === "wanted_request_embeddings") {
      const query = {
        select: vi.fn(),
        in: vi
          .fn()
          .mockResolvedValue({ data: requestEmbeddings, error: null }),
        upsert: vi.fn((values: unknown) => {
          requestEmbeddingUpserts.push(values);
          return Promise.resolve({ error: null });
        }),
      };
      query.select.mockReturnValue(query);
      return query;
    }

    if (table === "wanted_request_matches") {
      const insertQuery = {
        select: vi.fn(),
        single: vi.fn().mockResolvedValue(
          duplicate
            ? {
                data: null,
                error: { code: "23505", message: "duplicate key" },
              }
            : { data: { match_id: "match-1" }, error: null }
        ),
      };
      insertQuery.select.mockReturnValue(insertQuery);
      const updateQuery = {
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      return {
        insert: vi.fn((values: unknown) => {
          matchInserts.push(values);
          return insertQuery;
        }),
        update: vi.fn((values: unknown) => {
          matchUpdates.push(values);
          return updateQuery;
        }),
      };
    }

    throw new Error(`Unexpected table ${table}`);
  });

  return {
    supabase: {
      from,
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({
            data: { user: { email: "buyer@example.com" } },
            error: null,
          }),
        },
      },
    },
    productEmbeddingUpserts,
    requestEmbeddingUpserts,
    matchInserts,
    matchUpdates,
  };
}

describe("immediate hybrid wanted matching", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  test("automatically accepts a high hybrid score and persists score metadata", async () => {
    const database = immediateSupabase();
    const embedTexts = vi.fn().mockResolvedValue([
      [1, 0],
      [1, 0],
    ]);
    const reviewMatch = vi.fn();
    const sendEmail = vi.fn().mockResolvedValue(undefined);

    const result = await notifyMatchingWantedRequests({
      supabase: database.supabase,
      product: {
        ...product,
        seller_id: "seller-1",
        status: "available",
        quantity: 1,
      },
      embedTexts,
      reviewMatch,
      sendEmail,
      model: "text-embedding-3-small",
    });

    expect(result.matches).toHaveLength(1);
    expect(reviewMatch).not.toHaveBeenCalled();
    expect(database.matchInserts).toEqual([
      expect.objectContaining({
        wanted_request_id: "wanted-1",
        product_id: "product-1",
        semantic_score: 1,
        lexical_score: 1,
        category_score: 1,
        decision_source: "hybrid",
        decision_reason: "Automatically accepted by hybrid score.",
        review_confidence: null,
        review_error: null,
      }),
    ]);
    expect(sendEmail).toHaveBeenCalledOnce();
  });

  test.each([
    ["accepted", 0.9, 1],
    ["rejected", 0.95, 0],
    ["deferred", null, 0],
  ] as const)(
    "handles a borderline AI review result: %s",
    async (status, confidence, expectedMatches) => {
      const database = immediateSupabase();
      const embedTexts = vi.fn().mockResolvedValue([
        [1, 0],
        [0.65, Math.sqrt(1 - 0.65 ** 2)],
      ]);
      const reviewMatch = vi.fn().mockResolvedValue({
        status,
        confidence,
        reason:
          status === "accepted"
            ? "The listing is the requested lamp."
            : "Not accepted.",
        error: status === "deferred" ? "review timeout" : null,
      });

      const result = await notifyMatchingWantedRequests({
        supabase: database.supabase,
        product: {
          ...product,
          seller_id: "seller-1",
          status: "available",
          quantity: 1,
        },
        embedTexts,
        reviewMatch,
        sendEmail: vi.fn(),
        model: "text-embedding-3-small",
      });

      expect(reviewMatch).toHaveBeenCalledOnce();
      expect(result.matches).toHaveLength(expectedMatches);
      if (status === "accepted") {
        expect(database.matchInserts[0]).toEqual(
          expect.objectContaining({
            decision_source: "ai_review",
            decision_reason: "The listing is the requested lamp.",
            review_confidence: 0.9,
          })
        );
      } else {
        expect(database.matchInserts).toEqual([]);
      }
    }
  );

  test("returns safely without a match when embedding generation fails", async () => {
    const database = immediateSupabase();

    await expect(
      notifyMatchingWantedRequests({
        supabase: database.supabase,
        product: {
          ...product,
          seller_id: "seller-1",
          status: "available",
          quantity: 1,
        },
        embedTexts: vi.fn().mockRejectedValue(new Error("OpenAI unavailable")),
        reviewMatch: vi.fn(),
        sendEmail: vi.fn(),
      })
    ).resolves.toEqual({ matches: [] });

    expect(database.matchInserts).toEqual([]);
  });

  test("rejects an unsupported embedding model before calling OpenAI", async () => {
    const database = immediateSupabase();
    const embedTexts = vi.fn();

    await expect(
      notifyMatchingWantedRequests({
        supabase: database.supabase,
        product: {
          ...product,
          seller_id: "seller-1",
          status: "available",
          quantity: 1,
        },
        embedTexts,
        reviewMatch: vi.fn(),
        sendEmail: vi.fn(),
        model: "text-embedding-3-large",
      })
    ).resolves.toEqual({ matches: [] });

    expect(embedTexts).not.toHaveBeenCalled();
    expect(database.productEmbeddingUpserts).toEqual([]);
    expect(database.requestEmbeddingUpserts).toEqual([]);
  });

  test("reuses a valid request embedding and only embeds the new product", async () => {
    const requestInput = "Wanted item: computer monitor\nDescription: display";
    const database = immediateSupabase({
      requestEmbeddings: [
        {
          wanted_request_id: "wanted-1",
          embedding: [1, 0],
          content_hash: contentHash(
            "text-embedding-3-small",
            requestInput
          ),
          embedding_model: "text-embedding-3-small",
          embedding_input: requestInput,
        },
      ],
    });
    const embedTexts = vi.fn().mockResolvedValue([[1, 0]]);

    await notifyMatchingWantedRequests({
      supabase: database.supabase,
      product: {
        ...product,
        seller_id: "seller-1",
        status: "available",
        quantity: 1,
      },
      embedTexts,
      reviewMatch: vi.fn(),
      sendEmail: vi.fn(),
      model: "text-embedding-3-small",
    });

    expect(embedTexts).toHaveBeenCalledWith(
      [expect.stringContaining("Name: Acer Computer Monitor")],
      "text-embedding-3-small"
    );
  });

  test("refreshes a product embedding when the hash matches but the vector is empty", async () => {
    const productInput =
      "Name: Acer Computer Monitor\nDescription: 24 inch display with HDMI cable";
    const requestInput = "Wanted item: computer monitor\nDescription: display";
    const database = immediateSupabase({
      productEmbedding: {
        product_id: "product-1",
        embedding: null,
        content_hash: contentHash("text-embedding-3-small", productInput),
      },
      requestEmbeddings: [
        {
          wanted_request_id: "wanted-1",
          embedding: [1, 0],
          content_hash: contentHash("text-embedding-3-small", requestInput),
        },
      ],
    });
    const embedTexts = vi.fn().mockResolvedValue([[1, 0]]);

    await notifyMatchingWantedRequests({
      supabase: database.supabase,
      product: {
        ...product,
        seller_id: "seller-1",
        status: "available",
        quantity: 1,
      },
      embedTexts,
      reviewMatch: vi.fn(),
      sendEmail: vi.fn(),
    });

    expect(embedTexts).toHaveBeenCalledWith(
      [productInput],
      "text-embedding-3-small"
    );
    expect(database.productEmbeddingUpserts).toEqual([
      expect.objectContaining({
        product_id: "product-1",
        embedding: [1, 0],
      }),
    ]);
  });

  test("refreshes a request embedding when the hash matches but the vector is empty", async () => {
    const productInput =
      "Name: Acer Computer Monitor\nDescription: 24 inch display with HDMI cable";
    const requestInput = "Wanted item: computer monitor\nDescription: display";
    const database = immediateSupabase({
      productEmbedding: {
        product_id: "product-1",
        embedding: [1, 0],
        content_hash: contentHash("text-embedding-3-small", productInput),
      },
      requestEmbeddings: [
        {
          wanted_request_id: "wanted-1",
          embedding: "[]",
          content_hash: contentHash("text-embedding-3-small", requestInput),
        },
      ],
    });
    const embedTexts = vi.fn().mockResolvedValue([[1, 0]]);

    await notifyMatchingWantedRequests({
      supabase: database.supabase,
      product: {
        ...product,
        seller_id: "seller-1",
        status: "available",
        quantity: 1,
      },
      embedTexts,
      reviewMatch: vi.fn(),
      sendEmail: vi.fn(),
    });

    expect(embedTexts).toHaveBeenCalledWith(
      [requestInput],
      "text-embedding-3-small"
    );
    expect(database.requestEmbeddingUpserts).toEqual([
      [
        expect.objectContaining({
          wanted_request_id: "wanted-1",
          embedding: [1, 0],
        }),
      ],
    ]);
  });

  test("bounds stale request embedding refreshes in the immediate flow", async () => {
    const requests = Array.from({ length: 30 }, (_, index) =>
      wantedRequest({
        wanted_request_id: `wanted-${index + 1}`,
        user_id: `buyer-${index + 1}`,
      })
    );
    const database = immediateSupabase({ requests });
    const embedTexts = vi.fn().mockImplementation(async (inputs: string[]) =>
      inputs.map(() => [1, 0])
    );

    await notifyMatchingWantedRequests({
      supabase: database.supabase,
      product: {
        ...product,
        seller_id: "seller-1",
        status: "available",
        quantity: 1,
      },
      embedTexts,
      reviewMatch: vi.fn(),
      sendEmail: vi.fn(),
    });

    expect(embedTexts).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.stringContaining("Name: Acer Computer Monitor"),
      ]),
      "text-embedding-3-small"
    );
    expect(embedTexts.mock.calls[0][0]).toHaveLength(25);
    expect(database.requestEmbeddingUpserts).toEqual([
      expect.arrayContaining([
        expect.objectContaining({ wanted_request_id: "wanted-1" }),
      ]),
    ]);
    expect(database.requestEmbeddingUpserts[0]).toHaveLength(24);
  });

  test("does not email when matching email rollout is disabled", async () => {
    vi.stubEnv("WANTED_MATCH_EMAIL_ENABLED", "false");
    const database = immediateSupabase();
    const sendEmail = vi.fn();

    const result = await notifyMatchingWantedRequests({
      supabase: database.supabase,
      product: {
        ...product,
        seller_id: "seller-1",
        status: "available",
        quantity: 1,
      },
      embedTexts: vi.fn().mockResolvedValue([
        [1, 0],
        [1, 0],
      ]),
      reviewMatch: vi.fn(),
      sendEmail,
    });

    expect(result.matches).toEqual([
      expect.objectContaining({ emailed: false, emailError: null }),
    ]);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  test("treats an existing match as a safe duplicate", async () => {
    const database = immediateSupabase({ duplicate: true });
    const sendEmail = vi.fn();

    const result = await notifyMatchingWantedRequests({
      supabase: database.supabase,
      product: {
        ...product,
        seller_id: "seller-1",
        status: "available",
        quantity: 1,
      },
      embedTexts: vi.fn().mockResolvedValue([
        [1, 0],
        [1, 0],
      ]),
      reviewMatch: vi.fn(),
      sendEmail,
    });

    expect(result).toEqual({ matches: [] });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  test("reviews multiple borderline candidates concurrently", async () => {
    const database = immediateSupabase({
      requests: [
        wantedRequest(),
        wantedRequest({
          wanted_request_id: "wanted-2",
          user_id: "buyer-2",
        }),
      ],
    });
    let releaseReviews: (() => void) | undefined;
    const reviewGate = new Promise<void>((resolve) => {
      releaseReviews = resolve;
    });
    const reviewMatch = vi.fn(async () => {
      await reviewGate;
      return {
        status: "rejected" as const,
        relevant: false,
        confidence: 0.9,
        reason: "Not relevant.",
      };
    });

    const pending = notifyMatchingWantedRequests({
      supabase: database.supabase,
      product: {
        ...product,
        seller_id: "seller-1",
        status: "available",
        quantity: 1,
      },
      embedTexts: vi.fn().mockResolvedValue([
        [1, 0],
        [0.65, Math.sqrt(1 - 0.65 ** 2)],
        [0.65, Math.sqrt(1 - 0.65 ** 2)],
      ]),
      reviewMatch,
      sendEmail: vi.fn(),
    });

    await vi.waitFor(() => {
      expect(reviewMatch).toHaveBeenCalledTimes(2);
    });
    releaseReviews?.();
    await pending;
  });

  test("caps immediate AI reviews and defers lower-ranked candidates", async () => {
    const requests = Array.from({ length: 8 }, (_, index) =>
      wantedRequest({
        wanted_request_id: `wanted-${index + 1}`,
        user_id: `buyer-${index + 1}`,
      })
    );
    const database = immediateSupabase({ requests });
    const borderlineEmbedding = [
      0.65,
      Math.sqrt(1 - 0.65 ** 2),
    ];
    const reviewMatch = vi.fn().mockResolvedValue({
      status: "rejected",
      relevant: false,
      confidence: 0.95,
      reason: "Not relevant.",
    });

    await notifyMatchingWantedRequests({
      supabase: database.supabase,
      product: {
        ...product,
        seller_id: "seller-1",
        status: "available",
        quantity: 1,
      },
      embedTexts: vi.fn().mockResolvedValue([
        [1, 0],
        ...requests.map(() => borderlineEmbedding),
      ]),
      reviewMatch,
      sendEmail: vi.fn(),
    });

    expect(reviewMatch).toHaveBeenCalledTimes(6);
  });
});
