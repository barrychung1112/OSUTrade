# Sell Cross-Post Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在一般單品與 AI 批次上架流程中加入可編輯的五平台文案預覽，商品成功上架後保留修改並補上真實 OSUTrade 連結。

**Architecture:** 新增不寫入資料庫的 authenticated preview API，以一次 structured-output AI 呼叫產生商品翻譯與平台 heading，再由 deterministic code 組裝商品事實。前端共用一個五平台編輯器，將 editable title/body 與程式管理的 published links 分離；單品與批次上架共用既有商品建立流程，但回傳成功商品供 link composer 使用。

**Tech Stack:** Next.js 15 App Router、React 19、TypeScript、Radix UI、Tailwind CSS、Auth.js、OpenAI Responses API、Vitest、Testing Library、Playwright CLI

---

## 檔案與責任

- Modify: `app/lib/crossPostCopy.ts`：允許 deterministic assembler 在沒有 product URL 時建立預覽文案，並公開受控的 heading 組裝入口。
- Modify: `app/lib/crossPostCopy.test.ts`：保護既有已上架商品文案與無連結預覽行為。
- Create: `app/lib/crossPostPreview.ts`：預覽 request 型別、驗證、AI structured output、fallback 與聯絡欄位防護。
- Create: `app/lib/crossPostPreview.test.ts`：預覽產生器與 fallback 測試。
- Create: `app/api/products/cross-post-preview/route.ts`：authenticated、無 Supabase 寫入的預覽 API。
- Create: `app/api/products/cross-post-preview/route.test.ts`：auth、輸入驗證、禁用欄位與產生器呼叫測試。
- Create: `app/lib/crossPostFinalizer.ts`：成功商品去重、平台化 link section 與 clipboard composition。
- Create: `app/lib/crossPostFinalizer.test.ts`：保留使用者編輯、連結順序、語言與重試去重測試。
- Create: `app/components/CrossPostPreviewEditor.tsx`：單品與批次共用的五平台 editable editor。
- Create: `app/components/CrossPostPreviewEditor.test.tsx`：分頁、編輯值、提示與 final links rendering。
- Modify: `app/i18n.tsx`：英文、繁中、簡中預覽與確認流程文案。
- Modify: `app/sell/page.tsx`：單品與 AI 批次預覽、鎖定、確認上架、部分失敗重試與 final state。

### Task 1: 讓既有 deterministic cross-post assembler 支援無連結預覽

**Files:**
- Modify: `app/lib/crossPostCopy.ts`
- Modify: `app/lib/crossPostCopy.test.ts`

- [ ] **Step 1: 寫入失敗測試，證明可用指定 heading 組裝無連結文案**

在 `app/lib/crossPostCopy.test.ts` 新增：

```ts
import {
  assembleCrossPostCopies,
  type CrossPostHeadings,
} from "./crossPostCopy";

test("assembles preview copies without inventing OSUTrade links", () => {
  const headings: CrossPostHeadings = {
    facebook: { title: "Preview", introduction: "Available soon." },
    craigslist: { title: "Preview", introduction: "Available soon." },
    line: { title: "預覽", introduction: "商品即將上架。" },
    wechat: { title: "预览", introduction: "商品即将上架。" },
    discord: { title: "Preview", introduction: "Available soon." },
  };
  const previewListings = listings.map((listing) => ({
    ...listing,
    productUrl: undefined,
  }));

  const copies = assembleCrossPostCopies(previewListings, headings);

  expect(copies).toHaveLength(5);
  expect(copies.find((copy) => copy.platform === "facebook")?.title).toBe(
    "Preview"
  );
  expect(JSON.stringify(copies)).not.toContain("/product/");
});
```

- [ ] **Step 2: 執行測試確認 RED**

Run: `npm test -- --run app/lib/crossPostCopy.test.ts`

Expected: FAIL，因為 `assembleCrossPostCopies` 與 `CrossPostHeadings` 尚未 export，且 `productUrl` 尚未允許 `undefined`。

