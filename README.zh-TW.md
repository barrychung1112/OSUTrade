# OSUTrade

**語言：** [English](README.md) | 繁體中文 | [简体中文](README.zh-CN.md)

> 一個以校園社群為核心的二手物品交易平台，支援商品刊登、瀏覽、購買請求，以及更安全的買賣雙方聯絡流程。

OSUTrade 是為校園與在地社群打造的 full-stack marketplace。它協助使用者刊登閒置物品、尋找價格友善的二手商品，並且只在賣家接受交易請求後才揭露聯絡資訊。

產品重點放在三件事：清楚的商品資訊、更安全的聯絡流程，以及多語系可用性。

[GitHub Repository](https://github.com/barrychung1112/OSUTrade) | [Discord Community](https://discord.gg/BqqAmmjJR) | [打賞 OSUTrade](https://buymeacoffee.com/osutrade)

## 專案介紹

OSUTrade 讓校園二手交易更容易：

- 賣家可以建立商品刊登，包含照片、分類、價格、數量與商品狀態。
- 買家可以瀏覽市集、篩選商品，並把商品加入購買請求購物車。
- 買家送出包含數量與備註的交易請求，不需要一開始就公開聯絡方式。
- 賣家可以在賣家 Dashboard 接受或拒絕請求。
- 聯絡 email 只會在請求被接受後才顯示。
- 介面支援英文、繁體中文與簡體中文。
- 新商品可以儲存 AI 產生的多語商品名稱，讓市集跟著使用者語系顯示。
- 賣家可以使用 AI 定價建議，估算合理的二手售價。

## 為什麼需要它

校園二手交易常散落在聊天群組、社群貼文和試算表裡，導致搜尋、比較、追蹤請求與安全交換聯絡方式都不方便。

OSUTrade 將這些流程集中在同一個地方：

- **對買家：** 瀏覽可購買商品、指定需要的數量，並追蹤交易請求狀態。
- **對賣家：** 管理刊登商品、掌握庫存，並在同一個 Dashboard 回覆買家。
- **對社群：** 讓物品重複使用更簡單，減少浪費，也讓實惠商品在在地社群中流通。

## 核心功能

| 區塊 | 功能 |
| --- | --- |
| 市集 | 瀏覽商品、查看詳情、依在地化商品名稱搜尋，並依分類篩選。 |
| 商品刊登 | 建立包含價格、分類、圖片、數量與狀態的商品。 |
| 購買請求購物車 | 在聯絡賣家前，先將商品加入類似購物車的請求流程。 |
| 數量限制 | 買家不能請求超過賣家目前庫存的數量。 |
| 買家請求 | 追蹤已送出、已接受、已拒絕與已取消的請求。 |
| 賣家 Dashboard | 管理商品、更新狀態，並處理買家請求。 |
| 安全聯絡流程 | 只有在賣家接受請求後，買賣雙方 email 才會顯示。 |
| 多語系 | 支援英文、繁體中文與簡體中文切換。 |
| AI 翻譯 | 新商品名稱可翻譯成支援語言並存入 Supabase。 |
| AI 定價建議 | 依據本地市場訊號與新品價格脈絡，建議二手售價。 |
| API 文件 | 可透過 Swagger UI 探索 API。 |

## 產品流程

### 買家

1. 瀏覽市集。
2. 開啟商品詳情頁。
3. 將商品與數量加入購買請求購物車。
4. 加入給賣家的備註。
5. 送出請求。
6. 從 **Requests** 追蹤請求狀態。
7. 如果請求被接受，使用顯示出的賣家 email 安排取貨或交易。

### 賣家

1. 從 **Sell** 建立商品刊登。
2. 視需要使用 AI 定價建議。
3. 透過多語市集體驗確認商品名稱翻譯。
4. 從 **Seller** 管理庫存與商品狀態。
5. 接受或拒絕買家請求。
6. 只在接受請求後分享聯絡資訊。

## 技術架構

- **Framework:** Next.js 15, React 19, TypeScript
- **UI:** Radix UI, Tailwind CSS, lucide-react
- **Auth & Database:** Supabase, NextAuth
- **Testing:** Vitest, Testing Library
- **AI:** OpenAI API 用於定價建議與商品名稱翻譯
- **Deployment:** Vercel

## 使用說明

### 1. 安裝依賴

```bash
npm install
```

### 2. 建立環境變數

從 `.env.example` 建立 `.env.local`：

```bash
cp .env.example .env.local
```

接著填入必要值：

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

注意事項：

- `OPENAI_API_KEY` 對本機 UI 測試是選填，但 AI 定價與翻譯功能需要它。
- 請使用新的私密金鑰，且不要把任何 secret commit 到 repository。
- `SUPABASE_SERVICE_ROLE_KEY` 只能在 server-side 使用。

### 3. 建立 Supabase schema

執行以下 SQL 檔：

```text
supabase/mvp-schema.sql
```

至少商品翻譯功能需要：

```sql
alter table public.products
  add column if not exists name_en text,
  add column if not exists name_zh_tw text,
  add column if not exists name_zh_cn text;
```

### 4. 啟動本機開發伺服器

```bash
npm run dev
```

開啟：

```text
http://localhost:3000
```

## 常用指令

```bash
npm run dev
npm run build
npm run start
npm test -- --run
```

## 主要路由

| 路由 | 用途 |
| --- | --- |
| `/` | 產品首頁與入口。 |
| `/overview` | 市集瀏覽體驗。 |
| `/product/[id]` | 商品詳情與加入購買請求流程。 |
| `/sell` | 賣家刊登表單與 AI 定價建議。 |
| `/cart` | 購買請求購物車與買家請求送出。 |
| `/requests` | 買家請求追蹤。 |
| `/seller` | 賣家 Dashboard，管理商品與收到的請求。 |
| `/docs/swagger` | API 文件。 |

## 作者介紹

**Barry Chung**

Barry Chung 是 OSUTrade 的創作者，將這個專案打造為一個實用的校園二手交易 full-stack marketplace。專案結合產品思維、marketplace UX、Supabase 工作流程、多語系支援，以及 AI 輔助賣家工具。

- GitHub: [barrychung1112](https://github.com/barrychung1112)
- Project: [OSUTrade](https://github.com/barrychung1112/OSUTrade)
- Discord: [OSUTrade Community](https://discord.gg/BqqAmmjJR)
- 打賞: [打賞 OSUTrade](https://buymeacoffee.com/osutrade)

打賞是支持 OSUTrade 開發與營運成本的自願付款，並非慈善募款。

## 願景

OSUTrade 目標成為一個輕量、可信任的在地校園 marketplace：足夠簡單，讓使用者能快速刊登；足夠有結構，能支援認真的交易流程；也足夠貼心，在雙方準備好聯絡之前保護使用者資訊。
