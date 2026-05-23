"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const dictionaries = {
  en: {
    "common.language": "Language",
    "common.english": "EN",
    "common.zhTw": "繁中",
    "common.zhCn": "简中",
    "common.loading": "Loading...",
    "common.refresh": "Refresh",
    "common.refreshing": "Refreshing...",
    "common.clear": "Clear",
    "common.category.general": "general",
    "common.category.electronics": "electronics",
    "common.category.clothing": "clothing",
    "common.category.books": "books",
    "common.category.home": "home",
    "nav.home": "Home",
    "nav.marketplace": "Marketplace",
    "nav.sell": "Sell",
    "nav.seller": "Seller",
    "nav.requests": "Requests",
    "nav.cart": "Cart",
    "nav.logout": "Logout",
    "auth.login": "Login",
    "auth.signup": "Sign Up",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.username": "User Name",
    "auth.loggingIn": "Logging in...",
    "auth.creating": "Creating account...",
    "auth.loginError": "The email or password is incorrect.",
    "auth.signupError": "Sign up failed. Check your email and password.",
    "auth.confirmEmail": "Please check your email to confirm your account.",
    "auth.createdConfirm": "Account created. Please log in after confirming your email.",
    "home.description":
      "Looking to declutter or find great deals? OSUTrade helps you list secondhand items, browse campus listings, and send requests to sellers in a few clicks.",
    "home.github": "GitHub",
    "home.discord": "Discord",
    "home.support": "Support Us",
    "home.about": "About Us",
    "home.onSale": "On Sale Products",
    "marketplace.title": "Find campus deals faster.",
    "marketplace.subtitle":
      "Browse available listings, filter by category, and add items to your request cart when you are ready to contact the seller.",
    "marketplace.listItem": "List Item",
    "marketplace.loadError": "Failed to load products: {message}",
    "marketplace.search": "Search",
    "marketplace.searchPlaceholder": "Search by item name",
    "marketplace.category": "Category",
    "marketplace.allCategories": "All categories",
    "marketplace.sort": "Sort",
    "marketplace.newest": "Newest first",
    "marketplace.priceAsc": "Price: low to high",
    "marketplace.priceDesc": "Price: high to low",
    "marketplace.showing": "Showing {shown} of {total} listings",
    "marketplace.loadingListings": "Loading listings...",
    "marketplace.noMatches": "No matching listings",
    "marketplace.noMatchesHelp": "Try clearing filters or list the first item in this category.",
    "product.addToCart": "Add to request cart",
    "product.adding": "Adding...",
    "product.added": "Added to request cart.",
    "product.addedDetail": "Added to request cart. You can review it before sending.",
    "product.viewCart": "View request cart",
    "product.addError": "Could not add item. Please try again.",
    "product.addErrorDetail": "Could not add this item. Please try again.",
    "product.stock": "{quantity} available",
    "product.backMarketplace": "Back to marketplace",
    "product.loading": "Loading item...",
    "product.unavailable": "Product unavailable",
    "product.notFound": "This item was not found.",
    "product.seller": "Seller",
    "product.contactAfterRequest": "Contact is handled after you send a request.",
    "product.stepCart": "Add the item to your request cart, then send one request with notes.",
    "product.stepSeller": "The seller can accept or decline from their seller dashboard.",
    "product.statusUnavailable": "Unavailable",
    "sell.title": "List an Item",
    "sell.itemName": "Item name",
    "sell.price": "Price",
    "sell.quantity": "Quantity available",
    "sell.productImage": "Product image",
    "sell.imageHelp": "JPG, PNG, or WebP up to 5 MB.",
    "sell.imageUrlFallback": "Image URL fallback",
    "sell.listing": "Listing...",
    "sell.submit": "List item",
    "sell.uploadError": "Failed to upload image.",
    "sell.listError": "Failed to list item.",
    "cart.title": "Your Requests",
    "cart.backMarketplace": "Back to Marketplace",
    "cart.loading": "Loading your cart...",
    "cart.empty": "Your cart is empty",
    "cart.emptyHelp": "Add items in Marketplace and send requests to sellers.",
    "cart.goShopping": "Go shopping",
    "cart.summary": "Request Summary",
    "cart.items": "Items",
    "cart.subtotal": "Subtotal",
    "cart.pendingTotal": "Pending / Total",
    "cart.sent": "Sent",
    "cart.failed": "Failed",
    "cart.sendAll": "Send all requests",
    "cart.remove": "Remove",
    "cart.decrease": "Decrease quantity",
    "cart.increase": "Increase quantity",
    "cart.note": "Note to seller",
    "cart.notePlaceholder": "e.g., Can we meet at the library?",
    "cart.send": "Send request",
    "cart.sending": "Sending...",
    "cart.error": "Error",
    "cart.idle": "Idle",
    "cart.sendFailed": "Failed to send request.",
    "requests.title": "My Requests",
    "requests.counts": "{total} total, {accepted} accepted",
    "requests.loading": "Loading requests...",
    "requests.empty": "No requests yet",
    "requests.emptyHelp": "Send a request from your cart to start a trade.",
    "requests.browse": "Browse items",
    "requests.qty": "Qty {quantity}",
    "requests.acceptedContact": "Seller accepted. Contact:",
    "requests.contactPending": "Contact details appear after the seller accepts your request.",
    "requests.cancel": "Cancel request",
    "seller.title": "Seller Dashboard",
    "seller.subtitle": "Manage listings, track buyer requests, and keep stock accurate.",
    "seller.counts": "{listings} listings, {pending} pending requests",
    "seller.totalListings": "Listings",
    "seller.pendingRequests": "Pending requests",
    "seller.availableUnits": "Available units",
    "seller.myListings": "My Listings",
    "seller.myListingsHelp": "Update status and monitor stock for your active items.",
    "seller.loadingListings": "Loading listings...",
    "seller.noListings": "No listings yet.",
    "seller.noListingsHelp": "Create your first listing so buyers can send requests.",
    "seller.buyerRequests": "Buyer Requests",
    "seller.buyerRequestsHelp": "Accept requests when you are ready to share contact details.",
    "seller.loadingRequests": "Loading requests...",
    "seller.noRequests": "No buyer requests yet.",
    "seller.noRequestsHelp": "New requests will appear here after buyers send them from their cart.",
    "seller.available": "Available",
    "seller.pending": "Pending",
    "seller.sold": "Sold",
    "seller.buyer": "Buyer {id}",
    "seller.buyerContact": "Buyer contact:",
    "seller.emailAfterAccept": "Buyer email appears after you accept the request.",
    "seller.accept": "Accept",
    "seller.decline": "Decline",
  },
  zh: {
    "common.language": "語言",
    "common.english": "EN",
    "common.zhTw": "繁中",
    "common.zhCn": "简中",
    "common.loading": "載入中...",
    "common.refresh": "重新整理",
    "common.refreshing": "重新整理中...",
    "common.clear": "清除",
    "common.category.general": "一般",
    "common.category.electronics": "電子產品",
    "common.category.clothing": "服飾",
    "common.category.books": "書籍",
    "common.category.home": "居家",
    "nav.home": "首頁",
    "nav.marketplace": "市集",
    "nav.sell": "刊登",
    "nav.seller": "賣家",
    "nav.requests": "需求",
    "nav.cart": "購物車",
    "nav.logout": "登出",
    "auth.login": "登入",
    "auth.signup": "註冊",
    "auth.email": "Email",
    "auth.password": "密碼",
    "auth.username": "使用者名稱",
    "auth.loggingIn": "登入中...",
    "auth.creating": "建立帳號中...",
    "auth.loginError": "Email 或密碼不正確。",
    "auth.signupError": "註冊失敗，請確認 email 與密碼。",
    "auth.confirmEmail": "請查看信箱並完成帳號驗證。",
    "auth.createdConfirm": "帳號已建立。請完成 email 驗證後再登入。",
    "home.description":
      "想出清閒置物品或找划算好物嗎？OSUTrade 讓你可以刊登二手商品、瀏覽校園市集，並快速向賣家送出交易需求。",
    "home.github": "GitHub",
    "home.discord": "Discord",
    "home.support": "支持我們",
    "home.about": "關於我們",
    "home.onSale": "熱賣商品",
    "marketplace.title": "更快找到校園好物。",
    "marketplace.subtitle":
      "瀏覽目前可交易的商品，依分類篩選，準備聯絡賣家時可先加入 request cart。",
    "marketplace.listItem": "刊登商品",
    "marketplace.loadError": "商品載入失敗：{message}",
    "marketplace.search": "搜尋",
    "marketplace.searchPlaceholder": "依商品名稱搜尋",
    "marketplace.category": "分類",
    "marketplace.allCategories": "所有分類",
    "marketplace.sort": "排序",
    "marketplace.newest": "最新優先",
    "marketplace.priceAsc": "價格：低到高",
    "marketplace.priceDesc": "價格：高到低",
    "marketplace.showing": "顯示 {shown} / {total} 個商品",
    "marketplace.loadingListings": "商品載入中...",
    "marketplace.noMatches": "沒有符合的商品",
    "marketplace.noMatchesHelp": "請清除篩選條件，或成為這個分類第一個刊登商品的人。",
    "product.addToCart": "加入 request cart",
    "product.adding": "加入中...",
    "product.added": "已加入 request cart。",
    "product.addedDetail": "已加入 request cart，送出前可以再確認內容。",
    "product.viewCart": "查看 request cart",
    "product.addError": "無法加入商品，請再試一次。",
    "product.addErrorDetail": "無法加入這個商品，請再試一次。",
    "product.stock": "可購買 {quantity} 件",
    "product.backMarketplace": "回到市集",
    "product.loading": "商品載入中...",
    "product.unavailable": "商品目前無法查看",
    "product.notFound": "找不到這個商品。",
    "product.seller": "賣家",
    "product.contactAfterRequest": "送出交易需求後才會顯示聯絡方式。",
    "product.stepCart": "先把商品加入 request cart，再附上備註送出需求。",
    "product.stepSeller": "賣家可以在賣家 dashboard 接受或拒絕需求。",
    "product.statusUnavailable": "不可交易",
    "sell.title": "刊登商品",
    "sell.itemName": "商品名稱",
    "sell.price": "價格",
    "sell.quantity": "可購買數量",
    "sell.productImage": "商品圖片",
    "sell.imageHelp": "支援 JPG、PNG 或 WebP，最多 5 MB。",
    "sell.imageUrlFallback": "圖片 URL 備用欄位",
    "sell.listing": "刊登中...",
    "sell.submit": "刊登商品",
    "sell.uploadError": "圖片上傳失敗。",
    "sell.listError": "商品刊登失敗。",
    "cart.title": "你的交易需求",
    "cart.backMarketplace": "回到市集",
    "cart.loading": "購物車載入中...",
    "cart.empty": "購物車是空的",
    "cart.emptyHelp": "到市集加入商品，並向賣家送出交易需求。",
    "cart.goShopping": "去逛市集",
    "cart.summary": "需求摘要",
    "cart.items": "商品數",
    "cart.subtotal": "小計",
    "cart.pendingTotal": "待送出 / 全部",
    "cart.sent": "已送出",
    "cart.failed": "失敗",
    "cart.sendAll": "送出全部需求",
    "cart.remove": "移除",
    "cart.decrease": "減少數量",
    "cart.increase": "增加數量",
    "cart.note": "給賣家的備註",
    "cart.notePlaceholder": "例如：可以在圖書館碰面嗎？",
    "cart.send": "送出需求",
    "cart.sending": "送出中...",
    "cart.error": "錯誤",
    "cart.idle": "尚未送出",
    "cart.sendFailed": "需求送出失敗。",
    "requests.title": "我的需求",
    "requests.counts": "共 {total} 筆，{accepted} 筆已接受",
    "requests.loading": "需求載入中...",
    "requests.empty": "目前沒有需求",
    "requests.emptyHelp": "從購物車送出需求後，就會開始交易流程。",
    "requests.browse": "瀏覽商品",
    "requests.qty": "數量 {quantity}",
    "requests.acceptedContact": "賣家已接受。聯絡方式：",
    "requests.contactPending": "賣家接受需求後，這裡會顯示聯絡方式。",
    "requests.cancel": "取消需求",
    "seller.title": "賣家 Dashboard",
    "seller.subtitle": "管理刊登商品、追蹤買家需求，並保持庫存數量正確。",
    "seller.counts": "{listings} 個刊登商品，{pending} 筆待處理需求",
    "seller.totalListings": "刊登商品",
    "seller.pendingRequests": "待處理需求",
    "seller.availableUnits": "可售數量",
    "seller.myListings": "我的刊登",
    "seller.myListingsHelp": "更新商品狀態並確認目前可售庫存。",
    "seller.loadingListings": "刊登載入中...",
    "seller.noListings": "尚未刊登商品。",
    "seller.noListingsHelp": "建立第一個刊登商品後，買家就可以送出需求。",
    "seller.buyerRequests": "買家需求",
    "seller.buyerRequestsHelp": "準備交易時接受需求，系統才會顯示雙方聯絡方式。",
    "seller.loadingRequests": "需求載入中...",
    "seller.noRequests": "目前沒有買家需求。",
    "seller.noRequestsHelp": "買家從購物車送出需求後，會出現在這裡。",
    "seller.available": "可交易",
    "seller.pending": "保留中",
    "seller.sold": "已售出",
    "seller.buyer": "買家 {id}",
    "seller.buyerContact": "買家聯絡方式：",
    "seller.emailAfterAccept": "接受需求後，這裡會顯示買家 email。",
    "seller.accept": "接受",
    "seller.decline": "拒絕",
  },
} as const;

