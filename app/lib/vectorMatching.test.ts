import { describe, expect, test } from "vitest";
import {
  buildProductEmbeddingInput,
  buildWantedRequestEmbeddingInput,
  contentHash,
  cosineSimilarity,
  findSemanticWantedMatches,
  scoreWantedMatchCandidate,
  shouldEmbed,
  WANTED_MATCH_CONFIG,
  type ProductEmbeddingSource,
  type WantedRequestEmbeddingSource,
} from "./vectorMatching";

const product: ProductEmbeddingSource = {
  product_id: "product-1",
  name: "Acer Monitor",
  name_en: "Acer Computer Monitor",
  name_zh_tw: "Acer Monitor",
  description: "22 inch screen for desk setup",
  description_en: "22 inch screen for desk setup",
  price: 30,
  category: "electronics",
  status: "available",
  quantity: 1,
  seller_id: "seller-1",
};

const wanted: WantedRequestEmbeddingSource = {
  wanted_request_id: "wanted-1",
  user_id: "buyer-1",
  query: "monitor",
  description: "need a screen for my desk",
  max_price: 40,
  category: "electronics",
  email_subscribed: true,
  status: "active",
};

function embeddingWithSimilarity(similarity: number) {
  return [similarity, Math.sqrt(1 - similarity ** 2)];
}

