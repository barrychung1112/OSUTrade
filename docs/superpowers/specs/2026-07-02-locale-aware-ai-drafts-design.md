# Locale-Aware AI Drafts Design

## Goal

Generate bulk-listing drafts in the user's current site language, preserve that language throughout draft editing, translate products when they are published, and generate cross-platform copy in each platform's required language.

## Language Rules

- Supported request locales are `en`, `zh`, and `zhCn`.
- The browser sends the current locale when requesting AI bulk drafts.
- `en` produces English draft names and descriptions.
- `zh` produces Traditional Chinese draft names and descriptions.
- `zhCn` produces Simplified Chinese draft names and descriptions.
- A generated draft keeps its original request language even if the user later changes the site language.
- Regenerating drafts uses the site language active at the time of the new request.

## Bulk Draft API

`POST /api/products/bulk-drafts` accepts an additional `locale` field. The route validates it against the supported locale set and rejects unsupported values with HTTP 400. The locale is converted into an explicit language instruction in the OpenAI prompt; the model must not mix languages within a draft.

The API response adds `locale` to each normalized draft. It still returns only one editable name and description per draft, avoiding three-language output during image analysis.

## Draft Editing

The AI draft review card displays a small language badge using the draft's fixed locale. Name and description remain normal editable fields. Changing the global site language does not replace or translate existing draft edits.

## Product Publishing

Publishing continues through `POST /api/products`. The existing server-side translation pipeline translates the final edited name and description into English, Traditional Chinese, and Simplified Chinese, then stores all variants in the existing multilingual product columns.

No database migration is required. Marketplace cards and product pages continue using `pickProductName` and `pickProductDescription` to select the stored translation for the active site locale.

## Cross-Platform Preview

Cross-platform output is independent from the draft language:

- Facebook: English
- Craigslist: English
- Discord: English
- LINE: Traditional Chinese
- WeChat: Simplified Chinese

The cross-post preview request continues to batch all selected items into one AI request. A successful response must contain complete English, Traditional Chinese, and Simplified Chinese item translations plus a heading for every platform. Copy assembly uses the platform-to-language mapping rather than the draft locale.

The current fallback can repeat the source language across platforms, which violates this contract. If complete localized output cannot be produced, the endpoint returns an explicit translation error and the UI keeps the user in review mode with a retry action. It must not present same-language text as a successful multilingual preview.

## Error Handling

- Missing or unsupported draft locale: HTTP 400 with a user-safe message.
- OpenAI bulk-draft failure: existing AI provider error behavior remains.
- Incomplete or invalid cross-platform translations: HTTP 502 with code `CROSS_POST_TRANSLATION_FAILED`.
- Existing drafts and manually created listings remain compatible.

## Testing

- Verify each supported locale produces the correct prompt language instruction.
- Verify unsupported locales are rejected before storage or OpenAI calls.
- Verify parsed drafts retain their request locale.
- Verify changing the site locale does not mutate existing draft content.
- Verify every platform receives the expected language.
- Verify incomplete AI localization returns an error instead of same-language fallback.
- Run the complete Vitest suite, TypeScript compiler, production build, and Playwright checks at mobile and desktop widths.
