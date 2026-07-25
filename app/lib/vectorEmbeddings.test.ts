import { describe, expect, test } from "vitest";

import { parseEmbedding } from "./vectorEmbeddings";

describe("parseEmbedding", () => {
  test("treats an empty pgvector value as missing", () => {
    expect(parseEmbedding("[]")).toEqual([]);
    expect(parseEmbedding("[   ]")).toEqual([]);
  });
});
