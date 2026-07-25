import { afterEach, describe, expect, test, vi } from "vitest";
import { runVectorMatchBatch } from "./vectorBatch";

function createFakeSupabase({
  duplicateMatch = false,
  duplicateProductIds = [],
  products,
  wantedRequests,
  productSelectError = null,
}: {
  duplicateMatch?: boolean;
  duplicateProductIds?: string[];
  products?: any[];
  wantedRequests?: any[];
  productSelectError?: unknown;
} = {}) {
  const state = {
    batchRun: {
      run_id: "run-1",
    },
    products: products ?? [
      {
        product_id: "product-1",
        name: "Acer Monitor",
        description: "22 inch screen",
        price: 30,
        category: "electronics",
        status: "available",
        quantity: 1,
        seller_id: "seller-1",
      },
    ],
    wantedRequests: wantedRequests ?? [
      {
        wanted_request_id: "wanted-1",
        user_id: "buyer-1",
        query: "computer screen",
        description: "desk monitor",
        max_price: 40,
        category: "electronics",
        email_subscribed: true,
        status: "active",
      },
    ],
    productEmbeddings: [] as any[],
    wantedRequestEmbeddings: [] as any[],
    matchUpdates: [] as any[],
    runUpdates: [] as any[],
    insertedMatches: [] as any[],
    matchInsertAttempts: [] as any[],
    ranges: [] as Array<{ table: string; from: number; to: number }>,
  };

  const tableCalls: string[] = [];

  function query(table: string) {
    tableCalls.push(table);
    const builder: any = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      gt: vi.fn(() => builder),
      in: vi.fn(() => builder),
      order: vi.fn(() => builder),
      range: vi.fn(async (from: number, to: number) => {
        state.ranges.push({ table, from, to });
        if (table === "products") {
          if (productSelectError) {
            return { data: null, error: productSelectError };
          }
          return { data: state.products.slice(from, to + 1), error: null };
        }
        if (table === "wanted_requests") {
          return { data: state.wantedRequests.slice(from, to + 1), error: null };
        }
        return { data: [], error: null };
      }),
      limit: vi.fn(async () => {
        if (table === "products") return { data: state.products, error: null };
        if (table === "wanted_requests") {
          return { data: state.wantedRequests, error: null };
        }
        return { data: [], error: null };
      }),
      insert: vi.fn((payload) => {
        if (table === "vector_batch_runs") {
          return {
            select: () => ({
              single: async () => ({ data: state.batchRun, error: null }),
            }),
          };
        }

        if (table === "wanted_request_matches") {
          state.matchInsertAttempts.push(payload);
          if (
            duplicateMatch ||
            duplicateProductIds.includes(payload.product_id)
          ) {
            return {
              select: () => ({
                single: async () => ({
                  data: null,
                  error: { code: "23505", message: "duplicate" },
                }),
              }),
            };
          }
          state.insertedMatches.push(payload);
          return {
            select: () => ({
              single: async () => ({
                data: {
                  match_id: `match-${state.insertedMatches.length}`,
                },
                error: null,
              }),
            }),
          };
        }

        return builder;
      }),
      upsert: vi.fn((payload) => {
        if (table === "product_embeddings") {
          state.productEmbeddings.push(...payload);
        }
        if (table === "wanted_request_embeddings") {
          state.wantedRequestEmbeddings.push(...payload);
        }
        return Promise.resolve({ data: payload, error: null });
      }),
      update: vi.fn((payload) => {
        if (table === "wanted_request_matches") {
          state.matchUpdates.push(payload);
        }
        if (table === "vector_batch_runs") {
          state.runUpdates.push(payload);
        }
        return {
          eq: vi.fn(async () => ({ data: null, error: null })),
        };
      }),
      then: (resolve: any) => {
        if (table === "product_embeddings") {
          resolve({ data: state.productEmbeddings, error: null });
          return;
        }
        if (table === "wanted_request_embeddings") {
          resolve({ data: state.wantedRequestEmbeddings, error: null });
          return;
        }
        resolve({ data: [], error: null });
      },
    };
    return builder;
  }

  return {
    supabase: {
      from: vi.fn(query),
      auth: {
        admin: {
          getUserById: vi.fn(async () => ({
            data: { user: { email: "buyer@example.com" } },
            error: null,
          })),
        },
      },
    },
    state,
    tableCalls,
  };
}

