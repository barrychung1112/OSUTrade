export type HomeSeason = "move-in" | "move-out" | "evergreen";
export type HomeGuideId = "move-in" | "move-out";
export type HomeClientLocale = "en" | "zh" | "zhCn";
type HomeCategory = "home" | "books" | "electronics" | "general";

export type HomepageSeasonalContent = {
  h1: string;
  body: string;
  eyebrow: string;
  guide: HomeGuideId;
  browseCta: string;
  rightPanelTitle: string;
  rightPanelRequestLabel: string;
  rightPanelSellLabel: string;
  categorySectionTitle: string;
  categories: readonly {
    category: HomeCategory;
    href: `/overview?category=${HomeCategory}`;
    label: string;
  }[];
};

const homepageCategories = {
  en: [
    { category: "home", href: "/overview?category=home", label: "Home" },
    { category: "books", href: "/overview?category=books", label: "Books" },
    { category: "electronics", href: "/overview?category=electronics", label: "Electronics" },
    { category: "general", href: "/overview?category=general", label: "General" },
  ],
  zh: [
    { category: "home", href: "/overview?category=home", label: "居家" },
    { category: "books", href: "/overview?category=books", label: "書籍" },
    { category: "electronics", href: "/overview?category=electronics", label: "電子產品" },
    { category: "general", href: "/overview?category=general", label: "其他" },
  ],
  zhCn: [
    { category: "home", href: "/overview?category=home", label: "家居" },
    { category: "books", href: "/overview?category=books", label: "书籍" },
    { category: "electronics", href: "/overview?category=electronics", label: "电子产品" },
    { category: "general", href: "/overview?category=general", label: "其他" },
  ],
} satisfies Record<HomeClientLocale, readonly HomepageSeasonalContent["categories"][number][]>;

export const homeGuideForSeason = {
  "move-in": "move-in",
  "move-out": "move-out",
  evergreen: "move-in",
} as const satisfies Record<HomeSeason, HomeGuideId>;

export const homeSeasonalCopy: Record<
  HomeClientLocale,
  Record<HomeSeason, HomepageSeasonalContent>
> = {
  en: {
    "move-in": {
      h1: "Set up your Corvallis space for less",
      body: "Find useful secondhand essentials from the Oregon State community and arrange local pickup.",
      eyebrow: "Move-in season",
      guide: homeGuideForSeason["move-in"],
      browseCta: "Browse move-in essentials",
      rightPanelTitle: "Ready for your first week?",
      rightPanelRequestLabel: "Request what you need",
      rightPanelSellLabel: "List what you no longer need",
      categorySectionTitle: "Browse move-in categories",
      categories: homepageCategories.en,
    },
    "move-out": {
      h1: "Pass useful items on before move-out",
      body: "List campus goods early, or browse local deals as Corvallis students reset for the next term.",
      eyebrow: "Move-out season",
      guide: homeGuideForSeason["move-out"],
      browseCta: "Browse move-out deals",
      rightPanelTitle: "Make move-out simpler",
      rightPanelRequestLabel: "Request an available item",
      rightPanelSellLabel: "Create a clear listing",
      categorySectionTitle: "Browse popular categories",
      categories: homepageCategories.en,
    },
    evergreen: {
      h1: "Useful campus goods, close to home",
      body: "Browse local secondhand listings from the Oregon State community whenever you need them.",
      eyebrow: "OSUTrade marketplace",
      guide: homeGuideForSeason.evergreen,
      browseCta: "Browse campus goods",
      rightPanelTitle: "Find your next essential",
      rightPanelRequestLabel: "Send a trade request",
      rightPanelSellLabel: "List an item for others",
      categorySectionTitle: "Browse by category",
      categories: homepageCategories.en,
    },
  },
  zh: {
    "move-in": {
      h1: "用更少預算布置你的 Corvallis 空間",
      body: "從 Oregon State 社群尋找實用二手必需品，並安排在地取貨。",
      eyebrow: "入住季",
      guide: homeGuideForSeason["move-in"],
      browseCta: "瀏覽入住必需品",
      rightPanelTitle: "準備好第一週了嗎？",
      rightPanelRequestLabel: "請求你需要的商品",
      rightPanelSellLabel: "刊登你不再需要的物品",
      categorySectionTitle: "瀏覽入住分類",
      categories: homepageCategories.zh,
    },
    "move-out": {
      h1: "搬離前讓實用物品延續使用",
      body: "及早刊登校園用品，或在 Corvallis 學生準備下個學期時瀏覽在地好物。",
      eyebrow: "搬離季",
      guide: homeGuideForSeason["move-out"],
      browseCta: "瀏覽搬離季好物",
      rightPanelTitle: "讓搬離更簡單",
      rightPanelRequestLabel: "請求可取的商品",
      rightPanelSellLabel: "建立清楚的刊登",
      categorySectionTitle: "瀏覽熱門分類",
      categories: homepageCategories.zh,
    },
    evergreen: {
      h1: "就在身邊的實用校園物品",
      body: "隨時瀏覽 Oregon State 社群的在地二手刊登，找到你需要的物品。",
      eyebrow: "OSUTrade 交易平台",
      guide: homeGuideForSeason.evergreen,
      browseCta: "瀏覽校園物品",
      rightPanelTitle: "找到下一件必需品",
      rightPanelRequestLabel: "送出交易請求",
      rightPanelSellLabel: "為其他人刊登物品",
      categorySectionTitle: "依分類瀏覽",
      categories: homepageCategories.zh,
    },
  },
  zhCn: {
    "move-in": {
      h1: "用更少预算布置你的 Corvallis 空间",
      body: "从 Oregon State 社区寻找实用二手必需品，并安排本地取货。",
      eyebrow: "入住季",
      guide: homeGuideForSeason["move-in"],
      browseCta: "浏览入住必需品",
      rightPanelTitle: "准备好第一周了吗？",
      rightPanelRequestLabel: "请求你需要的商品",
      rightPanelSellLabel: "发布你不再需要的物品",
      categorySectionTitle: "浏览入住分类",
      categories: homepageCategories.zhCn,
    },
    "move-out": {
      h1: "搬离前让实用物品继续发挥价值",
      body: "尽早发布校园用品，或在 Corvallis 学生准备下个学期时浏览本地好物。",
      eyebrow: "搬离季",
      guide: homeGuideForSeason["move-out"],
      browseCta: "浏览搬离季好物",
      rightPanelTitle: "让搬离更简单",
      rightPanelRequestLabel: "请求可取的商品",
      rightPanelSellLabel: "创建清楚的发布",
      categorySectionTitle: "浏览热门分类",
      categories: homepageCategories.zhCn,
    },
    evergreen: {
      h1: "就在身边的实用校园物品",
      body: "随时浏览 Oregon State 社区的本地二手发布内容，找到你需要的物品。",
      eyebrow: "OSUTrade 交易平台",
      guide: homeGuideForSeason.evergreen,
      browseCta: "浏览校园物品",
      rightPanelTitle: "找到下一件必需品",
      rightPanelRequestLabel: "发送交易请求",
      rightPanelSellLabel: "为其他人发布物品",
      categorySectionTitle: "按分类浏览",
      categories: homepageCategories.zhCn,
    },
  },
};
