# Bulk Draft Field Labels Design

## Goal

Make every AI-generated listing field understandable on mobile, with an unmistakable USD price input.

## Design

- Keep the existing OSUTrade orange, white, and neutral visual system.
- Show persistent labels above item name, description, price, quantity, and category.
- Render a non-editable `$` prefix inside the price input while keeping the stored value numeric.
- Use decimal and numeric mobile keyboards for price and quantity.
- Stack fields on narrow screens and use a balanced three-column row for price, quantity, and category at `sm` and above.
- Preserve all existing draft update, validation, selection, deletion, and publishing behavior.

## Accessibility

- Associate every label with its control using `htmlFor` and a stable ID derived from the draft ID.
- Keep existing accessible names and disabled behavior.
- Do not rely on placeholder text or field order to communicate meaning.

## Verification

- Component tests verify all visible labels, the `$` prefix, field values, and update callbacks.
- Run the complete Vitest suite and TypeScript compiler.
- Verify the AI draft card at mobile and desktop widths with Playwright.
