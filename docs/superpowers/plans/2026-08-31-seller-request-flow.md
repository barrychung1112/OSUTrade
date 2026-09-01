# Seller Request Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing seller Request Center into one continuous workflow for accepting, contacting, completing, or cancelling a trade, and proactively open it for important request notifications.

**Architecture:** Supabase owns request and inventory transitions in one transactional database function. The seller API validates ownership, calls that function, and sends notifications only after the transaction commits. A global request-center provider reuses the current dialog, fetches authoritative request data, and receives deduplicated open events from notification polling.

**Tech Stack:** Next.js App Router, React, TypeScript, Radix UI, Supabase Postgres/RPC, Vitest, Playwright.

---

## File Structure

- Modify `supabase/mvp-schema.sql`: add `completed` and atomic request transition RPC.
- Modify `supabase/mvp-schema.test.ts`: assert migration and transactional safeguards.
- Create `app/lib/tradeRequestLifecycle.ts`: shared status/action types and legal transition helpers.
- Create `app/lib/tradeRequestLifecycle.test.ts`: lifecycle and grouping tests.
- Modify `app/api/seller/requests/route.ts`: use RPC for accept, complete, and unsuccessful trade actions.
- Modify `app/api/seller/requests/route.test.ts`: API authorization, conflicts, and RPC result tests.
- Modify `app/lib/notifications.ts` and test: completion/cancellation notification copy.
- Create `app/lib/requestCenterEvents.ts` and test: actionable-event selection and browser event contract.
- Create `app/components/TradeRequestCenterProvider.tsx`: global dialog state, refresh, focus, and deferred opening.
- Modify `app/components/SellerRequestCenter.tsx`: focused request support and responsive dialog semantics.
- Modify `app/components/NotificationBell.tsx`: dispatch actionable request events instead of count-only feedback.
- Modify `app/providers.tsx`: mount the global Request Center.
- Modify `app/seller/page.tsx`: remove duplicate dialog ownership and open the global center from seller controls.
- Modify `app/requests/page.tsx`: share buyer request presentation with the global center and open the requested item from buyer events.
- Modify `app/i18n.tsx`: English, Traditional Chinese, and Simplified Chinese workflow copy.
- Modify `app/globals.css`: desktop modal, mobile sheet, focused card, and sticky action styles.

### Task 1: Model the complete request lifecycle

**Files:**
- Create: `app/lib/tradeRequestLifecycle.ts`
- Create: `app/lib/tradeRequestLifecycle.test.ts`
- Modify: `app/lib/sellerRequestCenter.ts`
- Modify: `app/lib/sellerRequestCenter.test.ts`

- [ ] **Step 1: Write failing lifecycle tests**

```ts
expect(canSellerTransition("sent", "accept")).toBe(true);
expect(canSellerTransition("accepted", "complete")).toBe(true);
expect(canSellerTransition("accepted", "cancel")).toBe(true);
expect(canSellerTransition("completed", "cancel")).toBe(false);
expect(groupSellerRequests(rows).active.map((row) => row.id)).toEqual([
  "sent-request",
  "accepted-request",
]);
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm test -- --run app/lib/tradeRequestLifecycle.test.ts app/lib/sellerRequestCenter.test.ts`

Expected: FAIL because `completed`, lifecycle helpers, and the `active` group do not exist.

- [ ] **Step 3: Add minimal shared lifecycle types and grouping**

```ts
export type TradeRequestStatus =
  | "sent" | "accepted" | "completed" | "declined" | "cancelled" | "expired";
export type SellerRequestAction = "accept" | "decline" | "complete" | "cancel";

const transitions: Record<SellerRequestAction, TradeRequestStatus[]> = {
  accept: ["sent"],
  decline: ["sent"],
  complete: ["accepted"],
  cancel: ["accepted"],
};

export function canSellerTransition(status: TradeRequestStatus, action: SellerRequestAction) {
  return transitions[action].includes(status);
}
```