describe("runVectorMatchBatch", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("persists hybrid component scores for a high-score match without AI review", async () => {
    const { supabase, state } = createFakeSupabase();
    const embedTexts = vi.fn(async (texts: string[]) =>
      texts.map(() => [1, 0, 0])
    );
    const sendEmail = vi.fn(async () => undefined);
    const reviewMatch = vi.fn();

    const result = await runVectorMatchBatch({
      supabase,
      embedTexts,
      sendEmail,
      reviewMatch,
      batchLimit: 1,
      now: () => new Date("2026-07-13T00:00:00.000Z"),
    });

    expect(result.status).toBe("completed");
    expect(result.productsEmbedded).toBe(1);
    expect(result.wantedRequestsEmbedded).toBe(1);
    expect(result.matchesCreated).toBe(1);
    expect(result.emailsSent).toBe(1);
    expect(state.ranges).toEqual(
      expect.arrayContaining([
        { table: "products", from: 0, to: 0 },
        { table: "products", from: 1, to: 1 },
        { table: "wanted_requests", from: 0, to: 0 },
        { table: "wanted_requests", from: 1, to: 1 },
      ])
    );
    expect(embedTexts).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.stringContaining("Acer Monitor"),
        expect.stringContaining("computer screen"),
      ]),
      "text-embedding-3-small"
    );
    expect(state.productEmbeddings[0]).toEqual(
      expect.objectContaining({
        product_id: "product-1",
        embedding_model: "text-embedding-3-small",
        embedding: [1, 0, 0],
      })
    );
    expect(state.wantedRequestEmbeddings[0]).toEqual(
      expect.objectContaining({
        wanted_request_id: "wanted-1",
        embedding_model: "text-embedding-3-small",
      })
    );
    expect(state.insertedMatches[0]).toEqual(
      expect.objectContaining({
        wanted_request_id: "wanted-1",
        product_id: "product-1",
        score: 0.9,
        semantic_score: 1,
        lexical_score: 0.5,
        category_score: 1,
        decision_source: "hybrid",
        decision_reason: expect.stringContaining("Automatically accepted"),
        review_confidence: null,
        review_error: null,
      })
    );
    expect(reviewMatch).not.toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "buyer@example.com",
        subject: expect.stringContaining("Acer Monitor"),
      })
    );
    expect(state.runUpdates.at(-1)).toEqual(
      expect.objectContaining({
        status: "completed",
        matches_created: 1,
        emails_sent: 1,
      })
    );
  });

  test("reviews only borderline candidates and persists accepted AI metadata", async () => {
    const { supabase, state } = createFakeSupabase({
      products: [
        {
          product_id: "product-review",
          name: "Adjustable study light",
          description: "Flexible task lighting",
          price: "20",
          category: "home",
          status: "available",
          quantity: 1,
          seller_id: "seller-1",
        },
      ],
      wantedRequests: [
        {
          wanted_request_id: "wanted-1",
          user_id: "buyer-1",
          query: "desk lamp",
          description: "lamp for reading",
          max_price: "40",
          category: "electronics",
          email_subscribed: true,
          status: "active",
        },
      ],
    });
    const embedTexts = vi.fn(async (texts: string[]) =>
      texts.map((text) =>
        text.includes("Wanted item") ? [1, 0] : [0.92, 0.39191836]
      )
    );
    const reviewMatch = vi.fn(async () => ({
      status: "accepted" as const,
      relevant: true,
      confidence: 0.91,
      reason: "The product is the requested kind of lamp.",
    }));

    const result = await runVectorMatchBatch({
      supabase,
      embedTexts,
      reviewMatch,
      sendEmail: vi.fn(async () => undefined),
    });

    expect(result.status).toBe("completed");
    expect(reviewMatch).toHaveBeenCalledTimes(1);
    expect(reviewMatch).toHaveBeenCalledWith(
      expect.objectContaining({
        wanted: expect.objectContaining({
          query: "desk lamp",
          maxPrice: 40,
        }),
        product: expect.objectContaining({
          name: "Adjustable study light",
          price: 20,
        }),
        scores: expect.objectContaining({
          semantic: expect.any(Number),
          final: expect.any(Number),
        }),
      })
    );
    expect(state.insertedMatches).toHaveLength(1);
    expect(state.insertedMatches[0]).toEqual(
      expect.objectContaining({
        decision_source: "ai_review",
        decision_reason: "The product is the requested kind of lamp.",
        review_confidence: 0.91,
        review_error: null,
      })
    );
  });

  test.each([
    {
      label: "rejected",
      review: {
        status: "rejected" as const,
        relevant: false,
        confidence: 0.94,
        reason: "The product does not satisfy the request.",
      },
    },
    {
      label: "deferred",
      review: {
        status: "deferred" as const,
        error: "AI match review is temporarily unavailable.",
      },
    },
  ])(
    "does not insert a $label AI candidate and keeps the batch running",
    async ({ review }) => {
      const { supabase, state } = createFakeSupabase({
        products: [
          {
            product_id: "product-review",
            name: "Adjustable study light",
            description: "Flexible task lighting",
            price: 20,
            category: "home",
            status: "available",
            quantity: 1,
            seller_id: "seller-1",
          },
        ],
      });
      const embedTexts = vi.fn(async (texts: string[]) =>
        texts.map((text) =>
          text.includes("Wanted item") ? [1, 0] : [0.92, 0.39191836]
        )
      );

      const result = await runVectorMatchBatch({
        supabase,
        embedTexts,
        reviewMatch: vi.fn(async () => review),
        sendEmail: vi.fn(async () => undefined),
      });

      expect(result.status).toBe("completed");
      expect(result.matchesCreated).toBe(0);
      expect(state.insertedMatches).toHaveLength(0);
    }
  );

  test("isolates an unexpected AI reviewer failure to its candidate", async () => {
    const { supabase, state } = createFakeSupabase({
      products: [
        {
          product_id: "product-review",
          name: "Adjustable study light",
          description: "Flexible task lighting",
          price: 20,
          category: "home",
          status: "available",
          quantity: 1,
          seller_id: "seller-1",
        },
      ],
    });
    const embedTexts = vi.fn(async (texts: string[]) =>
      texts.map((text) =>
        text.includes("Wanted item") ? [1, 0] : [0.92, 0.39191836]
      )
    );

    const result = await runVectorMatchBatch({
      supabase,
      embedTexts,
      reviewMatch: vi.fn(async () => {
        throw new Error("review transport failed");
      }),
      sendEmail: vi.fn(async () => undefined),
    });

    expect(result.status).toBe("completed");
    expect(result.matchesCreated).toBe(0);
    expect(state.insertedMatches).toHaveLength(0);
    expect(state.runUpdates.at(-1)).toEqual(
      expect.objectContaining({ status: "completed" })
    );
  });

  test("ranks final accepted outcomes and keeps only the top three per request", async () => {
    const products = Array.from({ length: 4 }, (_, index) => ({
      product_id: `product-${index + 1}`,
      name: `Computer screen ${index + 1}`,
      description: "desk monitor",
      price: 30,
      category: "electronics",
      status: "available",
      quantity: 1,
      seller_id: `seller-${index + 1}`,
    }));
    const { supabase, state } = createFakeSupabase({ products });
    const embedTexts = vi.fn(async (texts: string[]) =>
      texts.map(() => [1, 0, 0])
    );

    const result = await runVectorMatchBatch({
      supabase,
      embedTexts,
      reviewMatch: vi.fn(),
      sendEmail: vi.fn(async () => undefined),
    });

    expect(result.matchesCreated).toBe(3);
    expect(state.insertedMatches).toHaveLength(3);
    expect(state.insertedMatches.map((match) => match.product_id)).toEqual([
      "product-1",
      "product-2",
      "product-3",
    ]);
  });

  test("does not let a duplicate consume one of three fresh match slots", async () => {
    const products = Array.from({ length: 4 }, (_, index) => ({
      product_id: `product-${index + 1}`,
      name: `Computer screen ${index + 1}`,
      description: "desk monitor",
      price: 30,
      category: "electronics",
      status: "available",
      quantity: 1,
      seller_id: `seller-${index + 1}`,
    }));
    const { supabase, state } = createFakeSupabase({
      products,
      duplicateProductIds: ["product-1"],
    });
    const sendEmail = vi.fn(async () => undefined);

    const result = await runVectorMatchBatch({
      supabase,
      embedTexts: vi.fn(async (texts: string[]) =>
        texts.map(() => [1, 0, 0])
      ),
      reviewMatch: vi.fn(),
      sendEmail,
    });

    expect(state.matchInsertAttempts.map((match) => match.product_id)).toEqual([
      "product-1",
      "product-2",
      "product-3",
      "product-4",
    ]);
    expect(state.insertedMatches.map((match) => match.product_id)).toEqual([
      "product-2",
      "product-3",
      "product-4",
    ]);
    expect(result.matchesCreated).toBe(3);
    expect(result.emailsSent).toBe(3);
    expect(sendEmail).toHaveBeenCalledTimes(3);
  });

  test("persists accepted matches without sending email when rollout email is disabled", async () => {
    vi.stubEnv("WANTED_MATCH_EMAIL_ENABLED", "false");
    const { supabase, state } = createFakeSupabase();
    const sendEmail = vi.fn(async () => undefined);

    const result = await runVectorMatchBatch({
      supabase,
      embedTexts: vi.fn(async (texts: string[]) =>
        texts.map(() => [1, 0, 0])
      ),
      sendEmail,
    });

    expect(result.matchesCreated).toBe(1);
    expect(result.emailsSent).toBe(0);
    expect(state.insertedMatches).toHaveLength(1);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(state.matchUpdates[0]).toEqual(
      expect.objectContaining({
        emailed_at: null,
        email_error: null,
      })
    );
  });

  test.each([
    {
      label: "string",
      error: "embedding provider unavailable",
      expected: "embedding provider unavailable",
    },
    {
      label: "Supabase plain object",
      error: {
        message: "products table unavailable",
        code: "PGRST205",
        details: "relation is missing",
      },
      expected: "products table unavailable",
    },
  ])("preserves a useful $label error message", async ({ error, expected }) => {
    const setup =
      typeof error === "string"
        ? createFakeSupabase()
        : createFakeSupabase({ productSelectError: error });

    const result = await runVectorMatchBatch({
      supabase: setup.supabase,
      embedTexts:
        typeof error === "string"
          ? vi.fn(async () => {
              throw error;
            })
          : vi.fn(),
    });

    expect(result.status).toBe("failed");
    expect(result.errorMessage).toContain(expected);
    expect(setup.state.runUpdates.at(-1)).toEqual(
      expect.objectContaining({
        status: "failed",
        error_message: expect.stringContaining(expected),
      })
    );
  });

  test("skips email when the match already exists", async () => {
    const { supabase } = createFakeSupabase({ duplicateMatch: true });
    const embedTexts = vi.fn(async (texts: string[]) =>
      texts.map(() => [1, 0, 0])
    );
    const sendEmail = vi.fn(async () => undefined);

    const result = await runVectorMatchBatch({
      supabase,
      embedTexts,
      sendEmail,
    });

    expect(result.matchesCreated).toBe(0);
    expect(result.emailsSent).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  test("rejects embedding models that do not fit the 1536-dimension schema", async () => {
    const { supabase } = createFakeSupabase();
    const embedTexts = vi.fn(async (texts: string[]) =>
      texts.map(() => [1, 0, 0])
    );

    const result = await runVectorMatchBatch({
      supabase,
      embedTexts,
      model: "text-embedding-3-large",
    });

    expect(result.status).toBe("failed");
    expect(result.errorMessage).toContain("1536");
    expect(embedTexts).not.toHaveBeenCalled();
  });
});
