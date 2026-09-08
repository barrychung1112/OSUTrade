# Trade Messages Design

## Goal

Let the buyer and seller of an accepted OSUTrade request exchange plain-text messages directly in the Request Center. The conversation stays available after the request is completed or cancelled.

## Scope

The first release supports one conversation per trade request, text only, message history, unread counts, a lightweight in-app new-message notice, and realtime delivery. It does not support attachments, editing, deletion, typing indicators, online status, reactions, search, message forwarding, or email for every message.

## User Experience

### Eligibility

- A conversation belongs to exactly one `trade_requests.request_id`.
- A conversation is available only after that request has entered `accepted` at least once.
- The buyer and the product seller are the only participants.
- Conversations remain readable and writable after the request becomes `completed` or `cancelled`.
- A request never accepted has no conversation and cannot be used to create one.

### Request Center

- On desktop, the Request Center becomes a two-column workspace when a request is selected: request list on the left and the selected conversation on the right.
- The selected conversation header shows product name, other participant name, and current request status.
- The composer is fixed to the bottom of the conversation pane.
- On mobile, the user first sees the request list, then opens a full-width conversation view with a back control.
- A request with unread messages displays a numeric badge in the Request Center list. The Request Center trigger also shows the total unread message count.

### New-message behavior

- A new message does not force-open the Request Center.
- The recipient receives one short in-app notice and the relevant unread badge increments.
- Selecting the notice opens the Request Center at the matching request and conversation.
- The recipient is marked read only after the matching conversation has loaded and is visible.
- Multiple messages received while the notice is already visible are summarized by the unread count rather than stacking notices.

## Data Model

### `public.trade_messages`

| Column | Type | Rule |
| --- | --- | --- |
| `message_id` | `uuid` | Primary key, generated server-side. |
| `request_id` | `uuid` | Required FK to `trade_requests`, cascade on request deletion. |
| `sender_id` | `uuid` | Required FK to `auth.users`. |
| `body` | `text` | Trimmed, non-empty, maximum 1,000 characters. |
| `client_message_id` | `uuid` | Required idempotency key supplied by the client. Unique with `request_id` and `sender_id`. |
| `created_at` | `timestamptz` | Defaults to `now()`. |

Index messages by `(request_id, created_at desc, message_id desc)` for cursor pagination.

### `public.trade_message_reads`

| Column | Type | Rule |
| --- | --- | --- |
| `request_id` | `uuid` | Required FK to `trade_requests`, cascade on deletion. |
| `user_id` | `uuid` | Required FK to `auth.users`, cascade on deletion. |
| `last_read_at` | `timestamptz` | Updated only when the user has opened the matching conversation. |

The composite primary key is `(request_id, user_id)`. A missing read row means zero messages have been read.

## Authorization

The existing product uses Auth.js sessions rather than a browser-managed Supabase Auth session. All message reads, writes, unread counts, and read updates therefore pass through Next.js route handlers that call `auth()` and use the server-side Supabase admin client.

Every route handler resolves the request's product and validates one of these identities:

- `trade_requests.buyer_id` equals the Auth.js session user ID, or
- `products.seller_id` equals the Auth.js session user ID.

The same validation also requires the request to have reached `accepted`, including when its current status is `completed` or `cancelled`. Client-provided participant IDs, seller IDs, and request status are never trusted.

RLS is enabled for both message tables. Direct browser table access is denied; the API is the only data path for persisted messages. This preserves the current server-authorized application model.

## Realtime Delivery

The API persists messages first. A successful write then emits a `trade-message:{requestId}` private Supabase Realtime broadcast containing only the newly created message ID, request ID, sender ID, and timestamp. Clients refetch the message through the authorized API before rendering it.

Because Auth.js tokens cannot be used directly as Supabase Realtime credentials, a new authenticated endpoint issues a short-lived, asymmetric Realtime JWT with `sub` set to the current Auth.js user ID and `role` set to `authenticated`. Supabase is configured to trust its public signing key. The browser supplies that token through the Supabase client's `accessToken` callback or `realtime.setAuth()`.

Realtime `realtime.messages` policies authorize both broadcast send and receive only when the JWT subject is the accepted-or-later request buyer or product seller and the channel topic exactly equals `trade-message:{requestId}`. Public Realtime access remains disabled. The `service_role` key is never sent to the browser.

The client refreshes the short-lived token before expiry. When the channel disconnects, the UI shows a reconnecting state and preserves loaded content. On reconnect, window focus, and conversation open, it fetches the newest API page so a missed broadcast cannot lose a message.

## API Contract

### `GET /api/requests/{requestId}/messages`

Returns the authenticated participant's request summary, other participant display name, current status, messages in newest-first cursor order, and that participant's unread count.

Query parameters:

- `before`: ISO timestamp and message ID cursor for older messages.
- `limit`: optional, default 50, maximum 50.

Returns 401 without a session, 403 for a nonparticipant or an unaccepted request, and 404 for an unknown request.

### `POST /api/requests/{requestId}/messages`

Accepts `{ body, clientMessageId }`. It validates ownership, eligibility, 1,000-character maximum, non-blank content, UUID idempotency key, and a per-user rate limit of 10 accepted messages per 60 seconds per request. A duplicate `clientMessageId` returns the existing message rather than creating a second row.

### `PATCH /api/requests/{requestId}/messages/read`

Upserts the participant's `last_read_at` only after the conversation is visible. It does not alter the other participant's read state.

### `GET /api/realtime/trade-messages-token`

Requires an Auth.js session and returns a short-lived Realtime token. The endpoint never returns Supabase admin credentials and rate-limits token refreshes.

## Failure Handling

- A message is rendered as pending until `POST` succeeds.
- Network failures retain the draft and show a retry control using the same `clientMessageId`.
- Rate-limit, validation, permission, and expired-token errors show a clear inline explanation.
- If Realtime is unavailable, the persisted message API still works and the client refresh paths keep the conversation accurate.
- The feature is guarded by `TRADE_MESSAGES_ENABLED`. Disabling it hides all message entry points without modifying trade requests or deleting message history.

## Notifications

The existing notification system receives a new `trade_message_received` type. It stores the request ID and message metadata but does not send Email. The client turns that notification into the one in-app notice and unread badges described above. Existing transaction status notifications continue to use the Request Center's current proactive behavior.

## Verification

- Unit tests cover body validation, idempotency, rate limiting, authorization input, cursor order, unread calculation, and notification deduplication.
- Route tests cover buyer/seller success cases and nonparticipant, pending request, completed request, cancelled request, duplicate submission, and rate-limit failure cases.
- Schema tests assert tables, indexes, RLS, Realtime policies, and no public grants.
- Component tests cover pending/retry behavior, unread counts, mark-read timing, desktop selection, and mobile navigation.
- Playwright checks desktop and mobile layouts plus buyer-to-seller message delivery with mocked Realtime events.
- Full test suite and production build must pass before a PR is created.

## Rollout and Rollback

1. Apply the additive Supabase migration: tables, indexes, RLS, Realtime policies, and publication configuration.
2. Configure the public key that Supabase will use to verify the Realtime JWT issuer, plus the private signing key only in Vercel server environment variables.
3. Deploy API and token code with `TRADE_MESSAGES_ENABLED=false`.
4. Turn the flag on for test accounts, then run buyer/seller acceptance, send, unread, completed, cancelled, and reconnect smoke tests.
5. Enable the feature for production users.

Rollback sets `TRADE_MESSAGES_ENABLED=false`. It does not delete messages or modify current trade request state.