- [ ] **Step 3: 實作最小可重用組裝入口**

在 `app/lib/crossPostCopy.ts` 加入：

```ts
export type CrossPostHeading = {
  title: string;
  introduction: string;
};

export type CrossPostHeadings = Record<CrossPostPlatform, CrossPostHeading>;

export type CrossPostListing = {
  product: Product;
  productUrl?: string;
};

export function assembleCrossPostCopies(
  listings: CrossPostListing[],
  headings: CrossPostHeadings
): CrossPostCopy[] {
  return crossPostPlatforms.map((platform) =>
    assembleCopy(listings, platform, headings[platform])
  );
}
```

把 `buildFallbackCrossPostCopies` 改為先建立完整 `CrossPostHeadings`，再呼叫 `assembleCrossPostCopies`。既有 `generateCrossPostCopies` 的 AI success path 也改用同一入口，避免兩套平台迴圈。

- [ ] **Step 4: 執行 cross-post tests 確認 GREEN**

Run: `npm test -- --run app/lib/crossPostCopy.test.ts`

Expected: 原有 5 個測試與新增測試全部 PASS。

- [ ] **Step 5: 提交 Task 1**

```powershell
git add app/lib/crossPostCopy.ts app/lib/crossPostCopy.test.ts
git commit -m "Refactor cross-post copy assembly for previews"
```

### Task 2: 建立上架前預覽產生器

**Files:**
- Create: `app/lib/crossPostPreview.ts`
- Create: `app/lib/crossPostPreview.test.ts`

- [ ] **Step 1: 寫入 input validation 與 AI/fallback 失敗測試**

建立 `app/lib/crossPostPreview.test.ts`，至少包含：

```ts
const items = [
  {
    clientId: "manual-1",
    name: "Desk Lamp",
    description: "Warm LED light",
    price: 18,
    quantity: 1,
    category: "home",
  },
];

const validAiHeadings = crossPostPlatforms.map((platform) => ({
  platform,
  title: platform === "line" ? "校園好物" : platform === "wechat" ? "校园好物" : "Campus items",
  introduction:
    platform === "line"
      ? "商品即將上架。"
      : platform === "wechat"
        ? "商品即将上架。"
        : "These items will be listed soon.",
}));

test("rejects duplicate ids and invalid item facts", () => {
  expect(parseCrossPostPreviewItems([...items, items[0]])).toMatchObject({
    ok: false,
  });
  expect(
    parseCrossPostPreviewItems([{ ...items[0], price: 0 }])
  ).toMatchObject({ ok: false });
});

test("uses one AI result for localized facts and five headings", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => ({
      output_text: JSON.stringify({
        localizedItems: [
          {
            clientId: "manual-1",
            enName: "Desk Lamp",
            enDescription: "Warm LED light",
            zhTwName: "書桌燈",
            zhTwDescription: "暖色 LED 燈",
            zhCnName: "台灯",
            zhCnDescription: "暖色 LED 灯",
          },
        ],
        copies: validAiHeadings,
      }),
    }),
  })));

  const result = await generateCrossPostPreview(items);

  expect(result.source).toBe("ai");
  expect(result.copies).toHaveLength(5);
  expect(result.copies.find((copy) => copy.platform === "line")?.body).toContain(
    "書桌燈"
  );
  expect(JSON.stringify(result)).not.toContain("OSUTrade:");
});

test("falls back as one complete set when AI ids are incomplete", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => ({
      output_text: JSON.stringify({ localizedItems: [], copies: validAiHeadings }),
    }),
  })));
  const result = await generateCrossPostPreview(items);
  expect(result.source).toBe("fallback");
  expect(result.copies).toHaveLength(5);
});
```

另檢查 serialized request 不含 `contactPhone`、`contactLineId`、`contactWechatId`、`sellerContact`、`productUrl`。

- [ ] **Step 2: 執行測試確認 RED**

Run: `npm test -- --run app/lib/crossPostPreview.test.ts`

Expected: FAIL，因為 module 尚不存在。