Update `groupSellerRequests` so `sent` and `accepted` are returned in `active`, `expired` remains separate, and terminal states are returned in `history`. `pendingCount` continues to count only `sent`; add `actionableCount` for `sent + accepted`.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --run app/lib/tradeRequestLifecycle.test.ts app/lib/sellerRequestCenter.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add app/lib/tradeRequestLifecycle.ts app/lib/tradeRequestLifecycle.test.ts app/lib/sellerRequestCenter.ts app/lib/sellerRequestCenter.test.ts
git commit -m "feat: model complete trade request lifecycle"
```

### Task 2: Add atomic Supabase transitions

**Files:**
- Modify: `supabase/mvp-schema.sql`
- Modify: `supabase/mvp-schema.test.ts`

- [ ] **Step 1: Write failing schema assertions**

Assert that the schema contains `completed`, a `transition_seller_trade_request` function, row locking with `for update`, ownership validation, guarded source statuses, inventory restoration, and execute permission restricted to the service role.

```ts
expect(schema).toContain("'completed'");
expect(schema).toContain("create or replace function public.transition_seller_trade_request");
expect(schema).toMatch(/for update/i);
expect(schema).toMatch(/revoke all on function .* from public/i);
```

- [ ] **Step 2: Run the schema test and verify failure**

Run: `npm test -- --run supabase/mvp-schema.test.ts`

Expected: FAIL because the migration and function are absent.

- [ ] **Step 3: Add the status migration and transactional RPC**

Use a `security definer` PL/pgSQL function with `search_path = public`. Its signature is:

```sql
public.transition_seller_trade_request(
  p_request_id uuid,
  p_seller_id uuid,
  p_action text,
  p_now timestamptz default now()
) returns jsonb
```

Inside the function:

1. Select the request and product together `for update`.
2. Raise `REQUEST_NOT_FOUND`, `SELLER_NOT_AUTHORIZED`, `INVALID_TRANSITION`, or `INSUFFICIENT_STOCK`.
3. For `accept`, require `sent`, subtract quantity once, and set product to `pending` only when remaining quantity is zero.
4. For `complete`, require `accepted` and only set request status to `completed`.
5. For `cancel`, require `accepted`, add quantity back once, set product status to `available`, and set request status to `cancelled`.
6. For `decline`, require `sent` and set status to `declined`.
7. Return `jsonb_build_object('request', to_jsonb(v_request), 'product', to_jsonb(v_product))`.

Recreate the request status constraint as:

```sql
check (status in ('sent', 'accepted', 'completed', 'declined', 'cancelled'))
```

Then restrict invocation:

```sql
revoke all on function public.transition_seller_trade_request(uuid, uuid, text, timestamptz) from public;
grant execute on function public.transition_seller_trade_request(uuid, uuid, text, timestamptz) to service_role;
```

- [ ] **Step 4: Run schema tests**

Run: `npm test -- --run supabase/mvp-schema.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add supabase/mvp-schema.sql supabase/mvp-schema.test.ts
git commit -m "feat: add atomic trade request transitions"
```

### Task 3: Connect seller API actions and notifications

**Files:**
- Modify: `app/api/seller/requests/route.ts`
- Modify: `app/api/seller/requests/route.test.ts`
- Modify: `app/lib/notifications.ts`
- Modify: `app/lib/notifications.test.ts`

- [ ] **Step 1: Write failing API and notification tests**

Cover an RPC call shaped as:

```ts
expect(rpc).toHaveBeenCalledWith("transition_seller_trade_request", {
  p_request_id: "request-1",
  p_seller_id: "seller-1",
  p_action: "complete",
  p_now: expect.any(String),
});
expect(response.status).toBe(200);
expect(payload.request.status).toBe("completed");
```

Also assert that a Postgres `INVALID_TRANSITION` error maps to HTTP 409, completion does not call a second product update, cancellation returns restored product quantity, and both terminal actions create buyer notifications after RPC success.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- --run app/api/seller/requests/route.test.ts app/lib/notifications.test.ts`

Expected: FAIL because actions and notification types are missing.

- [ ] **Step 3: Replace multi-query mutation with RPC**

Accept a body shaped as:

```ts
type SellerRequestMutation = {
  requestId: string;
  action: "accept" | "decline" | "complete" | "cancel";
};
```

