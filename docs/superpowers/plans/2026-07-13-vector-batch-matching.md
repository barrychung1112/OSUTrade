# Vector Batch Matching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a nightly vector batch pipeline that embeds products and wanted requests, creates deduped semantic matches, and sends wanted-item email notifications.

**Architecture:** Use Supabase `pgvector` tables for product and wanted-request embeddings, with batch status recorded in `vector_batch_runs`. A cron-protected Next.js API route runs a small batch: generate missing/stale embeddings, compare active subscribed wanted requests to available products, insert new `wanted_request_matches`, and email only newly inserted matches.

**Tech Stack:** Next.js App Router, Supabase service-role client, Postgres `pgvector`, OpenAI embeddings REST API, Vitest.

---

### Task 1: Schema Support

**Files:**
- Modify: `supabase/mvp-schema.sql`
- Modify: `supabase/mvp-schema.test.ts`

- [x] **Step 1: Write failing schema test**

Add a test that expects `vector`, `product_embeddings`, `wanted_request_embeddings`, `vector_batch_runs`, content hashes, model names, and vector indexes in `supabase/mvp-schema.sql`.

- [x] **Step 2: Run schema test to verify RED**

Run: `npm.cmd test -- supabase/mvp-schema.test.ts`

Expected: FAIL because the schema has no vector tables yet.

- [x] **Step 3: Implement schema**

Add `create extension if not exists vector with schema extensions;`, embedding tables with `extensions.vector(1536)`, `embedding_model`, `embedding_input`, `content_hash`, `embedded_at`, and a `vector_batch_runs` table. Add ivfflat vector indexes and keep existing `wanted_request_matches` unique dedupe.

- [x] **Step 4: Run schema test to verify GREEN**

Run: `npm.cmd test -- supabase/mvp-schema.test.ts`

Expected: PASS.

### Task 2: Embedding and Matching Library

**Files:**
- Create: `app/lib/vectorMatching.ts`
- Create: `app/lib/vectorMatching.test.ts`

- [x] **Step 1: Write failing library tests**

Cover text composition, content hash stability, stale embedding detection, similarity threshold filtering, category/price guardrails, and dedupe-safe match payloads.

- [x] **Step 2: Run tests to verify RED**

Run: `npm.cmd test -- app/lib/vectorMatching.test.ts`

Expected: FAIL because `app/lib/vectorMatching.ts` does not exist.

- [x] **Step 3: Implement library**

Create pure helpers for `buildProductEmbeddingInput`, `buildWantedRequestEmbeddingInput`, `contentHash`, `cosineSimilarity`, `shouldEmbed`, and `findSemanticWantedMatches`.

- [x] **Step 4: Run tests to verify GREEN**

Run: `npm.cmd test -- app/lib/vectorMatching.test.ts`

Expected: PASS.

### Task 3: Nightly Batch Runner and Cron API

**Files:**
- Create: `app/lib/vectorBatch.ts`
- Create: `app/lib/vectorBatch.test.ts`
- Create: `app/api/cron/vector-match/route.ts`
- Create: `app/api/cron/vector-match/route.test.ts`

- [x] **Step 1: Write failing batch tests**

Test that missing embeddings are generated, vector rows are upserted, new matches insert into `wanted_request_matches`, duplicate matches are skipped, and email is sent only for newly inserted matches.

- [x] **Step 2: Write failing route tests**

Test that the cron route rejects missing/wrong bearer token and calls the batch runner with an admin client when `Authorization: Bearer ${CRON_SECRET}` is valid.

- [x] **Step 3: Run tests to verify RED**

Run: `npm.cmd test -- app/lib/vectorBatch.test.ts app/api/cron/vector-match/route.test.ts`

Expected: FAIL because files do not exist.

- [x] **Step 4: Implement batch runner and route**

Implement `runVectorMatchBatch` with injectable `embedTexts` and `sendEmail` for tests. The default embedder calls OpenAI `/v1/embeddings` with `OPENAI_API_KEY`, default model `text-embedding-3-small`, optional `OPENAI_EMBEDDING_MODEL`, and returns numeric vectors. The route uses `CRON_SECRET` and returns the batch summary.

- [x] **Step 5: Run tests to verify GREEN**

Run: `npm.cmd test -- app/lib/vectorBatch.test.ts app/api/cron/vector-match/route.test.ts`

Expected: PASS.

### Task 4: Final Verification

**Files:**
- All changed files.

- [ ] **Step 1: Run focused tests**

Run: `npm.cmd test -- supabase/mvp-schema.test.ts app/lib/vectorMatching.test.ts app/lib/vectorBatch.test.ts app/api/cron/vector-match/route.test.ts app/lib/wantedRequests.test.ts`

Expected: PASS.

- [ ] **Step 2: Run TypeScript**

Run: `npx.cmd tsc --noEmit`

Expected: PASS.

- [ ] **Step 3: Run production build**

Run: `npm.cmd run build`

Expected: PASS, with only existing non-blocking warnings if present.