- [ ] **Step 3: 實作型別與純驗證**

建立：

```ts
export const maxCrossPostPreviewItems = 10;

export type CrossPostFlowStage =
  | "idle"
  | "generating"
  | "reviewing"
  | "publishing"
  | "finalized";

export type CrossPostPreviewItem = {
  clientId: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  category: string;
};

export type PreviewItemParseResult =
  | { ok: true; items: CrossPostPreviewItem[] }
  | { ok: false; message: string };

export function parseCrossPostPreviewItems(value: unknown): PreviewItemParseResult;
export async function generateCrossPostPreview(
  items: CrossPostPreviewItem[]
): Promise<CrossPostGenerationResult>;
```

`parseCrossPostPreviewItems` 必須 enforce：array、1–10 項、唯一非空 `clientId`、非空 name、有限且大於 0 的 price、正整數 quantity，以及 normalize category/description。

- [ ] **Step 4: 實作單次 structured-output AI 呼叫**

Request schema 必須要求：

```ts
{
  localizedItems: Array<{
    clientId: string;
    enName: string;
    enDescription: string;
    zhTwName: string;
    zhTwDescription: string;
    zhCnName: string;
    zhCnDescription: string;
  }>;
  copies: Array<{
    platform: CrossPostPlatform;
    title: string;
    introduction: string;
  }>;
}
```

使用 `OPENAI_CROSS_POST_MODEL || "gpt-4.1-mini"`、15 秒 timeout 與 strict JSON schema。驗證 localized item ID 集合及五平台集合完整且唯一；成功後轉成含 `nameTranslations`、`descriptionTranslations` 的 Product-like objects，並以 `assembleCrossPostCopies` 組裝無 URL 文案。

Fallback 使用原始 name/description 填入三語 translation slots，再呼叫 `buildFallbackCrossPostCopies`，確保仍有五個可編輯平台結果。

- [ ] **Step 5: 執行 Task 2 tests 與既有 cross-post tests**

Run: `npm test -- --run app/lib/crossPostPreview.test.ts app/lib/crossPostCopy.test.ts`

Expected: 全部 PASS；AI request 只有允許的商品事實。

- [ ] **Step 6: 提交 Task 2**

```powershell
git add app/lib/crossPostPreview.ts app/lib/crossPostPreview.test.ts
git commit -m "Add pre-publish cross-post preview generator"
```

### Task 3: 新增 authenticated preview API

**Files:**
- Create: `app/api/products/cross-post-preview/route.ts`
- Create: `app/api/products/cross-post-preview/route.test.ts`

- [ ] **Step 1: 寫入 route 失敗測試**

測試 mock `auth` 與 `generateCrossPostPreview`，涵蓋：

```ts
const validItem = {
  clientId: "manual-1",
  name: "Desk Lamp",
  description: "Warm LED light",
  price: 18,
  quantity: 1,
  category: "home",
};

test("requires authentication", async () => {
  authMock.mockResolvedValue(null);
  const response = await POST(request({ items: [validItem] }));
  expect(response.status).toBe(401);
  expect(generateMock).not.toHaveBeenCalled();
});

test.each([
  { contactPhone: "541-555-0101" },
  { contactLineId: "private-line" },
  { contactWechatId: "private-wechat" },
  { productUrl: "https://attacker.example/product/1" },
])("rejects forbidden preview fields: %j", async (forbidden) => {
  authMock.mockResolvedValue({ user: { id: "seller-1" } });
  const response = await POST(
    request({ items: [{ ...validItem, ...forbidden }] })
  );
  expect(response.status).toBe(400);
  expect(generateMock).not.toHaveBeenCalled();
});

test("returns five preview copies without using Supabase", async () => {
  authMock.mockResolvedValue({ user: { id: "seller-1" } });
  generateMock.mockResolvedValue({ source: "fallback", copies: fiveCopies });

  const response = await POST(request({ items: [validItem] }));

  expect(response.status).toBe(200);
  expect(generateMock).toHaveBeenCalledWith([validItem]);
  await expect(response.json()).resolves.toEqual({
    source: "fallback",
    copies: fiveCopies,
  });
});
```

