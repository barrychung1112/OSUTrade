# Seasonal Guides and Homepage SEO Design

## Goal

Turn OSUTrade's homepage into a seasonally relevant, locally useful entry
point for Oregon State University students in Corvallis, while preserving a
single stable homepage URL and the existing marketplace flow. Add six
server-rendered, language-specific guides that support move-in and move-out
search intent without making unsupported marketplace, payment, or university
affiliation claims.

## Seasonal Contract

The server selects the experience from the current calendar month in
`America/Los_Angeles`:

- **Move-out:** April through July.
- **Move-in:** August through November.
- **Evergreen marketplace:** December through March.

The server passes the resolved season to the homepage. The browser does not
recalculate it from its own clock, IP address, or locale, so the initial SSR
HTML and hydrated interface cannot disagree at a seasonal boundary.

The homepage URL remains `/`. Its title and description remain stable across
seasons so Google has one durable canonical target; only the visible hero
copy, guide CTA, and supporting merchandising emphasis change.

## Homepage Content and Search Intent

The homepage metadata is:

- Title: `OSUTrade | Used Furniture, Textbooks & Dorm Essentials in Corvallis`
- Description: a concise, truthful description that names Corvallis, Oregon
  State students, secondhand furniture, textbooks, appliances, dorm
  essentials, and local pickup.

The homepage has exactly one semantic `h1`. Its seasonal message is localized
in English, Traditional Chinese, and Simplified Chinese:

- Move-in helps new and returning students set up dorm or off-campus housing.
- Move-out helps students sell useful items before relocation.
- Evergreen explains the general Corvallis campus marketplace value.

The primary visible actions are the localized seasonal guide and marketplace
browse link. Selling remains available through the existing protected route,
but it is not allowed to displace those two discovery actions. Existing live
inventory sections continue to link to their localized product pages.

## Visual and Interaction Design

The homepage adopts the approved wider seasonal editorial composition:

- On desktop, the content area is approximately 62% left editorial copy and
  38% right essentials or listing panel. The left column has sufficient width
  for localized headings and copy; it is not the narrow layout from the first
  concept.
- The palette pairs deep green surfaces with warm orange primary actions, warm
  neutral backgrounds, and high-contrast dark text. It does not use Oregon
  State marks, crests, mascots, or wording that implies official affiliation.
- Category or essentials cards beneath the hero offer direct, crawlable links
  to relevant marketplace views. They supplement, rather than replace, the
  existing recent-listings and clearance content.
- On mobile, the columns stack, controls retain at least 44 by 44 CSS pixels,
  and no horizontal scrolling or clipped text is introduced.
- Hover and reveal effects use only opacity and transforms. They are disabled
  or reduced for `prefers-reduced-motion`; keyboard focus remains conspicuous.

The shared site header gains a localized `Guides` link. It targets the
move-in guide in the visitor's selected application language; each guide also
offers a visible localized link to its move-out counterpart. The guide and
marketplace navigation remains usable in both desktop and mobile menus.

## Guide URL and Rendering Contract

Create the following canonical public routes:

- `/en/guides/move-in`
- `/zh-tw/guides/move-in`
- `/zh-cn/guides/move-in`
- `/en/guides/move-out`
- `/zh-tw/guides/move-out`
- `/zh-cn/guides/move-out`

Use a typed, centralized locale-and-guide content source plus one shared
server-rendered guide page renderer. Route segments, localized UI copy,
metadata, and internal links derive from that source rather than copying six
independent pages. Invalid locale or guide segments return `notFound()`.

Each route renders localized content directly in the initial HTML and supplies:

- a self-referential canonical URL;
- reciprocal `en`, `zh-TW`, `zh-CN`, and `x-default` hreflang alternates;
- locale-correct title, description, Open Graph, and Twitter metadata; and
- `BreadcrumbList` JSON-LD for Home, Guides, and the active guide.

Move-in content covers dorm versus off-campus needs, useful first-week items,
and direct marketplace browse links. Move-out content covers selling timing,
truthful listing photos and condition descriptions, and safe local pickup.
Both guide types link to relevant browse results and the existing sell or
request paths. They state that OSUTrade is an independent marketplace, does
not process payments, and does not guarantee transactions where a safety or
transaction expectation could otherwise be implied.

## Shared Platform Integration

- Reuse `PublicLocale`, `publicLocales`, `localeInfo`, and the existing site
  URL metadata conventions in `app/lib/publicLocale.ts` and
  `app/lib/productMetadata.ts`.
- Add guide path helpers adjacent to the existing public URL helpers, so the
  header, homepage, guide renderer, sitemap, metadata, and tests use the same
  route contract.
- Add the six guide URLs to `app/sitemap.ts`; keep private, cart, request,
  seller, API, and unavailable-product URLs out of the sitemap.
- Keep the existing locale-aware product links and current authentication gate
  for `/sell` intact.
- Change marketplace product-card headings to a non-`h1` level where needed,
  so every public page keeps a coherent single-page heading hierarchy.

## Data Boundaries and Failure Behavior

No database migration, product schema change, new third-party service, large
image asset, carousel, or analytics integration is required. The guide content
is version-controlled application content. If public inventory cannot load,
the homepage still renders its seasonal message, guide link, and marketplace
CTA, while existing discovery sections show their established unavailable
state.

This scope does not approve publishing, removing, or changing inventory. It
also does not make a Google ranking or Google Ads approval guarantee.

## Verification

Automated coverage will prove:

- Pacific-time month boundaries resolve to the three approved seasons;
- every guide path, locale map, canonical, hreflang map, metadata, and
  breadcrumb payload is correct;
- invalid guide and locale combinations return `notFound()`;
- the sitemap contains every guide URL exactly once;
- the homepage emits one `h1`, localized seasonal copy, and working CTA paths;
- the header exposes the localized Guides link in desktop and mobile navigation;
- changed marketplace card headings no longer create multiple page-level
  headings; and
- the reduced-motion and responsive layouts retain focus, visible controls,
  and no horizontal overflow.

Before integration, run focused tests, the complete test suite, production
build, and browser checks at desktop and mobile widths for all three languages.
After deployment, verify production HTML for `/`, the six guide URLs,
`/sitemap.xml`, canonical and hreflang tags, JSON-LD, navigation, and live
CTA destinations.

## Out of Scope

- Product moderation or deleting existing listings.
- Changing payment handling, transaction guarantees, authentication policy, or
  marketplace database APIs.
- A separate evergreen guide, client-side seasonal switching, locale selection
  from IP or browser language, and duplicated per-language page components.
- University-affiliation claims, unverified claims of safety, and automatic
  social or advertising publishing.
