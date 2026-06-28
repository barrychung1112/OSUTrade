# 上架前跨平台文案預覽設計

日期：2026-06-27

## 背景

OSUTrade 已有兩種上架流程：一般單品上架，以及 AI 批次草稿上架；賣家儀表板也已有針對已上架商品的批次跨平台文案功能。目前賣家若想在上架時同時準備社群貼文，必須先完成上架，再到賣家儀表板重新選取商品。

本功能要在 `/sell` 上架頁面提供「AI 產生跨平台貼文」，讓使用者在商品寫入資料庫前先檢視並編輯 Facebook、Craigslist、LINE、WeChat、Discord 文案。商品成功上架後，系統才把真實 OSUTrade 商品連結加入最終可複製內容。

## 目標

- 一般單品與 AI 批次上架都支援上架前文案預覽。
- Facebook、Craigslist、Discord 使用英文；LINE 使用繁體中文；WeChat 使用簡體中文。
- 每個平台都有獨立、可編輯的標題與內文。
- 預覽文案不寫入商品資料庫，也不新增 schema 欄位。
- 上架成功後保留使用者修改，只補上真實 OSUTrade 商品連結。
- 批次部分失敗時，只加入成功商品的連結，失敗草稿仍可重試。
- 結構化聯絡資料不傳給文案 API、不交給 AI，也不加入文案。
- 保留既有直接上架流程，不強迫所有使用者產生文案。

## 非目標

- 不自動發文到 Facebook、Craigslist、LINE、WeChat 或 Discord。
- 不持久化文案、文案修改紀錄或預覽 session。
- 不在預覽階段預先建立隱藏商品或保留商品 ID。
- 不修改賣家儀表板既有的已上架商品批次文案功能。
- 不讓 AI 決定價格、數量、分類或 OSUTrade 連結。

## 使用流程

### 一般單品

1. 使用者填寫既有商品表單。
2. 使用者可選擇既有「上架商品」，直接走目前流程。
3. 使用者也可選擇「AI 產生跨平台貼文」。
4. 系統先執行與上架相同的必要欄位驗證，但不建立商品，也不先上傳本機圖片。
5. 預覽成功後，頁面進入文案審閱階段，商品欄位暫時鎖定。
6. 使用者在五個平台分頁中編輯標題與內文。
7. 頁面固定顯示提示：

   > 此為上架前預覽，尚未包含 OSUTrade 商品連結。商品成功上架後，系統會自動補上連結並產生最終文案。

8. 使用者可按「返回修改商品」。返回後捨棄目前預覽，修改完成後必須重新產生文案。
9. 使用者按「確認上架並完成貼文」後，系統才上傳圖片並建立商品。
10. 上架成功後停留在最終文案畫面，不執行目前 1.8 秒自動跳轉。
11. 最終畫面保留五平台分頁、使用者修改內容、唯讀 OSUTrade 連結區，以及複製按鈕。

### AI 批次上架

1. 使用者先透過既有 AI 圖片分析取得可編輯商品草稿。
2. 使用者選取 1 至 10 個尚未成功上架的草稿。
3. 既有「直接上架已選商品」保留；旁邊新增「AI 產生跨平台貼文」。
4. 新按鈕針對所有已選草稿產生一篇批次貼文，並顯示相同的五平台分頁。
5. 預覽階段鎖定草稿內容、刪除操作與選取狀態，避免預覽與實際上架資料不同。
6. 使用者可編輯每個平台的標題與內文，或返回草稿編輯階段後重新生成。
7. 使用者確認後，系統沿用既有逐項圖片上傳與商品建立流程。
8. 每次成功建立商品後，前端記錄回傳的商品 ID、名稱與 canonical URL。
9. 最終連結區只列出成功商品。失敗草稿保持錯誤狀態並可重試。
10. 後續重試成功時，依累積成功商品重新計算唯讀連結區，不重複加入同一商品連結。

## 介面設計

### 按鈕

- 一般單品 footer 保留主要動作「上架商品」，新增次要動作「AI 產生跨平台貼文」。
- AI 批次 sticky action bar 保留「直接上架已選商品」，新增「AI 產生跨平台貼文」。
- 產生預覽時按鈕顯示 loading 並避免重複送出。
- 文案審閱階段提供「返回修改商品」與「確認上架並完成貼文」。

### 五平台編輯器

- 使用既有平台順序：Facebook、Craigslist、LINE、WeChat、Discord。
- 分頁使用 segmented tab/按鈕，清楚標示目前平台。
- 標題使用單行 input，內文使用 textarea。
- 切換平台時保存所有未送出的前端修改。
- AI 或 fallback 來源可以沿用既有來源標籤。
- 上架前顯示連結尚未產生的提示。
- 上架後在 textarea 下方顯示唯讀 OSUTrade 連結區；複製時將標題、編輯後內文與連結區組合。

### 前端狀態

建議將共用文案狀態抽成明確型別與 helper：

- `CrossPostPreviewItem`：預覽商品事實與穩定的 `clientId`。
- `EditableCrossPostCopy`：平台、語言、可編輯標題與可編輯內文。
- `PublishedCrossPostProduct`：`clientId`、商品 ID、顯示名稱與 canonical URL。
- `CrossPostPreviewStage`：`idle | generating | reviewing | publishing | finalized`。

文案與已上架商品連結分開保存。使用者只編輯標題與內文；canonical links 由程式管理，避免被刪除、重複或改成錯誤網址。

## API 與模組邊界

### 新增預覽 API

`POST /api/products/cross-post-preview`

要求：

