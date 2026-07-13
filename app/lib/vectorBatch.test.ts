import { describe, expect, test, vi } from "vitest";
import { runVectorMatchBatch } from "./vectorBatch";

function createFakeSupabase({
  duplicateMatch = false,
}: {
  duplicateMatch?: boolean;
} = {}) {
  const state = {
    batchRun: {
      run_id: "run-1",
    },
    products: [
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
    wantedRequests: [
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
  };

  const tableCalls: string[] = [];

  function query(table: string) {
    tableCalls.push(table);
    const builder: any = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      gt: vi.fn(() => builder),
      in: vi.fn(() => builder),
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
          if (duplicateMatch) {
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
                data: { match_id: "match-1" },
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
  test("embeds stale rows, creates semantic matches, and sends email for new matches", async () => {
    const { supabase, state } = createFakeSupabase();
    const embedTexts = vi.fn(async (texts: string[]) =>
      texts.map(() => [1, 0, 0])
    );
    const sendEmail = vi.fn(async () => undefined);

    const result = await runVectorMatchBatch({
      supabase,
      embedTexts,
      sendEmail,
      now: () => new Date("2026-07-13T00:00:00.000Z"),
    });

    expect(result.status).toBe("completed");
    expect(result.productsEmbedded).toBe(1);
    expect(result.wantedRequestsEmbedded).toBe(1);
    expect(result.matchesCreated).toBe(1);
    expect(result.emailsSent).toBe(1);
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
      })
    );
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
});
