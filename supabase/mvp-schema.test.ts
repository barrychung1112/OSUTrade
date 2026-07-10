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

describe("product listing idempotency schema", () => {
  test("stores one client request ID per seller", () => {
    const schema = readFileSync("supabase/mvp-schema.sql", "utf8");

    expect(schema).toContain("client_request_id");
    expect(schema).toMatch(/unique index[\s\S]*seller_id[\s\S]*client_request_id/i);
  });
});

describe("wanted request subscription schema", () => {
  test("stores wanted requests and prevents duplicate product match notifications", () => {
    const schema = readFileSync("supabase/mvp-schema.sql", "utf8");

    expect(schema).toContain("create table if not exists public.wanted_requests");
    expect(schema).toContain("create table if not exists public.wanted_request_matches");
    expect(schema).toMatch(/unique[\s\S]*wanted_request_id[\s\S]*product_id/i);
    expect(schema).toContain("email_subscribed boolean not null default true");
    expect(schema).toContain("email_error text");
  });
});
