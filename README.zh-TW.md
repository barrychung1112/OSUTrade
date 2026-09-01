# OSUTrade

**語言：** [English](README.md) | 繁體中文 | [简体中文](README.zh-CN.md)

> 為校園與在地社群打造的二手物品交易平台。使用者可以瀏覽商品、送出交易需求、發布想買清單，也能用 AI 更快建立完整刊登。

<img width="1566" height="902" alt="OSUTrade marketplace screenshot" src="https://github.com/user-attachments/assets/e4e35792-4a17-40db-901a-36efa5133709" />

[GitHub Repository](https://github.com/barrychung1112/OSUTrade) | [Discord Community](https://discord.gg/BqqAmmjJR) | [打賞 OSUTrade](https://buymeacoffee.com/osutrade)

## OSUTrade 是什麼？

OSUTrade 是一個為校園與在地社群設計的 full-stack marketplace。使用者可以刊登二手物品、免登入瀏覽目前可交易商品，並且只在賣家接受交易需求後才交換聯絡資訊。

產品目前聚焦在四件事：

- **降低瀏覽門檻：** 訪客可以先瀏覽市集與商品頁，看見價值後再登入。
- **更安全的交易流程：** 買家先送出需求，賣家接受後才揭露聯絡方式。
- **提升賣家上架效率：** 支援多張照片、AI 草稿、翻譯與建議價格。
- **收集買家需求：** 使用者可以發布想買清單，當新商品符合需求時收到通知。

## 目前 MVP 功能

| 模組 | 已支援功能 |
| --- | --- |
| 公開市集 | 未登入也能瀏覽 `/overview` 與商品詳情頁；只有送出交易需求、刊登商品、賣家工具與個人需求資料需要登入。 |
| 商品刊登 | 可建立商品名稱、詳細說明、分類、價格、數量、狀態，以及 1 到 3 張照片。 |
| 多語系商品內容 | 商品名稱與說明可翻譯成英文、繁中、簡中，並依照使用者選擇的語系顯示。 |
| AI 批量上架 | 上傳照片後產生 AI 商品草稿，可編輯欄位、勾選草稿並一次發布多個商品。 |
| AI 建議價格 | 根據 OSUTrade 類似商品、商品細節與新品價格脈絡，提供二手定價建議。 |
| 跨平台文案 | 可根據商品草稿產生外部社群平台使用的貼文文案。 |
| 購買需求車 | 買家可以先把商品加入需求車，調整數量並留下給賣家的備註。 |
| 數量限制 | 買家不能送出超過可售庫存的需求數量。 |
| 重複需求防護 | 同一買家不能對同一商品重複送出 active request，必須等原需求被拒絕或結束後才能再次送出。 |
| Request 流程 | 支援等待、已接受、已完成、已拒絕、已取消、已逾期等狀態；重要更新會主動打開 Request Center 並定位到該筆交易。 |
| 回覆期限 | 賣家需要在期限內回覆新需求；已逾期需求會和未逾期需求分開顯示。 |
| 價格快照 | 需求會保留送出當下的價格；若賣家後續改價，active buyer 會收到提示。 |
| 賣家 Dashboard | 賣家可以編輯商品、更新狀態、管理庫存、接受或拒絕買家需求。 |
| 選填聯絡方式 | 賣家可填電話、Line ID、微信 ID；只有在接受需求後才分享給買家。 |
| 想買清單 | 買家可以輸入想要的物品、預算與訂閱狀態；新商品符合條件時可收到通知。 |
| 通知 | 支援站內通知，以及透過 Resend 設定交易通知與想買清單 email。 |
| 登入 | 支援 Email/password 與 Google 第三方登入；若內嵌瀏覽器阻擋 Google 登入，會提示改用 Safari 或 Chrome。 |
| 打賞 | 首頁提供 Buy Me a Coffee 連結，支援自願打賞。 |
| API 文件 | `/docs/swagger` 提供 Swagger UI。 |

## 使用流程

### 買家

1. 免登入瀏覽市集或商品詳情頁。
2. 將商品加入購買需求車。
3. 準備送出交易需求時登入。
4. 選擇數量、填寫備註並送出 request。
5. 在 **需求** 頁追蹤 request 狀態。
6. 若賣家接受，查看賣家聯絡方式並安排取貨。
7. 也可以建立 **想買清單**，讓系統在有相關新商品時通知你。

### 賣家

1. 登入後進入 **刊登商品**。
2. 建立單一商品，或使用 **AI 批量上架** 從照片產生草稿。
3. 填寫說明、價格、數量、分類，以及 1 到 3 張照片。
4. 選填電話、Line ID 或微信 ID，供已接受的買家查看。
5. 需要價格參考時，可使用 AI 建議價格。
6. 在 **賣家** 頁管理商品庫存與買家需求。
7. 在回覆期限內接受或拒絕 request。
8. 接受後在同一張 Request Center 卡片聯絡買家，並確認完成；若交易未完成，系統會恢復庫存。

## 技術架構

- **Framework:** Next.js 15, React 19, TypeScript
- **UI:** Radix UI, Tailwind CSS, lucide-react
- **Auth:** NextAuth，支援 Email/password 與 Google OAuth
- **Database & Storage:** Supabase Postgres、Supabase Auth、Supabase Storage
- **AI:** OpenAI API，用於翻譯、建議價格、AI 批量上架與跨平台文案
- **Email:** Resend，可選的交易通知 email
- **Testing:** Vitest、Testing Library、Playwright smoke checks
- **Deployment:** Vercel

## 本機開發

### 1. 安裝依賴

```bash
npm install
```

### 2. 建立環境變數

由 `.env.example` 建立 `.env.local`：

```bash
cp .env.example .env.local
```

填入需要的設定：

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

注意事項：

- `SUPABASE_SERVICE_ROLE_KEY` 只能用在 server-side。
- `OPENAI_API_KEY` 對基本 UI 測試不是必填，但 AI 翻譯、AI 批量上架、建議價格與跨平台文案都需要它。
- `EMAIL_PROVIDER=console` 會把 email 輸出留在 log；若要真的寄信，請改用 `EMAIL_PROVIDER=resend`，並設定 `RESEND_API_KEY` 與 `EMAIL_FROM`。
- 如果部署環境同時設定 `AUTH_SECRET` 與 `NEXTAUTH_SECRET`，兩者應保持一致。
- 不要把真實 secret commit 到 repository。

Google OAuth redirect URI：

- Local: `http://localhost:3000/api/auth/callback/google`
- Production: `https://osutrade.com/api/auth/callback/google`

### 3. 建立 Supabase Schema

執行：

```text
supabase/mvp-schema.sql
```

這份 SQL 會建立或更新：

- `users`
- `products`
- `trade_requests`
- `wanted_requests`
- `wanted_request_matches`
- `notifications`
- `user_presence`
- `product-images` storage bucket

### 4. 啟動開發伺服器

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
npx tsc --noEmit
```

## 主要路由

| 路由 | 用途 |
| --- | --- |
| `/` | 首頁、產品介紹、市集入口與打賞區塊。 |
| `/overview` | 公開市集瀏覽。 |
| `/product/[id]` | 公開商品詳情與加入需求車流程。 |
| `/sell` | 商品刊登、AI 批量上架、圖片上傳、建議價格。 |
| `/cart` | 購買需求車與送出交易需求。 |
| `/requests` | 買家 request 追蹤與想買清單；未登入時會顯示登入提示。 |
| `/seller` | 賣家 Dashboard、商品庫存與收到的需求。 |
| `/docs/swagger` | API 文件。 |

## 作者

**Barry Chung**

Barry Chung 是 OSUTrade 的創作者，將這個專案打造為實用的校園二手交易 full-stack marketplace。專案結合產品思維、marketplace UX、Supabase 工作流程、多語系支援，以及 AI 輔助賣家工具。

- GitHub: [barrychung1112](https://github.com/barrychung1112)
- Project: [OSUTrade](https://github.com/barrychung1112/OSUTrade)
- Discord: [OSUTrade Community](https://discord.gg/BqqAmmjJR)
- 打賞: [打賞 OSUTrade](https://buymeacoffee.com/osutrade)

打賞是支持 OSUTrade 開發與營運成本的自願付款，並非慈善募款。

## 願景

OSUTrade 目標成為一個輕量、可信任的在地校園 marketplace：足夠簡單，讓使用者能快速刊登；足夠有結構，能支援認真的交易流程；也足夠貼心，在雙方準備好聯絡之前保護使用者資訊。
