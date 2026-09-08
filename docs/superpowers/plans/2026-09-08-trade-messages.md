# Trade Messages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the buyer and seller exchange plain-text messages in Request Center after a seller accepts a trade request, with reliable unread counts and immediate in-app alerts.

**Architecture:** Auth.js remains the source of browser identity. All persistent message reads and writes pass through authenticated Next.js route handlers using the Supabase service-role client. A short-lived, user-scoped JWT lets the browser subscribe to a Supabase private Realtime topic, but Realtime sends only an invalidation signal; the client refetches the authorized REST API before showing message content. The existing notifications table and bell remain the durable in-app alert and unread counter.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Vitest/Testing Library, Auth.js, Supabase Postgres/RLS/Realtime, `@supabase/supabase-js`, `jose`.

---

## Guardrails

- Messages are available only for a request whose status is `accepted`, `completed`, or `cancelled`; requests never accepted cannot create or reveal a conversation.
- Only the request buyer and the product seller can read, send, or acknowledge messages.
- A message is immutable plain text: trimmed, non-empty, and at most 1,000 characters. No attachments, edits, deletes, HTML, or email-per-message delivery.
- Preserve a conversation when an accepted trade becomes `completed` or `cancelled`; it remains read-only only if the feature is disabled, not because of the trade outcome.
- `TRADE_MESSAGES_ENABLED` defaults to off outside tests. Disabled endpoints return a stable `404`/feature-disabled response and the UI does not advertise chat.
- Browser access to the `trade_messages` and `trade_message_reads` tables is denied. The service-role client is the only persistence path.

## Data Contract

```sql
trade_messages (
  message_id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.trade_requests(request_id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  client_message_id uuid not null,
  created_at timestamptz not null default now(),
  unique (request_id, sender_id, client_message_id)
)

trade_message_reads (
  request_id uuid not null references public.trade_requests(request_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null,
  primary key (request_id, user_id)
)
```

`trade_requests.accepted_at` is added as the durable accepted-origin marker. The existing atomic seller-transition function writes it only when it accepts a request; chat authorization requires a non-null value, so a buyer cancellation before acceptance never becomes a conversation.

The message API returns a cursor-paginated oldest-to-newest page and `unreadCount` for the authenticated participant. A request preview gets `messageUnreadCount` for Request Center list badges.

## Task 1: Add the message schema and Realtime authorization

**Files:**
- Modify: `supabase/mvp-schema.sql`
- Create: `supabase/trade-messages.sql`
- Modify: `supabase/mvp-schema.test.ts`

- [x] Add a standalone, idempotent SQL migration for `trade_messages` and `trade_message_reads`, their check constraints, unique client-message key, and request/time indexes.
- [x] Add `trade_requests.accepted_at`, backfill it for currently `accepted`/`completed` requests, and update `transition_seller_trade_request` to set it only during `accept`.
- [x] Add a `security definer`, stable participant helper that joins `trade_requests` to `products` via `products.product_id::text = trade_requests.product_id`; it must return true only for the buyer or seller of a request with non-null `accepted_at` and a current `accepted`, `completed`, or `cancelled` state.
- [x] Enable RLS and revoke `anon`/`authenticated` table privileges so PostgREST cannot bypass the server routes.
- [x] Add private Broadcast topic policies on `realtime.messages`. The policy must permit only authenticated, eligible participants for a `trade-message:<request UUID>` topic and only the `broadcast` extension. Keep the request-id parsing safe for malformed topics.
- [x] Add an `after insert` database trigger that calls `realtime.send()` with only `{ requestId, messageId, senderId, createdAt }` as a private `message_created` Broadcast event. Do not use `realtime.broadcast_changes()`, because it exposes the complete inserted row. This removes the need for a Vercel function to keep a WebSocket open and prevents message text from appearing in Realtime payloads.
- [x] Mirror the migration in the canonical schema file so fresh environments contain the tables and policies.
- [x] Add schema tests asserting the accepted-origin marker, tables, participant helper, RLS/revokes, topic policy, and trigger are present.
- [x] Run: `npm test -- --run supabase/mvp-schema.test.ts` and confirm it fails before the assertions are implemented, then passes after implementation.
- [x] Commit: `feat: add secure trade message schema`

## Task 2: Add server-side feature and participant access helpers

**Files:**
- Create: `app/lib/tradeMessages.ts`
- Create: `app/lib/tradeMessages.test.ts`
- Modify: `app/api/requests/route.ts`
- Modify: `app/api/seller/requests/route.ts`