describe("vector matching helpers", () => {
  test("builds semantic-only product input from preferred translated content", () => {
    const input = buildProductEmbeddingInput({
      ...product,
      name: "  Acer   Monitor  ",
      name_en: "acer monitor",
      description: "  22 inch screen for desk setup  ",
      description_en: "22   inch screen for desk setup",
    });

    expect(input).toBe(
      "Name: Acer Monitor\nDescription: 22 inch screen for desk setup"
    );
    expect(input).not.toContain("Category:");
    expect(input).not.toContain("Price:");
  });

  test("deduplicates a wanted description that repeats the normalized query", () => {
    const input = buildWantedRequestEmbeddingInput({
      ...wanted,
      query: "  Computer   Monitor ",
      description: "computer monitor",
    });

    expect(input).toBe("Wanted item: Computer Monitor");
    expect(input).not.toContain("Category:");
    expect(input).not.toContain("Maximum price:");
  });

  test("uses a deterministic content hash to decide whether embedding is stale", () => {
    const hash = contentHash("text-embedding-3-small", "Name: Acer Monitor");

    expect(hash).toBe(contentHash("text-embedding-3-small", "Name: Acer Monitor"));
    expect(hash).not.toBe(contentHash("text-embedding-3-small", "Name: Mini Fridge"));
    expect(shouldEmbed(undefined, hash)).toBe(true);
    expect(shouldEmbed({ content_hash: hash }, hash)).toBe(false);
    expect(shouldEmbed({ content_hash: "old-hash" }, hash)).toBe(true);
  });

  test("computes cosine similarity", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosineSimilarity([1, 1], [1, 1])).toBeCloseTo(1);
  });

  test("finds semantic matches without blocking different categories", () => {
    const matches = findSemanticWantedMatches({
      products: [
        { row: product, embedding: [1, 0] },
        {
          row: { ...product, product_id: "product-2", price: 60 },
          embedding: [1, 0],
        },
        {
          row: { ...product, product_id: "product-3", category: "home" },
          embedding: [1, 0],
        },
      ],
      wantedRequests: [
        { row: wanted, embedding: [0.9, 0.1] },
        {
          row: { ...wanted, wanted_request_id: "wanted-2", user_id: "seller-1" },
          embedding: [1, 0],
        },
        {
          row: { ...wanted, wanted_request_id: "wanted-3", status: "paused" },
          embedding: [1, 0],
        },
      ],
      threshold: 0.78,
    });

    expect(matches.map((match) => match.productId)).toEqual([
      "product-1",
      "product-3",
    ]);
    expect(matches[0].score).toBeGreaterThanOrEqual(0.78);
  });

  test("matches a desk wanted request to a table listing even when categories differ", () => {
    const matches = findSemanticWantedMatches({
      products: [
        {
          row: {
            ...product,
            product_id: "table-1",
            name: "Wooden table",
            category: "home",
            price: 25,
          },
          embedding: [1, 0],
        },
      ],
      wantedRequests: [
        {
          row: {
            ...wanted,
            wanted_request_id: "wanted-desk",
            query: "desk",
            category: "general",
            max_price: 40,
          },
          embedding: [0.95, 0.05],
        },
      ],
      threshold: 0.78,
    });

    expect(matches).toHaveLength(1);
    expect(matches[0].productId).toBe("table-1");
  });

  test("centralizes the hybrid matching configuration", () => {
    expect(WANTED_MATCH_CONFIG).toEqual({
      semanticWeight: 0.75,
      lexicalWeight: 0.2,
      categoryWeight: 0.05,
      minimumSemanticScore: 0.55,
      aiReviewMinimumScore: 0.68,
      automaticAcceptScore: 0.8,
      maxMatchesPerRequest: 3,
      budgetTolerance: 1.1,
    });
  });

  test("scores request-token coverage across product name and description", () => {
    const result = scoreWantedMatchCandidate({
      product: {
        row: {
          ...product,
          name: "Adjustable desk lamp",
          description: "Bright light for reading",
        },
        embedding: [1, 0],
      },
      wantedRequest: {
        row: {
          ...wanted,
          query: "desk reading lamp",
          description: null,
        },
        embedding: [1, 0],
      },
    });

    expect(result.lexicalScore).toBe(1);
    expect(result.semanticScore).toBe(1);
    expect(result.categoryScore).toBe(1);
    expect(result.finalScore).toBe(1);
    expect(result.decision).toBe("accept");
  });

  test("covers a CJK request token contained inside a longer product name", () => {
    const result = scoreWantedMatchCandidate({
      product: {
        row: { ...product, name: "電腦螢幕", description: "" },
        embedding: [1, 0],
      },
      wantedRequest: {
        row: { ...wanted, query: "螢幕", description: null },
        embedding: [1, 0],
      },
    });

    expect(result.lexicalScore).toBe(1);
  });

  test("does not fragment a decomposed combining-mark word into partial tokens", () => {
    const result = scoreWantedMatchCandidate({
      product: {
        row: { ...product, name: "q", description: "" },
        embedding: [1, 0],
      },
      wantedRequest: {
        row: { ...wanted, query: "q\u0301z", description: null },
        embedding: [1, 0],
      },
    });

    expect(result.lexicalScore).toBe(0);
  });

  test("uses category only as a soft boost", () => {
    const shared = {
      product: {
        row: {
          ...product,
          name: "Wooden table",
          description: "",
          category: "home",
        },
        embedding: [1, 0],
      },
      wantedRequest: {
        row: {
          ...wanted,
          query: "desk",
          description: null,
          category: "home",
        },
        embedding: embeddingWithSimilarity(0.8),
      },
    };

    const sameCategory = scoreWantedMatchCandidate(shared);
    const differentCategory = scoreWantedMatchCandidate({
      ...shared,
      wantedRequest: {
        ...shared.wantedRequest,
        row: { ...shared.wantedRequest.row, category: "general" },
      },
    });

    expect(sameCategory.categoryScore).toBe(1);
    expect(differentCategory.categoryScore).toBe(0);
    expect(sameCategory.finalScore - differentCategory.finalScore).toBeCloseTo(
      WANTED_MATCH_CONFIG.categoryWeight
    );
    expect(differentCategory.eligible).toBe(true);
  });

  test("allows exactly ten percent over budget and rejects more", () => {
    const allowed = scoreWantedMatchCandidate({
      product: {
        row: { ...product, price: 110 },
        embedding: [1, 0],
      },
      wantedRequest: {
        row: { ...wanted, max_price: 100 },
        embedding: [1, 0],
      },
    });
    const tooExpensive = scoreWantedMatchCandidate({
      product: {
        row: { ...product, price: 110.01 },
        embedding: [1, 0],
      },
      wantedRequest: {
        row: { ...wanted, max_price: 100 },
        embedding: [1, 0],
      },
    });

    expect(allowed.eligible).toBe(true);
    expect(tooExpensive.eligible).toBe(false);
    expect(tooExpensive.decision).toBe("reject");
  });

  test("rejects self matches and inactive, unsubscribed, or unavailable pairs", () => {
    const cases = [
      {
        product: { ...product, seller_id: wanted.user_id },
        request: wanted,
      },
      {
        product,
        request: { ...wanted, status: "paused" },
      },
      {
        product,
        request: { ...wanted, email_subscribed: false },
      },
      {
        product: { ...product, status: "sold" },
        request: wanted,
      },
      {
        product: { ...product, quantity: 0 },
        request: wanted,
      },
    ];

    for (const item of cases) {
      const result = scoreWantedMatchCandidate({
        product: { row: item.product, embedding: [1, 0] },
        wantedRequest: { row: item.request, embedding: [1, 0] },
      });
      expect(result.eligible).toBe(false);
      expect(result.decision).toBe("reject");
    }
  });

  test("applies semantic minimum and accept, review, and reject bands", () => {
    const scoreAt = (similarity: number, query: string) =>
      scoreWantedMatchCandidate({
        product: {
          row: { ...product, name: "monitor", description: "" },
          embedding: [1, 0],
        },
        wantedRequest: {
          row: { ...wanted, query, description: null, category: "other" },
          embedding: embeddingWithSimilarity(similarity),
        },
      });

    expect(scoreAt(0.54, "monitor").decision).toBe("reject");
    expect(scoreAt(0.65, "unrelated").decision).toBe("reject");
    expect(scoreAt(0.7, "monitor").decision).toBe("review");
    expect(scoreAt(0.85, "monitor").decision).toBe("accept");
  });

  test("ranks every non-rejected candidate for review orchestration", () => {
    const matches = findSemanticWantedMatches({
      products: [0.99, 0.95, 0.9, 0.85, 0.6].map((similarity, index) => ({
        row: {
          ...product,
          product_id: `product-${index + 1}`,
          name: "monitor",
          category: "other",
        },
        embedding: embeddingWithSimilarity(similarity),
      })),
      wantedRequests: [
        {
          row: { ...wanted, query: "monitor", category: "general" },
          embedding: [1, 0],
        },
      ],
    });

    expect(matches).toHaveLength(4);
    expect(matches.map((match) => match.productId)).toEqual([
      "product-1",
      "product-2",
      "product-3",
      "product-4",
    ]);
    expect(matches.every((match) => match.decision !== "reject")).toBe(true);
  });
});
