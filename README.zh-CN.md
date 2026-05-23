# OSUTrade

**语言：** [English](README.md) | [繁體中文](README.zh-TW.md) | 简体中文

> 一个以校园社区为核心的二手物品交易平台，支持商品发布、浏览、购买请求，以及更安全的买卖双方联系流程。

OSUTrade 是为校园与本地社区打造的 full-stack marketplace。它帮助用户发布闲置物品、寻找价格友好的二手商品，并且只在卖家接受交易请求后才公开联系方式。

产品重点放在三件事：清晰的商品信息、更安全的联系流程，以及多语言可用性。

[GitHub Repository](https://github.com/barrychung1112/OSUTrade) | [Discord Community](https://discord.gg/BqqAmmjJR) | [Buy Me a Coffee](https://buymeacoffee.com/osutrade)

## 项目介绍

OSUTrade 让校园二手交易更容易：

- 卖家可以创建商品发布，包含照片、分类、价格、数量与商品状态。
- 买家可以浏览市场、筛选商品，并把商品加入购买请求购物车。
- 买家提交包含数量与备注的交易请求，不需要一开始就公开联系方式。
- 卖家可以在卖家 Dashboard 接受或拒绝请求。
- 联系 email 只会在请求被接受后才显示。
- 界面支持英文、繁体中文与简体中文。
- 新商品可以保存 AI 生成的多语言商品名称，让市场跟随用户语言显示。
- 卖家可以使用 AI 定价建议，估算合理的二手售价。

## 为什么需要它

校园二手交易常散落在聊天群、社交帖文和电子表格里，导致搜索、比较、跟踪请求与安全交换联系方式都不方便。

OSUTrade 将这些流程集中在同一个地方：

- **对买家：** 浏览可购买商品、指定需要的数量，并跟踪交易请求状态。
- **对卖家：** 管理发布商品、掌握库存，并在同一个 Dashboard 回复买家。
- **对社区：** 让物品重复使用更简单，减少浪费，也让实惠商品在本地社区中流通。

## 核心功能

| 区块 | 功能 |
| --- | --- |
| 市场 | 浏览商品、查看详情、按本地化商品名称搜索，并按分类筛选。 |
| 商品发布 | 创建包含价格、分类、图片、数量与状态的商品。 |
| 购买请求购物车 | 在联系卖家前，先将商品加入类似购物车的请求流程。 |
| 数量限制 | 买家不能请求超过卖家当前库存的数量。 |
| 买家请求 | 跟踪已提交、已接受、已拒绝与已取消的请求。 |
| 卖家 Dashboard | 管理商品、更新状态，并处理买家请求。 |
| 安全联系流程 | 只有在卖家接受请求后，买卖双方 email 才会显示。 |
| 多语言 | 支持英文、繁体中文与简体中文切换。 |
| AI 翻译 | 新商品名称可翻译成支持语言并存入 Supabase。 |
| AI 定价建议 | 根据本地市场信号与新品价格语境，建议二手售价。 |
| API 文档 | 可通过 Swagger UI 探索 API。 |

## 产品流程

### 买家

1. 浏览市场。
2. 打开商品详情页。
3. 将商品与数量加入购买请求购物车。
4. 加入给卖家的备注。
5. 提交请求。
6. 从 **Requests** 跟踪请求状态。
7. 如果请求被接受，使用显示出的卖家 email 安排取货或交易。

### 卖家

1. 从 **Sell** 创建商品发布。
2. 视需要使用 AI 定价建议。
3. 通过多语言市场体验确认商品名称翻译。
4. 从 **Seller** 管理库存与商品状态。
5. 接受或拒绝买家请求。
6. 只在接受请求后分享联系方式。

## 技术架构

- **Framework:** Next.js 15, React 19, TypeScript
- **UI:** Radix UI, Tailwind CSS, lucide-react
- **Auth & Database:** Supabase, NextAuth
- **Testing:** Vitest, Testing Library
- **AI:** OpenAI API 用于定价建议与商品名称翻译
- **Deployment:** Vercel

## 使用说明

### 1. 安装依赖

```bash
npm install
```

### 2. 创建环境变量

从 `.env.example` 创建 `.env.local`：

```bash
cp .env.example .env.local
```

然后填入必要值：

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-publishable-or-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-server-only-service-role-key"
AUTH_SECRET="your-auth-secret"
AUTH_BASE_URL="http://localhost:3000"
ENABLE_DEMO_PRODUCTS="false"
OPENAI_API_KEY=""
OPENAI_PRICING_MODEL="gpt-4.1-mini"
OPENAI_TRANSLATION_MODEL="gpt-4.1-mini"
```

注意事项：

- `OPENAI_API_KEY` 对本地 UI 测试是选填，但 AI 定价与翻译功能需要它。
- 请使用新的私密密钥，且不要把任何 secret commit 到 repository。
- `SUPABASE_SERVICE_ROLE_KEY` 只能在 server-side 使用。

### 3. 建立 Supabase schema

执行以下 SQL 文件：

```text
supabase/mvp-schema.sql
```

至少商品翻译功能需要：

```sql
alter table public.products
  add column if not exists name_en text,
  add column if not exists name_zh_tw text,
  add column if not exists name_zh_cn text;
```

### 4. 启动本地开发服务器

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
```

## 主要路由

| 路由 | 用途 |
| --- | --- |
| `/` | 产品首页与入口。 |
| `/overview` | 市场浏览体验。 |
| `/product/[id]` | 商品详情与加入购买请求流程。 |
| `/sell` | 卖家发布表单与 AI 定价建议。 |
| `/cart` | 购买请求购物车与买家请求提交。 |
| `/requests` | 买家请求跟踪。 |
| `/seller` | 卖家 Dashboard，管理商品与收到的请求。 |
| `/docs/swagger` | API 文档。 |

## 作者介绍

**Barry Chung**

Barry Chung 是 OSUTrade 的创作者，将这个项目打造为一个实用的校园二手交易 full-stack marketplace。项目结合产品思维、marketplace UX、Supabase 工作流程、多语言支持，以及 AI 辅助卖家工具。

- GitHub: [barrychung1112](https://github.com/barrychung1112)
- Project: [OSUTrade](https://github.com/barrychung1112/OSUTrade)
- Discord: [OSUTrade Community](https://discord.gg/BqqAmmjJR)
- Support: [Buy Me a Coffee](https://buymeacoffee.com/osutrade)

## 愿景

OSUTrade 目标成为一个轻量、可信任的本地校园 marketplace：足够简单，让用户能快速发布；足够有结构，能支持认真的交易流程；也足够贴心，在双方准备好联系之前保护用户信息。