- [ ] Implement a small feature-flag helper that accepts only an explicit `"true"` value for `TRADE_MESSAGES_ENABLED`.
- [ ] Implement `loadTradeMessageAccess` using the service-role client. It fetches the request, loads its product, verifies buyer/seller membership, and enforces the accepted-origin status set.
- [ ] Define shared typed mapping for message rows, message previews, cursor encoding/decoding, and safe response error mapping (`401`, `403`, `404`, `409`, `429`).
- [ ] Implement preview-count loading in a bounded query and add `messageUnreadCount` only when chat is enabled; keep legacy request API response fields unchanged.
- [ ] Avoid N+1 calls by batching unread counts for the request list rather than querying one conversation per card.
- [ ] Write unit tests for buyer/seller participation, nonparticipant rejection, `sent`/`declined` rejection, accepted-to-cancelled continuity, feature flag behavior, cursor validation, and batch unread mapping.
- [ ] Run: `npm test -- --run app/lib/tradeMessages.test.ts app/api/requests/route.test.ts app/api/seller/requests/route.test.ts`.
- [ ] Commit: `feat: add trade message access controls`

## Task 3: Build authenticated message APIs and durable alerts

**Files:**
- Create: `app/api/requests/[requestId]/messages/route.ts`
- Create: `app/api/requests/[requestId]/messages/read/route.ts`
- Create: `app/api/requests/[requestId]/messages/route.test.ts`
- Modify: `app/lib/notifications.ts`
- Modify: `app/lib/notificationPresenter.ts`
- Modify: `app/lib/requestCenterEvents.ts`
- Modify: `app/lib/requestCenterEvents.test.ts`

- [ ] Add `GET /api/requests/[requestId]/messages?before=<cursor>&limit=<1..50>`: require Auth.js identity, feature enabled, participant access, then return an ordered page and participant-scoped unread count.
- [ ] Add `POST /api/requests/[requestId]/messages`: require `body` and a UUID `clientMessageId`, apply per-user/per-request rate limiting of ten messages per rolling minute, insert with `(request_id, sender_id, client_message_id)` idempotency, and return the existing or created message. Do not create duplicate notifications on retried client IDs.
- [ ] On a newly created message, insert exactly one `trade_message_received` notification for the other participant through the shared notification builder with email explicitly disabled. Its action points to the matching request conversation.
- [ ] Add `PATCH /api/requests/[requestId]/messages/read`: upsert `last_read_at` after access verification. It must be idempotent and never mark another user's messages read.
- [ ] Extend notification types/presenter/actionable-event routing so a message notification opens Request Center focused on that request, without treating it as an auto-open request-status event.
- [ ] Test auth rejection, participant checks, malformed and oversized bodies, rate limit, idempotent retry, unread calculation, read acknowledgement, immutable rows, and notification creation without outbound email.
- [ ] Run: `npm test -- --run app/api/requests/[requestId]/messages/route.test.ts app/lib/notifications.test.ts app/lib/requestCenterEvents.test.ts`.
- [ ] Commit: `feat: add trade message APIs and alerts`

## Task 4: Issue short-lived Realtime credentials and subscribe safely

**Files:**
- Add dependency: `jose` in `package.json` and lockfile
- Create: `app/api/realtime/trade-messages-token/route.ts`
- Create: `app/api/realtime/trade-messages-token/route.test.ts`
- Create: `app/lib/tradeMessageRealtime.ts`
- Create: `app/lib/tradeMessageRealtime.test.ts`

- [ ] Add a server endpoint that requires Auth.js identity and the feature flag, then signs a five-minute asymmetric JWT with `sub`, `role: "authenticated"`, `iat`, `exp`, configured `iss`, `aud: "authenticated"`, and `kid`.
- [ ] Fail closed with a clear `503` when the Supabase Realtime signing-key environment values are absent or malformed; never serialize the private key to the browser.
- [ ] Create a browser subscription helper using the public Supabase URL/anon key plus `accessToken` retrieval. Join a private `trade-message:<requestId>` channel only after a user opens that conversation.
- [ ] On the metadata-only Broadcast event, invoke a supplied refetch callback. Ignore echo events from the current user, duplicate message IDs, malformed payloads, and events for other request IDs.
- [ ] Renew the token before expiry and clean up channels on conversation switch, Request Center close, sign-out, and unmount. If Realtime fails, retain the normal API load path and surface a non-blocking reconnect state.
- [ ] Test token claims and expiry, configuration failure, topic selection, refetch-on-event, no data leakage in payload handling, and unsubscribe cleanup with mocked Supabase client methods.
- [ ] Run: `npm test -- --run app/api/realtime/trade-messages-token/route.test.ts app/lib/tradeMessageRealtime.test.ts`.
- [ ] Commit: `feat: add secure trade message realtime`

## Task 5: Add the Request Center conversation experience

