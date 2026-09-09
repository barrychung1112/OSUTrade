# Trade Message Polling Design

## Goal

Keep accepted-trade conversations, unread counts, and Request Center notifications without requiring a browser-held Supabase JWT or Supabase Realtime configuration.

## Decision

Auth.js remains the only browser identity. The existing authenticated message routes remain the only path that reads or writes message content. When a conversation is visible, the browser refreshes its messages every eight seconds. Request summaries continue to refresh on the existing Request Center cadence, which updates unread badges while the conversation is closed.

## Scope

- Retain message tables, accepted-request access rules, idempotent sends, read acknowledgements, and durable in-app notifications.
- Replace the Realtime subscription with a timer owned by `TradeMessageConversation`.
- Remove the custom JWT route, signing helper, browser Realtime helper, `jose` package, and all Realtime-specific variables.
- Remove the Realtime policy and trigger from both schema SQL files. No message text or metadata is sent through Realtime.

## Behaviour

- Opening or changing a conversation loads it immediately and starts an eight-second refresh timer.
- A failed background refresh leaves existing messages on screen and shows a non-blocking reconnect notice; a manual retry still loads immediately.
- Sending a message keeps its optimistic and idempotent behaviour. A successful send is followed by the normal next poll.
- Closing, switching, or unmounting a conversation clears its timer.

## Verification

- Component tests prove the timer refreshes the visible conversation and is cleaned up on switch/unmount.
- Existing route, access, unread, and request-center tests remain green.
- The schema test proves no Realtime policy or broadcast trigger remains.
- Build and targeted tests pass before updating the PR.
