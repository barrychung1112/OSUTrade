# Trade Messages Rollout

Trade Messages let the buyer and seller exchange plain-text messages after a seller accepts a request. The feature is intentionally off until its database policy and Realtime credentials are configured.

## Required configuration

Set these Vercel environment variable names for the production environment. Do not commit their values or place private signing material in browser-visible variables.

| Variable | Purpose |
| --- | --- |
| `TRADE_MESSAGES_ENABLED` | Keep `false` until all verification is complete. Set exactly `true` to expose the feature. |
| `SUPABASE_REALTIME_JWT_PRIVATE_KEY` | Server-only PEM private key used by the token route. Newlines may be stored as `\\n`. |
| `SUPABASE_REALTIME_JWT_KEY_ID` | Key ID that identifies the matching trusted public key in Supabase. |
| `SUPABASE_REALTIME_JWT_ISSUER` | Issuer configured for the matching Supabase JWT trust entry. |
| `NEXT_PUBLIC_SUPABASE_URL` | Existing public Supabase project URL used for the browser Realtime client. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Existing public Supabase anon/publishable key used for the browser Realtime client. |

`SUPABASE_SERVICE_ROLE_KEY` remains server-only and is never used by the browser Realtime client.

## Supabase setup

1. Keep `TRADE_MESSAGES_ENABLED=false` in Vercel.
2. In the Supabase SQL Editor, run [`supabase/trade-messages.sql`](../supabase/trade-messages.sql). It adds `accepted_at`, message tables, indexes, RLS protections, the private Broadcast policy, and the metadata-only insert trigger.
3. Verify the migration before enabling the feature:

```sql
select
  to_regclass('public.trade_messages') as trade_messages,
  to_regclass('public.trade_message_reads') as trade_message_reads,
  to_regprocedure('public.can_access_trade_messages(uuid,uuid)') as participant_helper;

select policyname
from pg_policies
where schemaname = 'realtime'
  and tablename = 'messages'
  and policyname = 'Trade message participants can receive broadcasts';
```

4. Generate or use an RSA signing key pair outside the repository. Register the **public** key or JWKS in the Supabase JWT signing-key/trust configuration as a third-party JWT verifier. Its key ID, issuer, algorithm `RS256`, and audience `authenticated` must match the server token configuration. Keep only the matching private PEM in Vercel.
5. Set the Vercel variables above, redeploy with the flag still `false`, and confirm `GET /api/realtime/trade-messages-token` returns `404` while the rest of Request Center remains usable.

## Staging verification

Use three accounts: a buyer, the seller, and an unrelated user.

1. Seller accepts the buyer's request.
2. Buyer and seller each open that request's Request Center conversation.
3. Buyer sends one message; seller receives an unread badge and in-app toast without a forced modal open.
4. Seller refreshes and replies. Verify each API response contains only the conversation's messages.
5. Confirm the unrelated account receives `403` from the message and read endpoints for the same request.
6. Complete and cancel separate accepted requests. Both participants must still be able to read the existing conversation.
7. Check browser Realtime payloads contain only `requestId`, `messageId`, `senderId`, and `createdAt`, never message body text.

Only after all steps pass, set `TRADE_MESSAGES_ENABLED=true` and redeploy. Monitor token-route `401`/`503`, message-route `403`/`429`/`500`, Realtime authorization errors, notification volume, and client reconnect warnings.

## Rollback

1. Set `TRADE_MESSAGES_ENABLED=false` in Vercel and redeploy. This immediately hides message entry points and makes chat APIs return `404`.
2. Leave `trade_messages`, read rows, request records, and notifications intact. Existing request actions continue to work.
3. After active browser sessions have drained and the incident is understood, rotate or disable the Realtime signing key if required. Do not remove the SQL policy or stored messages as the first rollback action.
