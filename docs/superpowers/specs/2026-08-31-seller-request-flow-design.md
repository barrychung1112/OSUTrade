# Seller Request Flow Redesign

## Problem

Sellers currently accept a request in the Request panel but must look elsewhere to finish the transaction. The two actions are not connected, so users do not know where to confirm acceptance or completion. Status changes can also be missed because only the unread count changes.

## Goals

- Make the Request panel the single transaction-management surface.
- Keep acceptance, contact, completion, and unsuccessful-trade actions on the same request card.
- Proactively open the panel for important events without repeatedly interrupting users.
- Preserve inventory correctness during acceptance, completion, cancellation, retries, and concurrent requests.

## Non-goals

- In-app chat.
- Buyer ratings or seller ratings.
- Payment collection.
- Redesigning listing management outside the Request panel.

## User Flow

### New request

The request card shows the product, buyer identifier, quantity, note, price, and response deadline. The primary action is **Accept request** and the secondary action is **Decline**.

### Accepted request

The same card remains visible and advances to the next stage. It displays available buyer contact methods and explains that inventory is reserved. The primary action becomes **Confirm trade completed** and the secondary action becomes **Trade did not complete**.

### Completed or unsuccessful request

Completed requests move to history with a completion timestamp. If the seller marks a trade unsuccessful, the request is cancelled, reserved inventory is restored, and the product becomes available when its restored quantity is greater than zero.

## State Model

```text
sent
  -> accepted
      -> completed
      -> cancelled
  -> declined
  -> expired
```

- `sent`: waiting for the seller response.
- `accepted`: seller accepted; requested quantity is reserved and contact details are available.
- `completed`: handoff is confirmed; reserved inventory remains deducted.
- `cancelled`: accepted trade did not complete; reserved quantity is restored.
- `declined`: seller rejected the request.
- `expired`: the response window elapsed before acceptance or rejection.

The schema must add `completed` to the allowed `trade_requests.status` values. Existing `accepted` rows remain accepted and can be completed or cancelled through the redesigned panel.

## Inventory Consistency

Accept, complete, and cancel transitions must be atomic database operations.

- Accept may transition only from `sent` and may reserve no more than the currently available quantity.
- Complete may transition only from `accepted` and does not deduct inventory again.
- Cancel may transition only from `accepted` and restores the request quantity exactly once.
- Repeated or stale operations return `409 Conflict` with the latest request and inventory state.
- Concurrent acceptance attempts lock or conditionally update the relevant rows so inventory cannot become negative.
- Transaction state is committed before notifications are sent. Notification failure is logged and does not roll back a valid trade transition.

Supabase database functions or equivalent transactional SQL should own these multi-row transitions. The API must not perform independent request and product updates that can partially succeed.

## Request Panel

### Desktop

Use a large centered dialog with a clear title, unread count, close button, stage filters, and a scrollable request list. Opening a notification focuses and briefly highlights the corresponding request.

### Mobile

Use a near-full-screen bottom sheet. Keep the current request's primary action in a stable bottom action area so it remains visible without covering content.

### Request card hierarchy

1. Product image, name, quantity, price, and status.
2. Current stage and one sentence explaining the next step.
3. Buyer note and, after acceptance, contact methods.
4. One visually dominant primary action and one secondary action.

Buttons show a busy state while saving and remain disabled until the server returns the authoritative result. Destructive actions require a short confirmation dialog that states the inventory consequence.

## Proactive Opening Rules

The panel opens automatically for actionable events:

- Seller receives a new request.
- Buyer receives an accepted or declined result.
- Either party receives a cancellation relevant to them.
- A pending request approaches its response deadline.

Safeguards:

- Each event automatically opens the panel at most once per user.
- If another modal is open or the user is editing a form or uploading files, show a prominent non-blocking notification first and defer panel opening until the blocking activity ends.
- Closing the panel suppresses immediate reopening for the same event, while the unread indicator remains.
- Informational refreshes update content without opening the panel.
- Clicking an in-app or browser notification opens the same panel and focuses the related request.

The notification record should be marked read only after the relevant request is visible, not merely when the unread count is fetched.

## Error Handling

- Display server errors inside the affected request card and retain the user's current panel position.
- On `409 Conflict`, refresh that request and explain that its state changed elsewhere.
- If contact information cannot load after acceptance, preserve the accepted state and offer a retry.
- If notification delivery fails, record the failure for observability but do not report the transaction update as failed.
- If the panel cannot load, keep the unread indicator and provide a retry action.

## API and Data Changes

- Add `completed` to the request status constraint.
- Add transactional operations for accept, complete, and cancel-after-acceptance.
- Return the authoritative request and product state from every mutation.
- Include available buyer contact methods for accepted requests.
- Include notification event and request identifiers so the client can deduplicate automatic opening and focus the correct card.
- Reuse the existing notification polling or refresh mechanism; do not add realtime infrastructure solely for this redesign unless polling proves too slow in production.

## Testing and Acceptance Criteria

### Logic tests

- Each legal transition succeeds and each illegal transition returns a conflict.
- Accept reserves inventory once.
- Complete does not deduct inventory twice.
- Cancel restores inventory once.
- Concurrent accepts cannot oversell.
- Existing accepted requests can be completed or cancelled.

### UI tests

- A new actionable event opens the panel and focuses the correct request.
- The same event does not reopen after dismissal.
- Active forms and uploads defer automatic opening.
- Accepting a request changes the same card to the contact and completion stage.
- Completing or cancelling moves the request to history with the correct result.
- Primary actions remain visible and usable on desktop and mobile viewports.

### End-to-end acceptance

1. Buyer submits a request.
2. Seller sees the Request panel open automatically.
3. Seller accepts from that card.
4. The card immediately shows contact details and completion actions.
5. Seller confirms completion; inventory and request history are correct.
6. Repeat with **Trade did not complete**; inventory is restored and the listing is available again.

## Rollout

Run the schema migration first, deploy the API transitions second, and enable the redesigned panel last. Keep existing accepted requests supported throughout. If the panel causes production issues, disable proactive opening while retaining the new state transitions and allow users to open the panel manually.