另外測試空 items、11 items、重複 clientId、無效 price/quantity 均為 400。

- [ ] **Step 2: 執行 route test 確認 RED**

Run: `npm test -- --run app/api/products/cross-post-preview/route.test.ts`

Expected: FAIL，因為 route 尚不存在。

- [ ] **Step 3: 實作 route**

Route 流程固定為：

```ts
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse;

  const body = await request.json().catch(() => null);
  if (hasForbiddenPreviewFields(body?.items)) return invalidResponse;

  const parsed = parseCrossPostPreviewItems(body?.items);
  if (!parsed.ok) return NextResponse.json({ message: parsed.message }, { status: 400 });

  const result = await generateCrossPostPreview(parsed.items);
  return NextResponse.json(result);
}
```

不要 import Supabase client。Catch block 只回傳通用 500，不回傳 upstream/OpenAI 原始錯誤。

- [ ] **Step 4: 執行 route 與 preview tests**

Run: `npm test -- --run app/api/products/cross-post-preview/route.test.ts app/lib/crossPostPreview.test.ts`

Expected: 全部 PASS。

- [ ] **Step 5: 提交 Task 3**

```powershell
git add app/api/products/cross-post-preview/route.ts app/api/products/cross-post-preview/route.test.ts
git commit -m "Add cross-post preview API"
```

### Task 4: 建立不可變的最終 OSUTrade 連結組合器

**Files:**
- Create: `app/lib/crossPostFinalizer.ts`
- Create: `app/lib/crossPostFinalizer.test.ts`

- [ ] **Step 1: 寫入 finalizer 失敗測試**

```ts
const editedCopy: CrossPostCopy = {
  platform: "line",
  language: "zhTw",
  title: "我修改的標題",
  body: "我修改的內文",
};

const product1 = {
  clientId: "a",
  productId: "p-1",
  name: "Desk Lamp",
  productUrl: "https://osutrade.example/product/p-1",
};
const product2 = {
  clientId: "b",
  productId: "p-2",
  name: "Monitor",
  productUrl: "https://osutrade.example/product/p-2",
};

test("preserves edits and appends managed links at copy time", () => {
  const text = composeCrossPostClipboardText(editedCopy, [
    { clientId: "a", productId: "p-1", name: "書桌燈", productUrl: "https://osutrade.example/product/p-1" },
    { clientId: "b", productId: "p-2", name: "螢幕", productUrl: "https://osutrade.example/product/p-2" },
  ]);
  expect(text).toContain("我修改的標題\n\n我修改的內文");
  expect(text).toContain("OSUTrade 商品連結");
  expect(text).toContain("/product/p-1");
  expect(text).toContain("/product/p-2");
});

test("deduplicates retried products while preserving first success order", () => {
  const section = buildManagedLinkSection("facebook", [product1, product1, product2]);
  expect(section.match(/product\/p-1/g)).toHaveLength(1);
  expect(section.indexOf("p-1")).toBeLessThan(section.indexOf("p-2"));
});

test("does not render an empty managed section before publishing", () => {
  expect(buildManagedLinkSection("wechat", [])).toBe("");
});
```

- [ ] **Step 2: 執行測試確認 RED**

Run: `npm test -- --run app/lib/crossPostFinalizer.test.ts`

Expected: FAIL，module 尚不存在。

- [ ] **Step 3: 實作 finalizer 純函式**

```ts
export type PublishedCrossPostProduct = {
  clientId: string;
  productId: string;
  name: string;
  productUrl: string;
};

export function buildManagedLinkSection(
  platform: CrossPostPlatform,
  products: PublishedCrossPostProduct[]
): string;

export function composeCrossPostClipboardText(
  copy: CrossPostCopy,
  products: PublishedCrossPostProduct[]
): string;
```

