# Restore Accepted Request Design

## Goal

Allow a seller to close an accepted request when the handoff does not happen, restore the reserved inventory, and make the listing available and editable again.

## Behavior

- An accepted request shows a seller-only **Transaction did not complete** action.
- The action changes the request from `accepted` to `cancelled`.
- The request quantity is added back to the listing's current quantity.
- A `pending` or `available` listing becomes `available` after restoration.
- The buyer receives a notification explaining that the seller closed the trade and the item is available again.
- Repeating the action, or cancelling a request that is not accepted, returns a conflict and never adds inventory twice.

## Consistency

The API updates the request with an `accepted` status guard, then restores the product with current quantity and status guards. If product restoration fails, the API compensates by returning the request to `accepted`. No database migration is required because `cancelled` already exists in the request status constraint.

## Verification

- Unit tests cover the accepted cancellation transition and invalid states.
- Notification tests cover buyer-facing cancellation copy.
- Route tests verify inventory restoration, optimistic guards, and compensation behavior.
- The full test suite and production build must pass before review and merge.