type BaseLocale = keyof typeof dictionaries;
type Locale = BaseLocale | "zhCn";
type TranslationKey = keyof typeof dictionaries.en;

const zhCnDictionary: Record<TranslationKey, string> = {
  "common.language": "语言",
  "common.english": "EN",
  "common.zhTw": "繁中",
  "common.zhCn": "简中",
  "common.loading": "加载中...",
  "common.refresh": "刷新",
  "common.refreshing": "刷新中...",
  "common.clear": "清除",
  "common.category.general": "一般",
  "common.category.electronics": "电子产品",
  "common.category.clothing": "服饰",
  "common.category.books": "书籍",
  "common.category.home": "家居",
  "nav.home": "首页",
  "nav.marketplace": "市集",
  "nav.sell": "刊登",
  "nav.seller": "卖家",
  "nav.requests": "需求",
  "nav.cart": "购物车",
  "nav.logout": "登出",
  "auth.login": "登录",
  "auth.signup": "注册",
  "auth.email": "Email",
  "auth.password": "密码",
  "auth.username": "用户名",
  "auth.loggingIn": "登录中...",
  "auth.creating": "创建账号中...",
  "auth.loginError": "Email 或密码不正确。",
  "auth.signupError": "注册失败，请确认 email 与密码。",
  "auth.confirmEmail": "请查看邮箱并完成账号验证。",
  "auth.createdConfirm": "账号已创建。请完成 email 验证后再登录。",
  "home.description":
    "想清理闲置物品或找到划算好物吗？OSUTrade 让你可以刊登二手商品、浏览校园市集，并快速向卖家发送交易需求。",
  "home.github": "GitHub",
  "home.discord": "Discord",
  "home.support": "支持我们",
  "home.about": "关于我们",
  "home.onSale": "热卖商品",
  "marketplace.title": "更快找到校园好物。",
  "marketplace.subtitle":
    "浏览目前可交易的商品，按分类筛选，准备联系卖家时可先加入 request cart。",
  "marketplace.listItem": "刊登商品",
  "marketplace.loadError": "商品加载失败：{message}",
  "marketplace.search": "搜索",
  "marketplace.searchPlaceholder": "按商品名称搜索",
  "marketplace.category": "分类",
  "marketplace.allCategories": "所有分类",
  "marketplace.sort": "排序",
  "marketplace.newest": "最新优先",
  "marketplace.priceAsc": "价格：低到高",
  "marketplace.priceDesc": "价格：高到低",
  "marketplace.showing": "显示 {shown} / {total} 个商品",
  "marketplace.loadingListings": "商品加载中...",
  "marketplace.noMatches": "没有符合条件的商品",
  "marketplace.noMatchesHelp": "请清除筛选条件，或成为这个分类第一个刊登商品的人。",
  "product.addToCart": "加入 request cart",
  "product.adding": "加入中...",
  "product.added": "已加入 request cart。",
  "product.addedDetail": "已加入 request cart，你可以送出前再确认。",
  "product.viewCart": "查看 request cart",
  "product.addError": "无法加入商品，请再试一次。",
  "product.addErrorDetail": "无法加入这个商品，请再试一次。",
  "product.stock": "库存 {quantity} 件",
  "product.backMarketplace": "回到市集",
  "product.loading": "商品加载中...",
  "product.unavailable": "商品不可用",
  "product.notFound": "找不到这个商品。",
  "product.seller": "卖家",
  "product.contactAfterRequest": "送出需求后才会显示联系信息。",
  "product.stepCart": "先把商品加入 request cart，再附上备注发送需求。",
  "product.stepSeller": "卖家可在 Seller Dashboard 接受或拒绝需求。",
  "product.statusUnavailable": "不可交易",
  "sell.title": "刊登商品",
  "sell.itemName": "商品名称",
  "sell.price": "价格",
  "sell.quantity": "可售数量",
  "sell.productImage": "商品图片",
  "sell.imageHelp": "支持 JPG、PNG 或 WebP，最大 5 MB。",
  "sell.imageUrlFallback": "图片 URL 备用",
  "sell.listing": "刊登中...",
  "sell.submit": "刊登商品",
  "sell.uploadError": "图片上传失败。",
  "sell.listError": "商品刊登失败。",
  "cart.title": "你的交易需求",
  "cart.backMarketplace": "回到市集",
  "cart.loading": "购物车加载中...",
  "cart.empty": "购物车是空的",
  "cart.emptyHelp": "在市集加入商品，并向卖家发送交易需求。",
  "cart.goShopping": "去逛逛",
  "cart.summary": "需求摘要",
  "cart.items": "商品",
  "cart.subtotal": "小计",
  "cart.pendingTotal": "待发送 / 总数",
  "cart.sent": "已发送",
  "cart.failed": "失败",
  "cart.sendAll": "发送所有需求",
  "cart.remove": "移除",
  "cart.decrease": "减少数量",
  "cart.increase": "增加数量",
  "cart.note": "给卖家的备注",
  "cart.notePlaceholder": "例如：可以在图书馆面交吗？",
  "cart.send": "发送需求",
  "cart.sending": "发送中...",
  "cart.error": "错误",
  "cart.idle": "尚未发送",
  "cart.sendFailed": "需求发送失败。",
  "requests.title": "我的需求",
  "requests.counts": "共 {total} 笔，{accepted} 笔已接受",
  "requests.loading": "需求加载中...",
  "requests.empty": "还没有需求",
  "requests.emptyHelp": "从购物车发送需求，开始一笔交易。",
  "requests.browse": "浏览商品",
  "requests.qty": "数量 {quantity}",
  "requests.acceptedContact": "卖家已接受。联系方式：",
  "requests.contactPending": "卖家接受需求后才会显示联系方式。",
  "requests.cancel": "取消需求",
  "seller.title": "卖家 Dashboard",
  "seller.subtitle": "管理刊登商品、追踪买家需求，并保持库存数量正确。",
  "seller.counts": "{listings} 个刊登商品，{pending} 笔待处理需求",
  "seller.totalListings": "刊登商品",
  "seller.pendingRequests": "待处理需求",
  "seller.availableUnits": "可售数量",
  "seller.myListings": "我的刊登",
  "seller.myListingsHelp": "更新商品状态，并追踪可售库存。",
  "seller.loadingListings": "刊登商品加载中...",
  "seller.noListings": "尚未刊登商品。",
  "seller.noListingsHelp": "创建第一件商品，让买家可以发送需求。",
  "seller.buyerRequests": "买家需求",
  "seller.buyerRequestsHelp": "准备好分享联系方式时，就可以接受需求。",
  "seller.loadingRequests": "需求加载中...",
  "seller.noRequests": "目前没有买家需求。",
  "seller.noRequestsHelp": "买家从购物车发送需求后，会显示在这里。",
  "seller.available": "可交易",
  "seller.pending": "处理中",
  "seller.sold": "已售出",
  "seller.buyer": "买家 {id}",
  "seller.buyerContact": "买家联系方式：",
  "seller.emailAfterAccept": "接受需求后才会显示买家 email。",
  "seller.accept": "接受",
  "seller.decline": "拒绝",
};

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function translate(
  locale: Locale,
  key: TranslationKey,
  values?: Record<string, string | number>
) {
  const dictionary = locale === "zhCn" ? zhCnDictionary : dictionaries[locale];
  let text: string = dictionary[key] ?? dictionaries.en[key] ?? key;

  if (values) {
    Object.entries(values).forEach(([name, value]) => {
      text = text.replaceAll(`{${name}}`, String(value));
    });
  }

  return text;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("osutrade-locale");
    if (saved === "en" || saved === "zh" || saved === "zhCn") {
      setLocaleState(saved);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang =
      locale === "zh" ? "zh-Hant" : locale === "zhCn" ? "zh-Hans" : "en";
    window.localStorage.setItem("osutrade-locale", locale);
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale: setLocaleState,
      t: (key, values) => translate(locale, key, values),
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return context;
}

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      className="inline-flex min-w-[138px] shrink-0 rounded-md border border-orange-200 bg-white/80 p-0.5 text-xs font-semibold shadow-sm"
      style={{
        flexShrink: 0,
        minWidth: "138px",
        width: "138px",
        boxSizing: "border-box",
      }}
      aria-label={t("common.language")}
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded px-2 py-1 transition ${
          locale === "en" ? "bg-[#d73f09] text-white" : "text-gray-700"
        }`}
      >
        {t("common.english")}
      </button>
      <button
        type="button"
        onClick={() => setLocale("zh")}
        className={`rounded px-2 py-1 transition ${
          locale === "zh" ? "bg-[#d73f09] text-white" : "text-gray-700"
        }`}
      >
        {t("common.zhTw")}
      </button>
      <button
        type="button"
        onClick={() => setLocale("zhCn")}
        className={`rounded px-2 py-1 transition ${
          locale === "zhCn" ? "bg-[#d73f09] text-white" : "text-gray-700"
        }`}
      >
        {t("common.zhCn")}
      </button>
    </div>
  );
}
