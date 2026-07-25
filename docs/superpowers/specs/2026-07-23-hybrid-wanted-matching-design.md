# Hybrid Wanted-Request Matching Design

## Goal

Improve wanted-request matching precision and recall by replacing the two
inconsistent matching paths with one shared hybrid matcher. Semantic similarity
remains the primary signal, deterministic text and category signals refine the
ranking, and an AI reviewer handles only ambiguous candidates before email is
sent.

## Scope

This change covers:

- immediate matching after a product is published;
- nightly vector batch matching;
- shared candidate scoring and ranking;
- AI review for borderline candidates;
- match decision metadata and email deduplication.

This change does not add Marketplace semantic search, change the wanted-request
UI, or translate notification emails.

## Current Problems

The current implementation has two different decision systems:

- `notifyMatchingWantedRequests()` uses substring matching, a category hard
  filter, and a strict budget cap;
- `runVectorMatchBatch()` uses cosine similarity, no category hard filter, a
  15% budget tolerance, and a fixed `0.78` threshold.

The embedding input also mixes semantic content with price and category and
repeats translated versions of the same content. These differences make the
same product-request pair behave differently depending on when it is checked.

## Architecture

Both immediate and nightly flows call one shared hybrid matching service.

```text
Product + active subscribed wanted requests
                  |
                  v
       Deterministic guardrails
                  |
                  v
         Embedding availability
                  |
                  v
       Hybrid candidate scoring
                  |
       +----------+-----------+
       |          |           |
     high      borderline     low
       |          |           |
 auto-accept   AI review    reject
       |          |
       +-----+----+
             |
      rank and keep Top 3
             |
       insert match + email
```

The shared service is responsible only for matching decisions. Database reads,
embedding generation, match persistence, and email delivery remain orchestration
responsibilities of the immediate and batch workflows.

## Embedding Inputs

Product embeddings include:

- one preferred non-empty product name;
- one preferred non-empty product description.

Wanted-request embeddings include:

- the requested item query;
- the optional request description.

Price and category are excluded because they are structured decision signals,
not semantic meaning. Translated fields are deduplicated after normalization so
the same meaning is not repeated three times. The preferred value order is the
original field, English, Traditional Chinese, then Simplified Chinese.

Changing the input format changes the content hash and causes the next batch to
regenerate affected embeddings automatically.

## Guardrails

A pair is ineligible when any of these conditions is true:

- the wanted request is not active;
- email subscription is disabled;
- the product is unavailable or has no inventory;
- the buyer is also the seller;
- the product price exceeds the wanted maximum price by more than 10%.

Category is never a hard filter.

## Hybrid Score

Each eligible pair receives three normalized components:

- semantic score: cosine similarity, weight `0.75`;
- lexical score: normalized request-token coverage across product name and
  description, weight `0.20`;
- category score: `1` when normalized categories match and `0` otherwise,
  weight `0.05`.

The final score is:

```text
final = semantic * 0.75 + lexical * 0.20 + category * 0.05
```

Lexical matching is multilingual-safe at the normalization level and ignores
punctuation and duplicate tokens. It is a supporting signal, not a replacement
for semantic similarity.

## Decision Bands

- `final >= 0.80`: accept without AI review;
- `0.68 <= final < 0.80`: send to AI review;
- `final < 0.68`: reject.

Before scoring, candidates with semantic similarity below `0.55` are discarded
to limit obviously unrelated comparisons.

For each wanted request, accepted candidates are ranked by final score and only
the top three not previously matched are persisted and emailed in one run.

These constants live in one configuration object so production tuning does not
require changing multiple workflows.

## AI Review

AI review receives only a compact representation of a borderline pair:

- wanted query and description;
- product name and description;
- product price and wanted maximum price;
- semantic, lexical, category, and final scores.

The reviewer returns structured JSON:

```json
{
  "relevant": true,
  "confidence": 0.87,
  "reason": "Both refer to a computer desk suitable for a study setup."
}
```

The pair passes when `relevant` is true and confidence is at least `0.75`.
The reviewer must judge whether the product satisfies the requested item, not
whether the words merely share a topic.

AI review uses a small, configurable model through
`OPENAI_MATCH_REVIEW_MODEL`. It is called only for borderline candidates and in
bounded groups to control cost and runtime.

If AI review times out, returns invalid output, or OpenAI is unavailable, the
borderline candidate is deferred and no email is sent. High-score candidates do
not depend on AI. The failure is recorded so a later batch can retry.

## Immediate and Batch Behavior

The nightly batch remains the authoritative path because it can generate and
refresh embeddings. It evaluates all active subscribed requests against all
available products.

The immediate product-publish flow uses existing embeddings when available. It
generates the new product embedding when needed and refreshes at most 24
missing or stale active request embeddings. Requests beyond that bound are
deferred to the nightly batch. If embedding or AI review fails, product
publication still succeeds and matching is deferred to the nightly batch.

Product publication schedules immediate matching with Next.js `after()` so the
HTTP response is not blocked by embedding or review latency. Immediate AI
review is limited to the six highest-scoring borderline candidates; lower
candidates remain unpersisted and can be reconsidered by the authoritative
nightly batch.

Both paths use the same guardrails, score weights, decision bands, Top 3 limit,
and persistence function.

## Persistence

`wanted_request_matches` retains its unique
`(wanted_request_id, product_id)` constraint and adds:

- `semantic_score numeric`;
- `lexical_score numeric`;
- `category_score numeric`;
- `decision_source text` with values `hybrid` or `ai_review`;
- `decision_reason text`;
- `review_confidence numeric`;
- `review_error text`.

Rows are inserted only after a candidate is accepted. Deferred or rejected
candidates are not inserted, allowing future batches to reconsider them after
content, embeddings, thresholds, or AI availability changes.

## Error Handling

- Product publication never fails because matching fails.
- An individual AI review failure does not fail the full batch.
- An individual email failure is recorded on the accepted match and does not
  stop other emails.
- Invalid or missing embeddings skip only the affected pair and are reported in
  the batch result.
- Underlying Supabase and OpenAI errors are serialized into batch diagnostics
  instead of being replaced by a generic error.

## Testing

Unit tests cover:

- embedding input excludes price/category and deduplicates translations;
- lexical token coverage;
- category match adds score without blocking mismatches;
- budget, inventory, status, subscription, and self-match guardrails;
- high, borderline, and low decision bands;
- AI acceptance, rejection, invalid output, and timeout fallback;
- ranking and Top 3 behavior;
- immediate and batch paths produce the same decision for the same pair;
- duplicate accepted matches do not send duplicate email.

Integration tests use injected embedding, AI-review, database, and email
dependencies. Production verification runs the cron manually, inspects score
components on created rows, and confirms a known positive and known negative
example before enabling normal email delivery.

## Rollout

1. Deploy schema additions.
2. Deploy code with matching email delivery temporarily disabled by
   `WANTED_MATCH_EMAIL_ENABLED=false`.
3. Run the production batch manually and inspect accepted/rejected samples.
4. Adjust centralized thresholds only if the sample evidence requires it.
5. Enable email delivery and run once more.
6. Monitor match counts, AI review failures, and email failures for the first
   three scheduled runs.

Rollback disables matching email delivery first, then reverts the application
release. New metadata columns are additive and do not need to be removed.