Heading map：英文平台 `OSUTrade listings`、LINE `OSUTrade 商品連結`、WeChat `OSUTrade 商品链接`。以 productId 去重，忽略空/無效 URL，輸出 `- name: URL`。Clipboard 內容只在 section 非空時加入第三段。

- [ ] **Step 4: 執行 finalizer tests 確認 GREEN**

Run: `npm test -- --run app/lib/crossPostFinalizer.test.ts`

Expected: 全部 PASS。

- [ ] **Step 5: 提交 Task 4**

```powershell
git add app/lib/crossPostFinalizer.ts app/lib/crossPostFinalizer.test.ts
git commit -m "Add cross-post link finalizer"
```

### Task 5: 建立共用五平台可編輯預覽元件與 i18n

**Files:**
- Create: `app/components/CrossPostPreviewEditor.tsx`
- Create: `app/components/CrossPostPreviewEditor.test.tsx`
- Modify: `app/i18n.tsx`

- [ ] **Step 1: 加入三語 i18n keys**

在 English、繁中、簡中 dictionaries 同步加入：

```ts
"sell.crossPostPreviewAction"
"sell.crossPostPreviewGenerating"
"sell.crossPostPreviewTitle"
"sell.crossPostPreviewNotice"
"sell.crossPostPreviewFallback"
"sell.crossPostPreviewBack"
"sell.crossPostPreviewConfirm"
"sell.crossPostPreviewRetry"
"sell.crossPostPreviewFinalTitle"
"sell.crossPostPreviewLinks"
"sell.crossPostPreviewCopy"
"sell.crossPostPreviewCopied"
"sell.crossPostPreviewError"
"sell.crossPostPublishPartial"
```

繁中 action 必須是「AI 產生跨平台貼文」；notice 必須清楚說明預覽尚無連結、上架成功後自動補入。

- [ ] **Step 2: 寫入 component 失敗測試**

使用 Testing Library render editor，驗證：

```tsx
const fiveCopies = crossPostPlatforms.map((platform) => ({
  platform,
  language: platformLanguage[platform],
  title: `${platform} title`,
  body: `${platform} body`,
}));

function Harness({ copies }: { copies: CrossPostCopy[] }) {
  const [value, setValue] = useState(copies);
  return (
    <CrossPostPreviewEditor
      copies={value}
      source="ai"
      publishedProducts={[]}
      busy={false}
      error={null}
      confirmLabel="Confirm"
      canGoBack={true}
      canConfirm={true}
      onCopiesChange={setValue}
      onBack={() => undefined}
      onConfirm={() => undefined}
    />
  );
}

test("keeps independent edits across all five platform tabs", async () => {
  render(<Harness copies={fiveCopies} />);
  await user.click(screen.getByRole("button", { name: "LINE" }));
  await user.clear(screen.getByLabelText("Post title"));
  await user.type(screen.getByLabelText("Post title"), "LINE edited");
  await user.click(screen.getByRole("button", { name: "Facebook" }));
  await user.click(screen.getByRole("button", { name: "LINE" }));
  expect(screen.getByLabelText("Post title")).toHaveValue("LINE edited");
});

test("shows the no-link notice before publish and managed links after publish", () => {
  // Render once with products=[] and once with publishedProducts=[product1].
});
```

- [ ] **Step 3: 執行 component test 確認 RED**

Run: `npm test -- --run app/components/CrossPostPreviewEditor.test.tsx`

Expected: FAIL，元件尚不存在。

- [ ] **Step 4: 實作 `CrossPostPreviewEditor`**

Props：

```ts
type CrossPostPreviewEditorProps = {
  copies: CrossPostCopy[];
  source: "ai" | "fallback";
  publishedProducts: PublishedCrossPostProduct[];
  busy: boolean;
  error: string | null;
  confirmLabel: string;
  canGoBack: boolean;
  canConfirm: boolean;
  onCopiesChange: (copies: CrossPostCopy[]) => void;
  onBack: () => void;
  onConfirm: () => void;
};
```