Call `supabase.rpc("transition_seller_trade_request", args)`, map known RPC errors to 404, 403, or 409, and convert the returned request/product through `toSellerRequest`. Load buyer email/contact only for `accepted`; preserve enough product data in terminal history for display without exposing contacts before acceptance.

Add `request_completed` and `request_cancelled` notification types. Completion copy tells the buyer the seller marked the handoff complete; cancellation copy says the item is available again. Keep `safeNotifyTradeEvent` so email failure cannot turn a committed transition into a failed API response.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --run app/api/seller/requests/route.test.ts app/lib/notifications.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add app/api/seller/requests/route.ts app/api/seller/requests/route.test.ts app/lib/notifications.ts app/lib/notifications.test.ts
git commit -m "feat: complete trades from seller requests"
```

### Task 4: Define proactive Request Center events

**Files:**
- Create: `app/lib/requestCenterEvents.ts`
- Create: `app/lib/requestCenterEvents.test.ts`
- Modify: `app/lib/notificationPresenter.ts`
- Modify: `app/lib/notificationPresenter.test.ts`

- [ ] **Step 1: Write failing event-policy tests**

```ts
expect(getActionableRequestEvent(newNotification)).toEqual({
  notificationId: "notification-1",
  requestId: "request-1",
  audience: "seller",
});
expect(shouldAutoOpenRequestCenter({ alreadyShown: true, blockingUi: false })).toBe(false);
expect(shouldAutoOpenRequestCenter({ alreadyShown: false, blockingUi: true })).toBe(false);
```

Cover `request_created`, `request_accepted`, `request_declined`, `request_cancelled`, and deadline events. Ignore price-only and informational notifications.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- --run app/lib/requestCenterEvents.test.ts app/lib/notificationPresenter.test.ts`

Expected: FAIL because the policy and audience fields do not exist.

- [ ] **Step 3: Implement event contract and deduplication keys**

Export browser event name `osutrade:open-request-center`, a typed detail object, and pure helpers. Use notification ID as the one-time automatic-open key and request ID as the focus target. Store shown IDs in session storage under `osutrade:shown-request-events`; unread state remains server-owned.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --run app/lib/requestCenterEvents.test.ts app/lib/notificationPresenter.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add app/lib/requestCenterEvents.ts app/lib/requestCenterEvents.test.ts app/lib/notificationPresenter.ts app/lib/notificationPresenter.test.ts
git commit -m "feat: define proactive request center events"
```

### Task 5: Build the global continuous Request Center

**Files:**
- Create: `app/components/TradeRequestCenterProvider.tsx`
- Create: `app/components/TradeRequestCenterProvider.test.tsx`
- Modify: `app/components/SellerRequestCenter.tsx`
- Modify: `app/providers.tsx`
- Modify: `app/seller/page.tsx`
- Modify: `app/requests/page.tsx`
- Modify: `app/i18n.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Write failing component tests**

Test that a seller-audience open event fetches `/api/seller/requests`, a buyer-audience event fetches `/api/requests`, and each opens and focuses its request ID. A `sent` seller card shows Accept and Decline; Accept changes the same card to contacts plus completion actions; complete/cancel moves it to history; cancellation confirmation explains inventory restoration; a buyer card displays its latest milestone and seller contact after acceptance; and a duplicate event does not reopen a dismissed dialog.

- [ ] **Step 2: Run component tests and verify failure**

Run: `npm test -- --run app/components/TradeRequestCenterProvider.test.tsx`

Expected: FAIL because the provider does not exist.

- [ ] **Step 3: Implement provider and responsive interaction**

Mount `TradeRequestCenterProvider` inside `I18nProvider`. It owns `open`, audience (`seller` or `buyer`), requests, focused ID, loading/error state, and API mutations. It listens for `osutrade:open-request-center`, loads `/api/seller/requests` for seller events or `/api/requests` for buyer events, defers when `[data-request-center-blocking="true"]` or another modal is active, and retries after blocking state clears.

Reuse `SellerRequestCenter` as the dialog shell. Render accepted requests before sent requests. Add `data-request-id`, temporary focus styling, and `scrollIntoView({ block: "center" })` after opening. Keep actions sticky on mobile and inline on desktop.