- 必須登入。
- 接受 1 至 10 個 `items`。
- 每個 item 僅接受 `clientId`、名稱、描述、價格、數量與分類。
- Request 若包含聯絡資訊或任意 product URL，API 回傳 400，且不呼叫 AI。
- 驗證價格為正數、數量為正整數、`clientId` 唯一、平台輸出完整。
- 回傳 `source` 與固定五平台的 editable copies。
- 不寫入 Supabase。

預覽不依賴公開圖片 URL。本機圖片尚未上傳時，不把暫時的 object URL 傳給伺服器或放進社群貼文；最終 OSUTrade 商品頁負責呈現圖片。

### 預覽文案產生器

新增獨立的預覽產生器，避免改變已上架商品 cross-post API 的契約。一次 AI structured-output 呼叫回傳：

- 每個 `clientId` 的英文、繁體中文、簡體中文名稱與描述。
- 五平台的標題與 introduction。

伺服器驗證 item 數量、`clientId`、平台唯一性與必要文字後，再以 deterministic assembler 組裝價格、分類、數量與翻譯後商品資訊。AI 不直接產生價格、數量、分類、連結或聯絡方式。

若 AI 不可用、超時或格式錯誤，回傳規則式 fallback。Fallback 的平台標題、欄位標籤與提示使用指定語言；無法翻譯的商品名稱與描述保留原始文字，並標示 `source: "fallback"` 供使用者審閱。

### 商品建立 helper

將一般單品現有 `onSubmit` 中的圖片上傳與 `POST /api/products` 拆成可重用函式，成功時回傳 `Product`：

- 直接上架流程沿用目前成功畫面與自動跳轉。
- 文案確認流程使用同一函式，但成功後不自動跳轉，改進入 `finalized`。

將批次 `publishBulkDrafts` 拆出可回傳逐項結果的 helper：

- `successes` 包含實際 API 回傳的商品資料。
- `failures` 包含對應 draft ID 與錯誤訊息。
- 直接批次上架與文案確認流程共用相同上架邏輯。

### 最終文案組合

新增純函式，根據平台語言與成功商品產生唯讀連結區：

- 英文平台使用 `OSUTrade listings`。
- LINE 使用繁體中文標題。
- WeChat 使用簡體中文標題。
- 每項包含商品顯示名稱與 canonical URL。
- 以商品 ID 去重並維持上架順序。
- 複製內容為 `title + edited body + managed link section`。

此函式不修改 editable body，因此使用者修改永遠保留，重試也不會重複附加連結。

## 資料與隱私

- 文案預覽、編輯內容與目前平台只存在 React state。
- 重新整理、關閉頁面或離開 `/sell` 後不保留。
- 不新增 Supabase migration 或 products 欄位。
- `contactPhone`、`contactLineId`、`contactWechatId` 不包含在預覽 API request、AI prompt 或最終組合器輸入。
- 商品上架本身仍依現有行為保存聯絡資料，與文案功能分離。
- canonical URL 必須由商品建立 API 回傳的 ID與目前可信 origin 組合，不接受 client-provided URL。

## 錯誤與競態處理

- 預覽 API 失敗：不建立商品，保持表單可編輯並提供重試。
- 使用者在預覽請求完成前切換模式、換圖片或重新產生：使用 request token 忽略舊回應。
- 進入 reviewing 後鎖定商品資料；返回修改會失效並清除舊預覽。
- 一般單品上架失敗：保留表單與五平台編輯內容，允許再次確認。
- 批次部分失敗：已成功商品不可再次上架；失敗草稿可重試，累積成功集合負責最終連結。
- 批次全部失敗：維持 reviewing/publishing error 狀態，不顯示空連結區。
- API 回傳缺少任一平台或有重複平台：視為無效，使用完整 fallback，不混合部分 AI 結果。
- 防止預覽、直接上架、確認上架同時執行，避免重複商品。

## 測試策略

### 單元測試

- 預覽 request 正規化：1 至 10 項、唯一 `clientId`、合法價格與數量。
- 五平台語言與順序固定。
- deterministic item facts 不被 AI 輸出覆蓋。
- AI response 缺漏、重複、錯誤 ID、超時與非 2xx 時完整 fallback。
- prompt 與 serialized request 不包含任何聯絡資訊。
- 使用者編輯 title/body 後，最終連結組合不改動編輯內容。
- 連結依成功順序、去重、平台語言與重試結果正確生成。

### API 測試

- 未登入回傳 401。
- 空陣列、超過 10 項、無效 item 回傳 400。
- 預覽 API 不呼叫 Supabase 寫入。
- API 不接受 client-provided URL 或 contact fields。
- AI 成功與 fallback 都回傳五平台。

### UI 與 Playwright

- 一般單品可直接上架，既有流程不回歸。
- 「AI 產生跨平台貼文」不會提前建立商品。
- 單品與批次都顯示五平台分頁，切換後編輯值保留。
- 預覽提示、返回修改、欄位鎖定與重新生成行為正確。
- 確認上架後補入真實連結，且不自動跳轉。
- 批次部分失敗只顯示成功連結，失敗草稿可重試。
- 390px mobile 與 desktop 無溢位、重疊或不可操作控制項。

## 驗收條件

- 一般單品與 AI 批次模式都有「AI 產生跨平台貼文」。
- 預覽發生在任何商品寫入之前，並明確提示尚無 OSUTrade 連結。
- Facebook、Craigslist、LINE、WeChat、Discord 都可獨立編輯標題與內文。
- 確認上架後保留所有編輯，並在複製內容中加入真實、不可由使用者偽造的商品連結。
- 批次文案包含全部成功上架商品，不包含失敗商品。
- 文案不寫入資料庫，聯絡資訊不進入文案或 AI request。
- 直接上架與賣家儀表板既有跨平台文案功能維持可用。