元件內部只管理 selected platform、copied platform 與本地 copy error。以 `crossPostPlatforms` 固定渲染 tabs；input/textarea update 時 immutable map copies。Preview 時顯示 notice；有 published products 時顯示 `buildManagedLinkSection` 的唯讀 `<pre>`。`canGoBack` 控制返回按鈕，`canConfirm` 控制確認或重試按鈕，finalized 時兩者皆可關閉。Copy button 使用 `composeCrossPostClipboardText`。

- [ ] **Step 5: 執行 component、finalizer 與 TypeScript checks**

Run: `npm test -- --run app/components/CrossPostPreviewEditor.test.tsx app/lib/crossPostFinalizer.test.ts && npx tsc --noEmit`

Expected: tests PASS，TypeScript exit 0。

- [ ] **Step 6: 提交 Task 5**

```powershell
git add app/components/CrossPostPreviewEditor.tsx app/components/CrossPostPreviewEditor.test.tsx app/i18n.tsx
git commit -m "Add editable cross-post preview editor"
```

### Task 6: 接上一般單品預覽與確認上架

**Files:**
- Modify: `app/sell/page.tsx`

- [ ] **Step 1: 抽出 manual preview request 與 publish helper**

在 `SellPage` 中加入：

```ts
const [manualCrossPostStage, setManualCrossPostStage] = useState<CrossPostFlowStage>("idle");
const [manualCrossPostCopies, setManualCrossPostCopies] = useState<CrossPostCopy[]>([]);
const [manualCrossPostSource, setManualCrossPostSource] = useState<"ai" | "fallback">("fallback");
const [manualPublishedProducts, setManualPublishedProducts] = useState<PublishedCrossPostProduct[]>([]);
const [manualCrossPostError, setManualCrossPostError] = useState<string | null>(null);
```

將現有 image upload + `POST /api/products` 搬入：

```ts
async function publishManualProduct(): Promise<Product> {
  // Validate image count, upload files, require at least one image,
  // POST the current form fields, throw localized Error on failure,
  // and return the created Product without clearing state.
}
```

既有 `onSubmit` 呼叫 helper，成功後才清空表單與設定 `successProduct`。保留 direct flow 的自動跳轉，但 effect 需加上 `manualCrossPostStage === "idle"` 條件。

- [ ] **Step 2: 實作 preview action**

```ts
async function generateManualCrossPostPreview() {
  const previewItem = getManualPreviewItem();
  setManualCrossPostStage("generating");
  const response = await fetch("/api/products/cross-post-preview", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      items: [previewItem],
    }),
  });
  // Store source/copies and enter reviewing; on failure return to idle.
}
```

`getManualPreviewItem` 使用與 direct publish 相同的 name、price、quantity 必填規則，回傳 `{ clientId: "manual-1", name: name.trim(), description: description.trim(), price: Number(price), quantity: Number(quantity), category }`；驗證失敗時丟出既有 localized error。

不要上傳圖片、不要 POST `/api/products`、不要傳 contact fields。

- [ ] **Step 3: 實作確認上架與返回修改**

`confirmManualCrossPost` 設為 publishing，呼叫 `publishManualProduct`。成功後建立：

```ts
{
  clientId: "manual-1",
  productId: String(product.id),
  name: product.name,
  productUrl: `${window.location.origin}/product/${encodeURIComponent(String(product.id))}`,
}
```

加入 `manualPublishedProducts` 並進入 finalized；不要清空 editable copies，不啟動 redirect。返回修改要清除 preview copies/source/error 並回 idle。

- [ ] **Step 4: 接上 manual UI**

在原 footer 將按鈕區改為兩個 command：既有 submit「上架商品」與 type=button「AI 產生跨平台貼文」。`reviewing | publishing | finalized` 時以 `CrossPostPreviewEditor` 取代或覆蓋表單 action area，並 disabled 所有商品 input、圖片、聯絡欄位與 pricing advisor。

Finalized 畫面保留「查看商品」與「再上架一項」入口。`listAnotherItem` 必須重置 manual cross-post state。

- [ ] **Step 5: 執行 TypeScript 與相關 tests**

