# Hybrid Wanted-Request Matching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace inconsistent keyword and vector matching with one hybrid scorer and use structured AI review only for borderline candidates.

**Architecture:** Pure helpers in `vectorMatching.ts` build semantic inputs, apply guardrails, score candidates, and rank the top three. `wantedMatchReview.ts` provides an injected structured-output reviewer. The nightly batch and immediate publish workflow orchestrate embeddings, review, persistence, and email through the same decision functions.

**Tech Stack:** Next.js 15, TypeScript, Vitest, Supabase, pgvector, OpenAI Responses API.

---

### Task 1: Pure hybrid scoring

**Files:**
- Modify: `app/lib/vectorMatching.ts`
- Modify: `app/lib/vectorMatching.test.ts`

- [ ] **Step 1: Write failing embedding-input tests**

Add tests proving that product/request embedding input excludes price and
category and deduplicates normalized translation values.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
npm.cmd test -- --run app/lib/vectorMatching.test.ts
```

Expected: failures because current inputs contain `Category:` and `Price:`.

- [ ] **Step 3: Implement semantic input cleanup**

Select the first non-empty normalized name and description, deduplicate equal
values, and build semantic-only inputs.

- [ ] **Step 4: Write failing hybrid-score tests**

Cover lexical token coverage, category soft boost, 10% budget tolerance,
self-match prevention, low-semantic rejection, high/borderline/low bands, and
Top 3 ranking per wanted request.

- [ ] **Step 5: Run tests and verify RED**

Expected: failures because component scores and decision bands do not exist.

- [ ] **Step 6: Implement the pure scorer**

Add centralized constants:

```ts
export const WANTED_MATCH_CONFIG = {
  semanticWeight: 0.75,
  lexicalWeight: 0.2,
  categoryWeight: 0.05,
  minimumSemanticScore: 0.55,
  aiReviewMinimumScore: 0.68,
  automaticAcceptScore: 0.8,
  maxMatchesPerRequest: 3,
  budgetTolerance: 1.1,
} as const;
```

Return component scores, final score, and `accept | review | reject`. Keep
category as a boost only.

- [ ] **Step 7: Run tests and commit**

```powershell
npm.cmd test -- --run app/lib/vectorMatching.test.ts
git add app/lib/vectorMatching.ts app/lib/vectorMatching.test.ts
git commit -m "feat: add hybrid wanted match scoring"
```

### Task 2: Structured AI review

**Files:**
- Create: `app/lib/wantedMatchReview.ts`
- Create: `app/lib/wantedMatchReview.test.ts`

- [ ] **Step 1: Write failing reviewer tests**

Cover valid relevant output, relevant output below `0.75` confidence, explicit
rejection, missing API key, non-200 response, invalid JSON, and timeout/fetch
failure. The public result must distinguish `accepted`, `rejected`, and
`deferred`.

- [ ] **Step 2: Run tests and verify RED**

```powershell
npm.cmd test -- --run app/lib/wantedMatchReview.test.ts
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement the reviewer**

Call `POST https://api.openai.com/v1/responses` with model
`OPENAI_MATCH_REVIEW_MODEL || "gpt-4.1-mini"` and strict JSON schema:

```json
{
  "relevant": true,
  "confidence": 0.87,
  "reason": "The listing is the requested item."
}
```

Use an abort timeout and return `deferred` with a sanitized error for transport
or parsing failures. Never throw for one candidate.

- [ ] **Step 4: Run tests and commit**

```powershell
npm.cmd test -- --run app/lib/wantedMatchReview.test.ts
git add app/lib/wantedMatchReview.ts app/lib/wantedMatchReview.test.ts
git commit -m "feat: review borderline wanted matches"
```

### Task 3: Nightly batch integration

**Files:**
- Modify: `app/lib/vectorBatch.ts`
- Modify: `app/lib/vectorBatch.test.ts`

- [ ] **Step 1: Write failing batch tests**

Prove that the batch:

- persists score components and `hybrid` for high-score matches;
- calls AI only for borderline candidates;
- persists `ai_review`, confidence, and reason for accepted reviews;
- does not insert rejected/deferred candidates;
- limits accepted matches to Top 3 per wanted request;
- suppresses email when `WANTED_MATCH_EMAIL_ENABLED=false`;
- preserves underlying plain-object error messages.

- [ ] **Step 2: Run tests and verify RED**

```powershell
npm.cmd test -- --run app/lib/vectorBatch.test.ts
```

- [ ] **Step 3: Implement batch orchestration**

Inject `reviewMatch`, apply the shared hybrid decisions, review only borderline
candidates, rank accepted results, persist metadata, and send email only when
the rollout flag is not `"false"`.

- [ ] **Step 4: Run tests and commit**

```powershell
npm.cmd test -- --run app/lib/vectorBatch.test.ts
git add app/lib/vectorBatch.ts app/lib/vectorBatch.test.ts
git commit -m "feat: use hybrid scoring in vector batch"
```

### Task 4: Immediate publish integration and schema

**Files:**
- Modify: `app/lib/wantedRequests.ts`
- Modify: `app/lib/wantedRequests.test.ts`
- Modify: `app/api/products/route.test.ts`
- Modify: `supabase/mvp-schema.sql`

- [ ] **Step 1: Write failing immediate-flow tests**

Prove that immediate matching uses the same hybrid scorer and AI bands as the
batch, embeds only the new product/request rows, honors Top 3 and the email
flag, and returns without throwing when embedding or review fails.

- [ ] **Step 2: Run tests and verify RED**

```powershell
npm.cmd test -- --run app/lib/wantedRequests.test.ts app/api/products/route.test.ts
```

- [ ] **Step 3: Implement immediate orchestration**

Reuse the embedding API and shared decision functions. Keep
`safeNotifyMatchingWantedRequests()` non-blocking from the product-creation
perspective. Do not restore category hard filtering.

- [ ] **Step 4: Add additive schema columns**

Add idempotent columns to `wanted_request_matches`:

```sql
semantic_score numeric,
lexical_score numeric,
category_score numeric,
decision_source text,
decision_reason text,
review_confidence numeric,
review_error text
```

Also correct `product_embeddings.product_id` to `uuid` in the canonical create
statement so fresh deployments match `public.products(product_id)`.

- [ ] **Step 5: Run focused and full verification**

```powershell
npm.cmd test -- --run app/lib/vectorMatching.test.ts app/lib/wantedMatchReview.test.ts app/lib/vectorBatch.test.ts app/lib/wantedRequests.test.ts app/api/products/route.test.ts
npm.cmd test -- --run
npx.cmd tsc --noEmit
npm.cmd run build
git diff --check
```

- [ ] **Step 6: Commit**

```powershell
git add app/lib/wantedRequests.ts app/lib/wantedRequests.test.ts app/api/products/route.test.ts supabase/mvp-schema.sql
git commit -m "feat: unify immediate wanted matching"
```

### Task 5: Final review and deployment handoff

**Files:**
- Modify if review requires: files above

- [ ] **Step 1: Review spec compliance**

Compare implementation line by line with
`docs/superpowers/specs/2026-07-23-hybrid-wanted-matching-design.md`.

- [ ] **Step 2: Review code quality**

Check error isolation, OpenAI payload validation, Supabase compatibility,
duplicate-email prevention, secret handling, and test quality.

- [ ] **Step 3: Re-run final verification**

```powershell
npm.cmd test -- --run
npx.cmd tsc --noEmit
npm.cmd run build
git diff --check
git status --short
```

- [ ] **Step 4: Prepare rollout instructions**

Provide the additive production SQL, Vercel environment variables
`OPENAI_MATCH_REVIEW_MODEL` and `WANTED_MATCH_EMAIL_ENABLED`, shadow-run command,
validation queries, enablement step, and rollback procedure.
