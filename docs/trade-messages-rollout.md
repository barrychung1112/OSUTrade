# Trade Messages Rollout

Trade Messages let the buyer and seller exchange plain-text messages after a seller accepts a request. The browser uses the existing Auth.js session and polls the authenticated message API; no Supabase browser JWT, Realtime policy, or Realtime signing key is required.

## Required configuration

Set this Vercel environment variable in production:

| Variable | Purpose |
| --- | --- |
| `TRADE_MESSAGES_ENABLED` | Keep `false` until the database migration and staging verification are complete. Set exactly `true` to expose chat. |

`SUPABASE_SERVICE_ROLE_KEY` remains server-only. It is used only by authenticated server routes and never sent to the browser.

## Supabase setup

1. Keep `TRADE_MESSAGES_ENABLED=false` in Vercel.
2. In the Supabase SQL Editor, run [`supabase/trade-messages.sql`](../supabase/trade-messages.sql). It adds `accepted_at`, message tables, indexes, RLS protections, and server-only access helpers. It also removes Realtime artifacts if an earlier chat migration created them.
3. Verify the migration before enabling the feature:

```sql
select
  to_regclass('public.trade_messages') as trade_messages,
  to_regclass('public.trade_message_reads') as trade_message_reads,
  to_regprocedure('public.can_access_trade_messages(uuid,uuid)') as participant_helper;
```

4. Redeploy with the flag still `false`. Existing Request Center behavior must remain usable.

## Staging verification

Use three accounts: a buyer, the seller, and an unrelated user.

1. Seller accepts the buyer's request.
2. Buyer and seller each open that request's Request Center conversation.
3. Buyer sends one message. Within eight seconds, seller sees the message and an unread badge without a forced modal open.
4. Seller refreshes and replies. Verify each API response contains only the conversation's messages.
5. Confirm the unrelated account receives `403` from the message and read endpoints for the same request.
6. Complete and cancel separate accepted requests. Both participants must still be able to read the existing conversation.
7. Leave a conversation open for one minute and verify the browser only calls the authenticated message API. It must not request a Realtime token or open a Realtime channel.

Only after all steps pass, set `TRADE_MESSAGES_ENABLED=true` and redeploy. Monitor message-route `401`/`403`/`429`/`500`, request-center polling volume, notification volume, and client refresh errors.

## Rollback

1. Set `TRADE_MESSAGES_ENABLED=false` in Vercel and redeploy. This immediately hides message entry points and makes chat APIs return `404`.
2. Leave `trade_messages`, read rows, request records, and notifications intact. Existing request actions continue to work.
3. Restore the flag only after the incident is understood and the message API has been rechecked. No Supabase key rotation is required for this rollback.