Run: `npx tsc --noEmit && npm test -- --run app/components/CrossPostPreviewEditor.test.tsx app/lib/crossPostPreview.test.ts app/lib/crossPostFinalizer.test.ts`

Expected: exit 0，相關 tests 全部 PASS。

- [ ] **Step 6: 提交 Task 6**

```powershell
git add app/sell/page.tsx
git commit -m "Add single-listing cross-post preview flow"
```

### Task 7: 接上 AI 批次預覽、部分失敗與重試

**Files:**
- Modify: `app/sell/page.tsx`
- Modify: `app/lib/bulkDraftRequest.ts`
- Modify: `app/lib/bulkDraftRequest.test.ts`

- [ ] **Step 1: 寫入批次 publish result helper 失敗測試**

在 `bulkDraftRequest` 新增純 helper 測試：

```ts
test("returns only unpublished preview draft ids in original order", () => {
  expect(
    getPendingCrossPostDraftIds(["a", "b", "c"], [
      { clientId: "b", productId: "p-2", name: "B", productUrl: "/product/p-2" },
    ])
  ).toEqual(["a", "c"]);
});

test("locks draft mutations while preview is being reviewed or published", () => {
  expect(isBulkDraftMutationLocked(false, "reviewing")).toBe(true);
  expect(isBulkDraftMutationLocked(false, "finalized")).toBe(false);
});
```

更新 signature 為 `isBulkDraftMutationLocked(publishing, crossPostStage: CrossPostFlowStage)`；`CrossPostFlowStage` 從 `crossPostPreview.ts` import。reviewing/publishing 回傳 true，idle/generating/finalized 只依 publishing 決定。

- [ ] **Step 2: 執行 helper tests 確認 RED，再實作最小 helper**

Run: `npm test -- --run app/lib/bulkDraftRequest.test.ts`

Expected RED 後，實作並重跑至 PASS。

- [ ] **Step 3: 將現有批次上架改為可回傳逐項結果**

在 `SellPage` 定義：

```ts
type BulkPublishResult = {
  successes: Array<{ draftId: string; product: Product }>;
  failures: Array<{ draftId: string; message: string }>;
};

async function publishBulkDraftSet(drafts: BulkDraft[]): Promise<BulkPublishResult>;
```

沿用目前逐項 `uploadDraftImages` 與 `POST /api/products`，但每個成功 response 必須 `await res.json()` 取得 Product。函式負責更新 draft status，並回傳 successes/failures；direct `publishBulkDrafts` 只處理 selected drafts 並使用 result 更新 summary。

- [ ] **Step 4: 實作 batch preview action 與 snapshot**

加入 batch copies/source/stage/error/published products/preview draft IDs state。`generateBulkCrossPostPreview`：

- 取 selected 且未 published drafts，限制 1–10。
- request items 使用 draft.id 作 clientId。
- 不包含 contacts、image indexes、image files 或 URLs。
- 成功後保存 preview draft ID order，進入 reviewing 並鎖定草稿。

- [ ] **Step 5: 實作 batch confirm 與 retry**

`confirmBulkCrossPost` 以 `getPendingCrossPostDraftIds` 找出尚未成功的 preview drafts，再呼叫 `publishBulkDraftSet`。每個 success 轉成 `PublishedCrossPostProduct` 並累積去重；若仍有 failures，保留 editor 與 edited copies，confirm label 改為「重試失敗商品」。全部成功則進入 finalized。

Back 只在尚未有任何成功商品時可用；一旦部分商品已建立，傳入 `canGoBack={false}`，避免 snapshot 與已上架商品分裂。全部完成後傳入 `canConfirm={false}`；部分失敗仍維持 `canConfirm={true}` 供重試。

- [ ] **Step 6: 接上 batch UI**

在 sticky action bar 顯示「直接上架已選商品」與「AI 產生跨平台貼文」。Review/final 階段在 draft list 上方顯示同一個 `CrossPostPreviewEditor`，完整呈現 Facebook、Craigslist、LINE、WeChat、Discord tabs。