**Files:**
- Create: `app/components/TradeMessageConversation.tsx`
- Create: `app/components/TradeMessageConversation.test.tsx`
- Modify: `app/components/TradeRequestCenterProvider.tsx`
- Modify: `app/components/SellerRequestCenter.tsx`
- Modify: `app/globals.css`
- Modify: `app/i18n.tsx` and locale dictionaries used by the app
- Modify: `app/components/TradeRequestCenterProvider.test.tsx`

- [ ] Keep the current Request Center as the single entry point. On desktop, render request list and selected conversation in stable two-column tracks. On small screens, show one panel at a time with a visible Back to requests control.
- [ ] Add a chat affordance only to eligible request cards. A message badge on each card uses `messageUnreadCount`; status actions and existing contact details remain discoverable.
- [ ] Build the conversation component with the product name/status header, chronological message history, sender-distinct bubbles, accessible timestamps, loading/empty/error/reconnecting states, and a fixed-height scroll region that does not move the composer.
- [ ] Build a single-line accessible textarea composer with a 1,000-character counter, disabled/send-in-progress state, retryable error message, optimistic message keyed by `clientMessageId`, and no duplicate after idempotent retry.
- [ ] Mark messages read after the history is successfully visible. Selecting a notification opens the exact conversation; receiving a new message only shows the existing short toast and increments badges, never force-opens the modal.
- [ ] Use translation keys for all new visible text in English, Traditional Chinese, and Simplified Chinese. Do not derive product or message text through translation.
- [ ] Ensure keyboard focus enters the conversation predictably, Escape returns/closes according to the existing dialog behavior, and mobile buttons remain above the safe-area/browser chrome.
- [ ] Write component tests for eligibility, responsive panel navigation, read acknowledgement, optimistic send/retry, unread badge, toast behavior without forced modal opening, and Realtime cleanup.
- [ ] Run: `npm test -- --run app/components/TradeMessageConversation.test.tsx app/components/TradeRequestCenterProvider.test.tsx`.
- [ ] Commit: `feat: add request center trade conversations`

## Task 6: Verify, document configuration, and prepare rollout

**Files:**
- Modify: `README.md`
- Modify: `.env.example` if present and safe to edit
- Create: `docs/trade-messages-rollout.md`
- Modify: relevant Playwright configuration/tests if coverage exists

- [ ] Document all required non-secret environment names: `TRADE_MESSAGES_ENABLED`, `SUPABASE_REALTIME_JWT_PRIVATE_KEY`, `SUPABASE_REALTIME_JWT_KEY_ID`, `SUPABASE_REALTIME_JWT_ISSUER`, and existing public Supabase URL/anon key. Never put values, API keys, service-role keys, or private JWT material in docs or tests.
- [ ] Document Supabase operator steps: apply `supabase/trade-messages.sql`, register the matching public key/JWKS for third-party JWT validation, then enable the Vercel feature flag only after a staging two-account test.
- [ ] Add a rollback guide: set `TRADE_MESSAGES_ENABLED=false` first, leaving message records intact; later disable the Realtime signing key/policies only after active channels drain. Existing request actions and notifications must continue to function.
- [ ] Run the full suite: `npm test -- --run`.
- [ ] Run `npm run build` with feature flag off and a configuration smoke check with it on but missing keys to confirm the UI remains usable and the token API fails closed.
- [ ] Use Playwright with two authenticated test accounts to verify: seller accepts, both parties open the same Request Center conversation, sender posts once, receiver gets a badge/toast without forced modal, both can read history after completion/cancellation, a third account receives `403`, and no network payload reveals messages for an unauthorized request.
- [ ] Commit: `docs: add trade message rollout guide`

## Deployment Sequence

1. Merge code with `TRADE_MESSAGES_ENABLED=false`; no chat UI or endpoints become active.
2. Apply `supabase/trade-messages.sql` in staging and production; verify tables, index, RLS, helper, Realtime policy, and trigger with `to_regclass`/policy queries.
3. Configure Supabase third-party JWT signing-key trust and Vercel runtime variables. Keep private key server-only.
4. Execute the two-account staging test and inspect Realtime authorization denials and notification rows.
5. Enable the flag in production for a small internal account set if available, then globally. Watch API 4xx/5xx, token failures, notification volume, and Realtime auth errors.
6. On failure, set `TRADE_MESSAGES_ENABLED=false`; this immediately removes UI entry and blocks new API activity without damaging requests, existing notifications, or stored message history.

## Review Checklist

- [ ] The schema handles `products.product_id` as text-compatible when joined to `trade_requests.product_id`.
- [ ] Every route verifies Auth.js identity and server-side request participation before returning or mutating content.
- [ ] The private Realtime channel only carries invalidation metadata, and direct table access stays denied.
- [ ] Message alerts create no outbound email.
- [ ] Request Center remains usable if the Realtime setup is missing, rejected, or temporarily disconnected.
- [ ] All existing seller request acceptance/cancellation tests still pass.
