# OSUTrade

**Language:** English | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md)

> A campus-first secondhand marketplace for listing, browsing, and requesting used items with a safer buyer-seller workflow.

OSUTrade is a full-stack marketplace built for campus communities. It helps students and local users list unused items, discover affordable secondhand goods, and contact sellers only after a trade request is accepted.

The product focuses on three things: clear listings, safer contact flow, and multilingual accessibility.

[GitHub Repository](https://github.com/barrychung1112/OSUTrade) | [Discord Community](https://discord.gg/BqqAmmjJR) | [Tip OSUTrade](https://buymeacoffee.com/osutrade)

## Project Overview

OSUTrade makes secondhand trading easier for campus life:

- Sellers can create listings with product photos, category, price, quantity, and status.
- Buyers can browse the marketplace, filter listings, and add items to a request cart.
- Buyers send trade requests with quantity and notes instead of exposing contact details immediately.
- Sellers can accept or decline requests from a seller dashboard.
- Contact emails are revealed only after a request is accepted.
- The interface supports English, Traditional Chinese, and Simplified Chinese.
- New listings can store AI-generated translated product names so the marketplace follows the selected language.
- Sellers can use an AI pricing advisor to estimate a reasonable secondhand price.

## Why It Matters

Campus secondhand trading often happens across scattered chats, social posts, and spreadsheets. That makes it hard to search, compare, track requests, and know when it is safe to share contact information.

OSUTrade brings that workflow into one place:

- **For buyers:** browse available items, request exactly the quantity needed, and track request status.
- **For sellers:** manage listings, control inventory, and respond to buyers from one dashboard.
- **For the community:** make reuse easier, reduce waste, and keep affordable goods circulating locally.

## Core Features

| Area | Feature |
| --- | --- |
| Marketplace | Browse products, view details, search by localized product name, and filter by category. |
| Listing | Create product listings with price, category, image, quantity, and availability status. |
| Request Cart | Add items to a cart-like request flow before contacting sellers. |
| Quantity Control | Buyers cannot request more units than the seller has available. |
| Buyer Requests | Track sent, accepted, declined, and cancelled requests. |
| Seller Dashboard | Manage listings, update status, and handle buyer requests. |
| Safer Contact Flow | Buyer and seller emails are shown only after a seller accepts a request. |
| Internationalization | Switch between English, Traditional Chinese, and Simplified Chinese. |
| AI Translation | Translate new listing names into supported languages and store them in Supabase. |
| AI Pricing Advisor | Suggest a secondhand price using local marketplace signals and new-price context. |
| API Docs | Swagger UI is available for API exploration. |

## Product Flow

### Buyer

1. Browse the marketplace.
2. Open a product detail page.
3. Add the item and quantity to the request cart.
4. Add a note for the seller.
5. Send the request.
6. Track the request status from **Requests**.
7. If accepted, use the revealed seller email to arrange pickup.

### Seller

1. Create a listing from **Sell**.
2. Optionally use the AI pricing advisor.
3. Review translated product names through the multilingual marketplace experience.
4. Manage inventory and item status from **Seller**.
5. Accept or decline buyer requests.
6. Share contact information only after accepting a request.

## Tech Stack

- **Framework:** Next.js 15, React 19, TypeScript
- **UI:** Radix UI, Tailwind CSS, lucide-react
- **Auth & Database:** Supabase, NextAuth
- **Testing:** Vitest, Testing Library
- **AI:** OpenAI API for pricing advice and product-name translation
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
```

Notes:

- `OPENAI_API_KEY` is optional for local UI testing, but AI pricing and translation need it.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are required in local `.env.local` and Vercel for Google sign-in.
- Use a fresh private key and never commit secrets to the repository.
- `SUPABASE_SERVICE_ROLE_KEY` must only be used server-side.

Google OAuth redirect URIs:

- Local: `http://localhost:3000/api/auth/callback/google`
- Production: `https://osutrade.com/api/auth/callback/google`

### 3. Set up Supabase schema

Run the SQL in:

```text
supabase/mvp-schema.sql
```

At minimum, product translation support requires:

```sql
alter table public.products
  add column if not exists name_en text,
  add column if not exists name_zh_tw text,
  add column if not exists name_zh_cn text;
```

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
```

## Main Routes

| Route | Purpose |
| --- | --- |
| `/` | Product landing page and entry point. |
| `/overview` | Marketplace browsing experience. |
| `/product/[id]` | Product details and add-to-cart flow. |
| `/sell` | Seller listing form and AI pricing advisor. |
| `/cart` | Request cart and buyer request submission. |
| `/requests` | Buyer request tracking. |
| `/seller` | Seller dashboard for listings and incoming requests. |
| `/docs/swagger` | API documentation. |

## Author

**Barry Chung**

Barry Chung is the creator of OSUTrade, building the project as a practical full-stack marketplace for campus secondhand trading. The project combines product thinking, marketplace UX, Supabase-backed workflows, multilingual support, and AI-assisted seller tools.

- GitHub: [barrychung1112](https://github.com/barrychung1112)
- Project: [OSUTrade](https://github.com/barrychung1112/OSUTrade)
- Discord: [OSUTrade Community](https://discord.gg/BqqAmmjJR)
- Tips: [Tip OSUTrade](https://buymeacoffee.com/osutrade)

Tips are voluntary payments that support OSUTrade development and operating costs. They are not charity fundraising.

## Vision

OSUTrade aims to become a lightweight, trusted marketplace for local campus communities: easy enough for quick listings, structured enough for serious transactions, and thoughtful enough to protect users until both sides are ready to connect.
