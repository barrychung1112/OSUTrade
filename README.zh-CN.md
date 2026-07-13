# OSUTrade

**语言：** [English](README.md) | [繁體中文](README.zh-TW.md) | 简体中文

> 为校园与本地社区打造的二手物品交易平台。用户可以浏览商品、发送交易请求、发布想买清单，也能用 AI 更快创建完整刊登。

<img width="1566" height="902" alt="OSUTrade marketplace screenshot" src="https://github.com/user-attachments/assets/e4e35792-4a17-40db-901a-36efa5133709" />

[GitHub Repository](https://github.com/barrychung1112/OSUTrade) | [Discord Community](https://discord.gg/BqqAmmjJR) | [打赏 OSUTrade](https://buymeacoffee.com/osutrade)

## OSUTrade 是什么？

OSUTrade 是一个为校园与本地社区设计的 full-stack marketplace。用户可以发布二手物品、免登录浏览目前可交易商品，并且只在卖家接受交易请求后才交换联系方式。

产品目前聚焦在四件事：

- **降低浏览门槛：** 访客可以先浏览市场与商品页，看见价值后再登录。
- **更安全的交易流程：** 买家先发送请求，卖家接受后才公开联系方式。
- **提升卖家上架效率：** 支持多张照片、AI 草稿、翻译与建议价格。
- **收集买家需求：** 用户可以发布想买清单，当新商品符合需求时收到通知。

## 目前 MVP 功能

| 模块 | 已支持功能 |
| --- | --- |
| 公开市场 | 未登录也能浏览 `/overview` 与商品详情页；只有发送交易请求、发布商品、卖家工具与个人请求资料需要登录。 |
| 商品发布 | 可创建商品名称、详细说明、分类、价格、数量、状态，以及 1 到 3 张照片。 |
| 多语言商品内容 | 商品名称与说明可翻译成英文、繁中、简中，并按照用户选择的语言显示。 |
| AI 批量上架 | 上传照片后生成 AI 商品草稿，可编辑字段、勾选草稿并一次发布多个商品。 |
| AI 建议价格 | 根据 OSUTrade 类似商品、商品细节与新品价格背景，提供二手定价建议。 |
| 跨平台文案 | 可根据商品草稿生成外部社交平台使用的贴文文案。 |
| 购买请求车 | 买家可以先把商品加入请求车，调整数量并留下给卖家的备注。 |
| 数量限制 | 买家不能发送超过可售库存的请求数量。 |
| 重复请求防护 | 同一买家不能对同一商品重复发送 active request，必须等原请求被拒绝或结束后才能再次发送。 |
| Request 流程 | 支持等待、已接受、已拒绝、已取消、已逾期等状态，并用进度式状态呈现。 |
| 回复期限 | 卖家需要在期限内回复新请求；已逾期请求会和未逾期请求分开显示。 |
| 价格快照 | 请求会保留发送当下的价格；如果卖家后续改价，active buyer 会收到提示。 |
| 卖家 Dashboard | 卖家可以编辑商品、更新状态、管理库存、接受或拒绝买家请求。 |
| 选填联系方式 | 卖家可填电话、Line ID、微信 ID；只有在接受请求后才分享给买家。 |
| 想买清单 | 买家可以输入想要的物品、预算与订阅状态；新商品符合条件时可收到通知。 |
| 通知 | 支持站内通知，以及通过 Resend 设置交易通知与想买清单 email。 |
| 登录 | 支持 Email/password 与 Google 第三方登录；若内嵌浏览器阻挡 Google 登录，会提示改用 Safari 或 Chrome。 |
| 打赏 | 首页提供 Buy Me a Coffee 链接，支持自愿打赏。 |
| API 文档 | `/docs/swagger` 提供 Swagger UI。 |

## 使用流程

### 买家

1. 免登录浏览市场或商品详情页。
2. 将商品加入购买请求车。
3. 准备发送交易请求时登录。
4. 选择数量、填写备注并发送 request。
5. 在 **需求** 页跟踪 request 状态。
6. 若卖家接受，查看卖家联系方式并安排取货。
7. 也可以创建 **想买清单**，让系统在有相关新商品时通知你。

### 卖家

1. 登录后进入 **发布商品**。
2. 创建单一商品，或使用 **AI 批量上架** 从照片生成草稿。
3. 填写说明、价格、数量、分类，以及 1 到 3 张照片。
4. 选填电话、Line ID 或微信 ID，供已接受的买家查看。
5. 需要价格参考时，可使用 AI 建议价格。
6. 在 **卖家** 页管理商品库存与买家请求。
7. 在回复期限内接受或拒绝 request。

## 技术架构

- **Framework:** Next.js 15, React 19, TypeScript
- **UI:** Radix UI, Tailwind CSS, lucide-react
- **Auth:** NextAuth，支持 Email/password 与 Google OAuth
- **Database & Storage:** Supabase Postgres、Supabase Auth、Supabase Storage
- **AI:** OpenAI API，用于翻译、建议价格、AI 批量上架与跨平台文案
- **Email:** Resend，可选的交易通知 email
- **Testing:** Vitest、Testing Library、Playwright smoke checks
- **Deployment:** Vercel

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 创建环境变量

由 `.env.example` 创建 `.env.local`：

```bash
cp .env.example .env.local
```

填入需要的设置：

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

注意事项：

- `SUPABASE_SERVICE_ROLE_KEY` 只能用于 server-side。
- `OPENAI_API_KEY` 对基本 UI 测试不是必填，但 AI 翻译、AI 批量上架、建议价格与跨平台文案都需要它。
- `EMAIL_PROVIDER=console` 会把 email 输出留在 log；若要真的寄信，请改用 `EMAIL_PROVIDER=resend`，并设置 `RESEND_API_KEY` 与 `EMAIL_FROM`。
- 如果部署环境同时设置 `AUTH_SECRET` 与 `NEXTAUTH_SECRET`，两者应保持一致。
- 不要把真实 secret commit 到 repository。

Google OAuth redirect URI：

- Local: `http://localhost:3000/api/auth/callback/google`
- Production: `https://osutrade.com/api/auth/callback/google`

### 3. 建立 Supabase Schema

执行：

```text
supabase/mvp-schema.sql
```

这份 SQL 会创建或更新：

- `users`
- `products`
- `trade_requests`
- `wanted_requests`
- `wanted_request_matches`
- `notifications`
- `user_presence`
- `product-images` storage bucket

### 4. 启动开发服务器

```bash
npm run dev
```

打开：

```text
http://localhost:3000
```

## 常用命令

```bash
npm run dev
npm run build
npm run start
npm test -- --run
npx tsc --noEmit
```

## 主要路由

| 路由 | 用途 |
| --- | --- |
| `/` | 首页、产品介绍、市场入口与打赏区块。 |
| `/overview` | 公开市场浏览。 |
| `/product/[id]` | 公开商品详情与加入请求车流程。 |
| `/sell` | 商品发布、AI 批量上架、图片上传、建议价格。 |
| `/cart` | 购买请求车与发送交易请求。 |
| `/requests` | 买家 request 跟踪与想买清单；未登录时会显示登录提示。 |
| `/seller` | 卖家 Dashboard、商品库存与收到的请求。 |
| `/docs/swagger` | API 文档。 |

## 作者

**Barry Chung**

Barry Chung 是 OSUTrade 的创作者，将这个项目打造为实用的校园二手交易 full-stack marketplace。项目结合产品思维、marketplace UX、Supabase 工作流程、多语言支持，以及 AI 辅助卖家工具。

- GitHub: [barrychung1112](https://github.com/barrychung1112)
- Project: [OSUTrade](https://github.com/barrychung1112/OSUTrade)
- Discord: [OSUTrade Community](https://discord.gg/BqqAmmjJR)
- 打赏: [打赏 OSUTrade](https://buymeacoffee.com/osutrade)

打赏是支持 OSUTrade 开发与运营成本的自愿付款，并非慈善募款。

## 愿景

OSUTrade 目标成为一个轻量、可信任的本地校园 marketplace：足够简单，让用户能快速发布；足够有结构，能支持认真的交易流程；也足够贴心，在双方准备好联系之前保护用户信息。