Partial failure notice 顯示成功與失敗數；managed link section 只顯示累積 successes。Finalized 後草稿卡依既有 published status 禁止重複上架。

- [ ] **Step 7: 執行 TypeScript 與批次相關 tests**

Run: `npx tsc --noEmit && npm test -- --run app/lib/bulkDraftRequest.test.ts app/components/CrossPostPreviewEditor.test.tsx app/lib/crossPostFinalizer.test.ts`

Expected: exit 0，全部 PASS。

- [ ] **Step 8: 提交 Task 7**

```powershell
git add app/sell/page.tsx app/lib/bulkDraftRequest.ts app/lib/bulkDraftRequest.test.ts
git commit -m "Add bulk listing cross-post preview flow"
```

### Task 8: 完整驗證、Playwright 與 code review

**Files:**
- Review all files changed since `origin/master`
- Do not commit Playwright artifacts

- [ ] **Step 1: 執行完整自動化驗證**

```powershell
npm test -- --run
npx tsc --noEmit
npm run build
git diff --check origin/master...HEAD
```

Expected: 全部 exit 0。Build 允許既有 Supabase/Auth.js Edge Runtime warnings，但不得新增 compile/type error。

- [ ] **Step 2: 啟動單一 dev server**

使用未被占用的 localhost port，必要時以原 repo `.env.local` 啟動，但不要 commit 環境檔。將 log 與 screenshot 放在 `output/playwright/`。

- [ ] **Step 3: Playwright 驗證一般單品**

以 authenticated session 與 route mocks 驗證：

- 直接上架按鈕仍存在。
- 點「AI 產生跨平台貼文」只呼叫 preview API，不呼叫 product POST 或 image upload。
- 五平台 tabs 都存在。
- 修改 LINE title/body，切換平台後再回來，內容仍存在。
- 預覽 notice 明確說明尚未有 OSUTrade 連結。
- 返回修改會關閉 preview 並重新允許表單。
- 確認上架後呼叫 image upload/product POST，顯示真實商品連結，且頁面不自動跳轉。

- [ ] **Step 4: Playwright 驗證 AI 批次**

驗證選取多個 drafts 後產生一篇五平台文案；preview 期間草稿與 selection disabled。Mock 一項成功、一項失敗，確認只有成功連結；再重試失敗項，確認第二個連結加入且第一個不重複。

- [ ] **Step 5: 視覺與 console 檢查**

在 1440x1000 與 390x844 截圖。確認 tabs、textarea、notice、雙按鈕與 managed links 無重疊、截斷或水平溢位；`playwright-cli console error` 必須為 0 個 app errors。

- [ ] **Step 6: 最終 code review**

逐項檢查：

- preview request/AI prompt 沒有 contact fields 或 client URLs。
- preview route 不寫 Supabase。
- direct publish 沒有 behavioral regression。
- stale preview responses 不會覆蓋新狀態。
- partial retry 不會重複建立成功商品或重複 links。
- edited copies 不會被 publish response 或 retry 覆蓋。
- 所有 UI strings 在 en/zhTw/zhCn 都存在。

修正所有 Critical/Important findings，重新執行 Step 1。

- [ ] **Step 7: 提交驗證期間必要修正**

若有修正：

```powershell
git add app/lib/crossPostCopy.ts app/lib/crossPostCopy.test.ts app/lib/crossPostPreview.ts app/lib/crossPostPreview.test.ts app/api/products/cross-post-preview/route.ts app/api/products/cross-post-preview/route.test.ts app/lib/crossPostFinalizer.ts app/lib/crossPostFinalizer.test.ts app/components/CrossPostPreviewEditor.tsx app/components/CrossPostPreviewEditor.test.tsx app/lib/bulkDraftRequest.ts app/lib/bulkDraftRequest.test.ts app/i18n.tsx app/sell/page.tsx
git commit -m "Polish sell cross-post preview flow"
```

若無程式修正，不建立空 commit。
