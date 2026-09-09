# Trade Message Polling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace custom Supabase Realtime JWT delivery with Auth.js-protected message polling.

**Architecture:** `TradeMessageConversation` owns an eight-second refresh timer and continues using the existing message routes. Supabase stores messages and unread state only; it no longer authorizes or broadcasts browser Realtime channels.

**Tech Stack:** Next.js, React, Auth.js, Supabase Postgres, Vitest.

---

### Task 1: Prove polling behaviour

**Files:**
- Modify: `app/components/TradeMessageConversation.test.tsx`

- [ ] Add a fake-timer test that opens a conversation, advances eight seconds, and expects a second message-list request.
- [ ] Run the focused test and confirm it fails because no polling timer exists.
- [ ] Commit with the component implementation in Task 2.

### Task 2: Replace the browser subscription

**Files:**
- Modify: `app/components/TradeMessageConversation.tsx`
- Delete: `app/lib/tradeMessageRealtime.ts`
- Delete: `app/lib/tradeMessageRealtime.test.ts`
- Delete: `app/lib/tradeMessageRealtimeToken.ts`
- Delete: `app/lib/tradeMessageRealtimeToken.test.ts`
- Delete: `app/api/realtime/trade-messages-token/route.ts`
- Delete: `app/api/realtime/trade-messages-token/route.test.ts`

- [ ] Add an eight-second `setInterval` after the immediate conversation load.
- [ ] Clear the timer when the request changes or the component unmounts.
- [ ] Keep existing optimistic send, idempotent retry, read acknowledgement, and visible error handling.
- [ ] Run the component test and confirm it passes.

### Task 3: Remove Supabase Realtime setup

**Files:**
- Modify: `supabase/trade-messages.sql`
- Modify: `supabase/mvp-schema.sql`
- Modify: `supabase/mvp-schema.test.ts`
- Modify: `package.json`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `README.zh-TW.md`
- Modify: `README.zh-CN.md`
- Modify: `docs/trade-messages-rollout.md`

- [ ] Delete the Realtime RLS policy and insert trigger while retaining message-table RLS and server-only persistence.
- [ ] Remove `jose` and the three custom Realtime JWT variables.
- [ ] Update rollout instructions so only `TRADE_MESSAGES_ENABLED` gates production chat.
- [ ] Update schema assertions to reject Realtime artifacts.

### Task 4: Verify and update the PR

**Files:**
- Modify: PR branch only

- [ ] Run focused polling, API, request-center, and schema tests.
- [ ] Run TypeScript and a production build.
- [ ] Review the diff for removed private material and stale Realtime references.
- [ ] Commit, push, and update PR #142.
