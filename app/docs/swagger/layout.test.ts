import { describe, expect, it } from "vitest";
import { metadata } from "./layout";

describe("Swagger docs metadata", () => {
  it("prevents search engines from indexing or following Swagger docs", () => {
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: false,
    });
  });
});