Replace the seller page's local dialog with an event-dispatching trigger. Keep seller stats, but remove duplicate request mutation ownership. Extract the buyer trade-request card from `app/requests/page.tsx` so the full page and global center share status/contact rendering; the wanted-request tab remains page-only. Add new strings in `en`, `zhTw`, and `zhCn`, including inventory consequences and retry/conflict messages.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --run app/components/TradeRequestCenterProvider.test.tsx app/lib/sellerRequestCenter.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add app/components/TradeRequestCenterProvider.tsx app/components/TradeRequestCenterProvider.test.tsx app/components/SellerRequestCenter.tsx app/providers.tsx app/seller/page.tsx app/requests/page.tsx app/i18n.tsx app/globals.css
git commit -m "feat: centralize seller request management"
```

### Task 6: Connect notification polling to proactive opening

**Files:**
- Modify: `app/components/NotificationBell.tsx`
- Create: `app/components/NotificationBell.test.tsx`
- Modify: `app/api/notifications/route.ts`
- Create or modify: `app/api/notifications/route.test.ts`

- [ ] **Step 1: Write failing notification tests**

Assert that a newly fetched actionable notification dispatches one typed open event, the initial fetch does not open old notifications, repeated polling does not redispatch the same notification, and clicking a request notification marks only that notification read after the center confirms visibility.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- --run app/components/NotificationBell.test.tsx app/api/notifications/route.test.ts`

Expected: FAIL because polling only compares unread counts.

- [ ] **Step 3: Dispatch request events from notification identity changes**

Track the initial notification ID set. On later polling, find the newest unread actionable item absent from the prior set and dispatch `osutrade:open-request-center`. Retain the toast as fallback when opening is deferred. Use the existing PATCH path for one notification ID and call it only after the provider emits `osutrade:request-visible`.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --run app/components/NotificationBell.test.tsx app/api/notifications/route.test.ts app/lib/requestCenterEvents.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add app/components/NotificationBell.tsx app/components/NotificationBell.test.tsx app/api/notifications/route.ts app/api/notifications/route.test.ts
git commit -m "feat: open request center for trade events"
```

### Task 7: Full verification and deployment handoff

**Files:**
- Modify: `README.md`
- Modify: `README.zh-TW.md`
- Modify: `README.zh-CN.md`

- [ ] **Step 1: Update operator documentation**

Document the new seller flow, required Supabase migration, `completed` state, and rollback order. Do not include credentials or real user data.

- [ ] **Step 2: Run the full automated suite**

Run: `npm test -- --run`

Expected: all tests pass.

- [ ] **Step 3: Run production build and static checks**

```powershell
npm run build
git diff --check
git grep -n -I -E "sk-(proj-)?[A-Za-z0-9_-]{20,}|SUPABASE_SERVICE_ROLE_KEY=" -- . ":(exclude).env.example"
```

Expected: build succeeds, no whitespace errors, and no committed credentials.

- [ ] **Step 4: Run Playwright desktop and mobile flows**

Test at 1440x900 and 390x844:

1. Create a buyer request with test accounts.
2. Verify the seller panel auto-opens once and focuses that request.
3. Accept and verify the same card shows contacts and completion actions.
4. Complete and verify history plus inventory.
5. Repeat with unsuccessful trade and verify inventory restoration.
6. Open a listing form, trigger an event, and verify opening is deferred without losing form data.
7. Check console errors, overflow, hidden actions, and overlapping dialogs.

- [ ] **Step 5: Commit documentation**

```powershell
git add README.md README.zh-TW.md README.zh-CN.md
git commit -m "docs: explain complete seller request flow"
```

- [ ] **Step 6: Prepare deployment order**

1. Give the user the exact SQL extracted from `supabase/mvp-schema.sql` and wait for confirmation it was run.
2. Push the branch and open one PR.
3. Request code review and resolve actionable findings.
4. Merge only after tests, build, review, and Vercel preview pass.
5. Verify production accept, complete, and unsuccessful-trade flows.
6. If UI opening misbehaves, disable proactive opening while leaving the transactional lifecycle active.
