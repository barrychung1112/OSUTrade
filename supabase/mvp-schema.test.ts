import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("product-images bucket schema", () => {
  test("enforces image size and MIME restrictions in Supabase Storage", () => {
    const schema = readFileSync("supabase/mvp-schema.sql", "utf8");

    expect(schema).toContain("file_size_limit");
    expect(schema).toContain("10485760");
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
    expect(schema).toContain("add column if not exists semantic_score numeric");
    expect(schema).toContain("add column if not exists lexical_score numeric");
    expect(schema).toContain("add column if not exists category_score numeric");
    expect(schema).toContain("add column if not exists decision_source text");
    expect(schema).toContain("add column if not exists decision_reason text");
    expect(schema).toContain("add column if not exists review_confidence numeric");
    expect(schema).toContain("add column if not exists review_error text");
    expect(schema).toMatch(
      /create table if not exists public\.product_embeddings \(\s*product_id uuid primary key/
    );
    expect(schema).toMatch(
      /if[\s\S]*product_embeddings[\s\S]*data_type\s*=\s*'text'[\s\S]*alter column product_id type uuid[\s\S]*using product_id::uuid/i
    );
    expect(schema).toMatch(
      /data_type\s*=\s*'text'[\s\S]*delete from public\.product_embeddings[\s\S]*product_id\s*!~\*[\s\S]*not exists[\s\S]*public\.products[\s\S]*alter column product_id type uuid/i
    );
    expect(schema).toMatch(
      /drop constraint if exists product_embeddings_product_id_fkey[\s\S]*add constraint product_embeddings_product_id_fkey[\s\S]*foreign key \(product_id\)[\s\S]*references public\.products\(product_id\)[\s\S]*on delete cascade/i
    );
    expect(schema).toMatch(/unique[\s\S]*wanted_request_id[\s\S]*product_id/i);
    expect(schema).toContain("email_subscribed boolean not null default true");
    expect(schema).toContain("email_error text");
  });
});

describe("vector matching schema", () => {
  test("stores product and wanted request embeddings for nightly matching", () => {
    const schema = readFileSync("supabase/mvp-schema.sql", "utf8");

    expect(schema).toContain("create extension if not exists vector");
    expect(schema).toContain("create table if not exists public.product_embeddings");
    expect(schema).toContain(
      "create table if not exists public.wanted_request_embeddings"
    );
    expect(schema).toContain("create table if not exists public.vector_batch_runs");
    expect(schema).toContain("embedding_model text not null");
    expect(schema).toContain("embedding_input text not null");
    expect(schema).toContain("content_hash text not null");
    expect(schema).toContain("extensions.vector(1536)");
    expect(schema).toMatch(/product_embeddings_embedding_idx[\s\S]*ivfflat/i);
    expect(schema).toMatch(/wanted_request_embeddings_embedding_idx[\s\S]*ivfflat/i);
    expect(schema).toContain("matches_created integer not null default 0");
    expect(schema).toContain("emails_sent integer not null default 0");
  });
});
