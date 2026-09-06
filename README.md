# OSUTrade

**Language:** English | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md)

> A campus-first secondhand marketplace where students can browse listings, send trade requests, post wanted items, and use AI to create better listings faster.

<img width="1566" height="902" alt="OSUTrade marketplace screenshot" src="https://github.com/user-attachments/assets/e4e35792-4a17-40db-901a-36efa5133709" />

[GitHub Repository](https://github.com/barrychung1112/OSUTrade) | [Discord Community](https://discord.gg/BqqAmmjJR) | [Tip OSUTrade](https://buymeacoffee.com/osutrade)

## What Is OSUTrade?

OSUTrade is a full-stack marketplace built for campus and local communities. It helps users list secondhand items, browse available goods without signing in, and only share contact information after a seller accepts a buyer request.

The product focuses on four things:

- **Lower friction discovery:** visitors can browse the marketplace and product pages before creating an account.
- **Safer trading:** buyers send requests first; contact details are revealed only after acceptance.
- **Seller speed:** sellers can upload multiple photos, use AI drafts, translate listings, and get pricing guidance.
- **Buyer demand signals:** users can subscribe to wanted-item requests and get notified when matching listings appear.

## Current MVP Features

| Area | What is supported |
| --- | --- |
| Public marketplace | Browse `/overview` and product detail pages without logging in. Login is required only for sending requests, listing items, seller tools, and personal request data. |
| Product listings | Create listings with name, description, category, price, quantity, status, and 1 to 3 photos. |
| Listing localization | Product names and descriptions can be translated into English, Traditional Chinese, and Simplified Chinese, then displayed according to the selected language. |
| AI bulk listing | Upload photos, generate AI listing drafts, edit fields, select drafts, and publish multiple listings from the Sell page. |
| AI pricing advisor | Suggest a secondhand price using OSUTrade comparable listings, item details, and new-price context. |
| Cross-platform copy | Generate social post copy for external promotion from listing drafts. |
| Request cart | Buyers add items to a cart-like request flow, choose quantity, and leave notes for sellers. |
| Quantity guardrails | Buyers cannot request more units than available inventory. |
| Duplicate request protection | A buyer cannot send another active request for the same item until the previous request is declined or closed. |
| Request lifecycle | Requests support waiting, accepted, completed, declined, cancelled, and expired states. Important updates open the Request Center and focus the relevant trade. |
| Response window | Sellers have a response window for new requests. Expired requests are separated from active ones. |
| Price snapshot | Requests preserve the price at request time and notify active buyers if a seller changes the price later. |
| Seller dashboard | Sellers can edit listings, update status, manage quantity, and accept or decline buyer requests. |
| Optional seller contact methods | Sellers may add phone, Line ID, and WeChat ID; these are shared only after a request is accepted. |
| Wanted items | Buyers can post what they want, set a target price, subscribe to email alerts, and get matched with new related listings. |
| Notifications | In-app notifications and optional Resend email notifications for trade activity and wanted-item matches. |
| Authentication | Email/password login plus Google sign-in support. Embedded-browser Google sign-in guidance is shown when needed. |
| Funding panel | Buy Me a Coffee support link for voluntary tips. |
| API docs | Swagger UI is available at `/docs/swagger`. |

## Product Flow

### Buyer

1. Browse the marketplace or product detail pages without signing in.
2. Add a listing to the request cart.
3. Sign in when ready to send a trade request.
4. Choose quantity, add a note, and submit the request.
5. Track request status from **Requests**.
6. If accepted, view the seller contact details and arrange pickup.
7. Optionally create a **Wanted Item** subscription for things you want to buy later.

### Seller

1. Sign in and open **Sell**.
2. Create a single listing or use **AI bulk listing** to generate drafts from photos.
3. Add description, price, quantity, category, and 1 to 3 photos.
4. Optionally add phone, Line ID, or WeChat ID for accepted buyers.
5. Use the AI pricing advisor if a price benchmark is needed.
6. Manage inventory and incoming requests from **Seller**.
7. Accept or decline requests before the response window expires.
8. After acceptance, use the same Request Center card to contact the buyer and confirm completion or restore inventory when the trade does not complete.

## Tech Stack

- **Framework:** Next.js 15, React 19, TypeScript
- **UI:** Radix UI, Tailwind CSS, lucide-react
- **Auth:** NextAuth with email/password and Google OAuth
- **Database & Storage:** Supabase Postgres, Supabase Auth, Supabase Storage
- **AI:** OpenAI API for translation, pricing advice, bulk listing drafts, and cross-platform post copy
- **Email:** Resend optional transactional emails
- **Testing:** Vitest, Testing Library, Playwright smoke checks
- **Deployment:** Vercel

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment variables

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Then fill in the required values:

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-publishable-or-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-server-only-service-role-key"
AUTH_SECRET="your-auth-secret"
AUTH_BASE_URL="http://localhost:3000"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
ENABLE_DEMO_PRODUCTS="false"
OPENAI_API_KEY=""
OPENAI_PRICING_MODEL="gpt-4.1-mini"
OPENAI_TRANSLATION_MODEL="gpt-4.1-mini"
OPENAI_BULK_LISTING_MODEL="gpt-4.1-mini"
OPENAI_CROSS_POST_MODEL="gpt-4.1-mini"
EMAIL_PROVIDER="console"
RESEND_API_KEY=""
EMAIL_FROM="OSUTrade <no-reply@osutrade.com>"
FUNDING_GOAL_USD="2000"
FUNDING_RAISED_USD="0"
FUNDING_CURRENCY="USD"
FUNDING_SUPPORT_URL="https://buymeacoffee.com/osutrade"
```

Notes:

- Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only.
- `OPENAI_API_KEY` is optional for basic UI testing, but AI translation, AI bulk listing, pricing advice, and cross-platform copy require it.
- `EMAIL_PROVIDER=console` keeps email output in logs. Use `EMAIL_PROVIDER=resend` with `RESEND_API_KEY` and `EMAIL_FROM` to send real emails.
- `AUTH_SECRET` and `NEXTAUTH_SECRET` should match if both are configured in a deployment environment.
- Never commit real secrets to the repository.

Google OAuth redirect URIs:

- Local: `http://localhost:3000/api/auth/callback/google`
- Production: `https://osutrade.com/api/auth/callback/google`

### 3. Set up Supabase

Run the schema SQL in:

```text
supabase/mvp-schema.sql
```

This creates or updates the core tables and policies for:

- `users`
- `products`
- `trade_requests`
- `wanted_requests`
- `wanted_request_matches`
- `notifications`
- `user_presence`
- `product-images` storage bucket

### 4. Start the local development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Useful Commands

```bash
npm run dev
npm run build
npm run start
npm test -- --run
npx tsc --noEmit
```

## Main Routes

| Route | Purpose |
| --- | --- |
| `/` | Home page, product value proposition, marketplace entry, funding panel. |
| `/overview` | Public marketplace browsing experience. |
| `/product/[id]` | Public product detail page and add-to-cart flow. |
| `/sell` | Seller listing form, AI bulk listing, image upload, pricing advisor. |
| `/cart` | Request cart and buyer request submission. |
| `/requests` | Buyer request tracking and wanted-item subscriptions. Shows a login prompt when signed out. |
| `/seller` | Seller dashboard for listings, inventory, and incoming requests. |
| `/docs/swagger` | API documentation. |

## Author

**Barry Chung**

Barry Chung is the creator of OSUTrade, building it as a practical full-stack marketplace for campus secondhand trading. The project combines product thinking, marketplace UX, Supabase-backed workflows, multilingual support, and AI-assisted seller tools.

- GitHub: [barrychung1112](https://github.com/barrychung1112)
- Project: [OSUTrade](https://github.com/barrychung1112/OSUTrade)
- Discord: [OSUTrade Community](https://discord.gg/BqqAmmjJR)
- Tips: [Tip OSUTrade](https://buymeacoffee.com/osutrade)

Tips are voluntary payments that support OSUTrade development and operating costs. They are not charity fundraising.

## Vision

OSUTrade aims to become a lightweight, trusted marketplace for local campus communities: simple enough for quick listings, structured enough for serious transactions, and thoughtful enough to protect users until both sides are ready to connect.
