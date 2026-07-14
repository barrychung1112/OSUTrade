import { describe, expect, test } from "vitest";
import {
  buildProductEmbeddingInput,
  buildWantedRequestEmbeddingInput,
  contentHash,
  cosineSimilarity,
  findSemanticWantedMatches,
  shouldEmbed,
  type ProductEmbeddingSource,
  type WantedRequestEmbeddingSource,
} from "./vectorMatching";

const product: ProductEmbeddingSource = {
  product_id: "product-1",
  name: "Acer Monitor",
  name_en: "Acer Computer Monitor",
  name_zh_tw: "電腦螢幕",
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

describe("vector matching helpers", () => {
  test("builds stable embedding input from product listing content", () => {
    const input = buildProductEmbeddingInput(product);

    expect(input).toContain("Name: Acer Monitor");
    expect(input).toContain("English name: Acer Computer Monitor");
    expect(input).toContain("Traditional Chinese name: 電腦螢幕");
    expect(input).toContain("Description: 22 inch screen for desk setup");
    expect(input).toContain("Category: electronics");
    expect(input).toContain("Price: 30");
  });

  test("builds wanted request embedding input from buyer intent", () => {
    const input = buildWantedRequestEmbeddingInput(wanted);

    expect(input).toContain("Wanted item: monitor");
    expect(input).toContain("Description: need a screen for my desk");
    expect(input).toContain("Category: electronics");
    expect(input).toContain("Maximum price: 40");
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
        {
          row: product,
          embedding: [1, 0],
        },
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
        {
          row: wanted,
          embedding: [0.9, 0.1],
        },
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

    expect(matches).toEqual([
      {
        wantedRequestId: "wanted-1",
        userId: "buyer-1",
        productId: "product-1",
        score: expect.any(Number),
      },
      {
        wantedRequestId: "wanted-1",
        userId: "buyer-1",
        productId: "product-3",
        score: expect.any(Number),
      },
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

    expect(matches).toEqual([
      {
        wantedRequestId: "wanted-desk",
        userId: "buyer-1",
        productId: "table-1",
        score: expect.any(Number),
      },
    ]);
  });
});
