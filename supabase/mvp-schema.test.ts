import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("product-images bucket schema", () => {
  test("enforces image size and MIME restrictions in Supabase Storage", () => {
    const schema = readFileSync("supabase/mvp-schema.sql", "utf8");

    expect(schema).toContain("file_size_limit");
    expect(schema).toContain("5242880");
    expect(schema).toContain("allowed_mime_types");
    expect(schema).toContain("image/jpeg");
    expect(schema).toContain("image/png");
    expect(schema).toContain("image/webp");
  });
});
