type GuideItem = {
  title: string;
  detail: string;
  link?: string;
  linkLabel?: string;
};

type WelcomeCopy = {
  badge: string;
  title: string;
  description: string;
  dorm: string;
  apartment: string;
  dormItems: GuideItem[];
  apartmentItems: GuideItem[];
  dormNote: string;
  apartmentNote: string;
  source: string;
  browse: string;
  close: string;
  reopen: string;
  footer: string;
  tip: string;
  recommended: string;
  recommendationNote: string;
  recommendations: { label: string; link: string }[];
};

const products = {
  hangers: "/product/cecc1126-40a8-4f0a-8b93-d84036adf343",
  lamp: "/product/9d8533dd-e6bc-464a-b63a-1d36febc947d",
  desk: "/product/a3e85e4b-3c9b-4527-bbb5-6ea6606e2016",
  rice: "/product/c382afd1-1cd0-4425-9940-30e5a2addf19",
  vacuum: "/product/2c8ce4fc-a89f-4bfa-a2c3-1d86a172602a",
  kitchen: "/product/318e9897-bc1e-4a94-a49f-62290f4f43f2",
  bin: "/product/6ddc26f2-53c1-4d92-ae82-5bf5c805dab4",
  blanket: "/product/66266358-344b-48bd-a9a4-ef931e444910",
  comforter: "/product/c4043cb0-c35c-43ec-b01d-bcfb791016ad",
};

export const newStudentCopy: Record<"en" | "zh" | "zhCn", WelcomeCopy> = {
  en: {
    badge: "A little help settling in",
    title: "Welcome to",
    description: "New place. Fresh start. Find the everyday things that make it feel like home.",
    dorm: "Residence hall",
    apartment: "Off-campus",
    dormItems: [
      { title: "Sheets, pillow & blanket", detail: "Twin XL sheets for OSU residence halls. Confirm blanket dimensions with the seller.", link: products.blanket, linkLabel: "View blanket" },
      { title: "Shower & daily basics", detail: "Towels, toiletries, shower shoes and a water bottle." },
      { title: "Laundry day, sorted", detail: "A laundry basket, detergent and a few hangers.", link: products.hangers, linkLabel: "View hangers" },
      { title: "Your study essentials", detail: "Chargers, a surge-protected power strip and a desk lamp.", link: products.lamp, linkLabel: "View lamp" },
    ],
    apartmentItems: [
      { title: "A good night’s sleep", detail: "Check for a bed and mattress; confirm bedding dimensions before buying.", link: products.blanket, linkLabel: "View blanket" },
      { title: "Desk & chair", detail: "Ask what is furnished. Measure your space before buying.", link: products.desk, linkLabel: "View desk" },
      { title: "Your first home-cooked meal", detail: "A pot, dishes, utensils and food containers. A rice cooker if needed.", link: products.rice, linkLabel: "View rice cooker" },
      { title: "A clean start", detail: "Towels, toilet paper, trash bags and shared cleaning supplies.", link: products.vacuum, linkLabel: "View vacuum" },
    ],
    dormNote: "OSU halls provide basic furniture. Rice cookers belong in shared kitchens, not bedrooms. Check appliance rules before buying.",
    apartmentNote: "Coordinate shared items with roommates. Confirm furniture dimensions and pickup or delivery with each seller.",
    source: "OSU packing guide",
    browse: "Find my move-in essentials",
    close: "Close welcome guide",
    reopen: "New student guide",
    footer: "Individual listings · Check current availability and price",
    tip: "Bring what you own. Buy only what you need.",
    recommended: "More everyday essentials",
    recommendationNote: "Share cleaning supplies with roommates. In residence halls, use cookware in shared kitchens.",
    recommendations: [
      { label: "Kitchen utensils", link: products.kitchen },
      { label: "Vacuum cleaner", link: products.vacuum },
      { label: "Trash bin", link: products.bin },
      { label: "Queen-size comforter", link: products.comforter },
    ],
  },
  zh: {
    badge: "新生入住，從這裡開始",
    title: "歡迎來到",
    description: "新的城市，新的生活。先備齊第一週用品，慢慢把房間變成喜歡的樣子。",
    dorm: "住宿舍",
    apartment: "校外租屋",
    dormItems: [
      { title: "先睡個好覺", detail: "床單、枕頭、棉被；OSU 宿舍床單選 Twin XL，毯子尺寸請向賣家確認。", link: products.blanket, linkLabel: "看看毯子" },
      { title: "盥洗與日常用品", detail: "毛巾、牙刷、沐浴用品、洗澡拖鞋與水瓶。" },
      { title: "洗衣用品先備齊", detail: "洗衣籃、洗衣精與少量衣架。", link: products.hangers, linkLabel: "看看衣架" },
      { title: "準備你的讀書角落", detail: "充電器、防突波排插，再加一盞檯燈。", link: products.lamp, linkLabel: "看看檯燈" },
    ],
    apartmentItems: [
      { title: "先安頓睡覺的地方", detail: "確認有無床架、床墊，購買寢具前先確認尺寸。", link: products.blanket, linkLabel: "看看毯子" },
      { title: "書桌與椅子", detail: "先問房東附什麼，量好空間再添購。", link: products.desk, linkLabel: "看看書桌" },
      { title: "煮第一頓家常飯", detail: "鍋子、碗盤、餐具與保鮮盒；常吃飯再添電飯鍋。", link: products.rice, linkLabel: "看看電飯鍋" },
      { title: "乾淨入住，舒服生活", detail: "毛巾、衛生紙、垃圾袋，清潔用品可與室友共用。", link: products.vacuum, linkLabel: "看看吸塵器" },
    ],
    dormNote: "OSU 宿舍已附基本家具。電飯鍋須在公共廚房使用，不能在房間煮飯；買電器前先確認規定。",
    apartmentNote: "共用品先跟室友討論；買家具前，與賣家確認尺寸、取貨時間和搬運方式。",
    source: "OSU 官方入住清單",
    browse: "尋找我的入住用品",
    close: "關閉迎新清單",
    reopen: "新生入住清單",
    footer: "商品分別刊登・價格與庫存以商品頁及賣家確認為準",
    tip: "已有的就帶來，需要的再添購。",
    recommended: "這些生活用品，也一起備齊",
    recommendationNote: "清潔用品可與室友共用；住宿舍的同學，廚具請在公共廚房使用。",
    recommendations: [
      { label: "廚具", link: products.kitchen },
      { label: "吸塵器", link: products.vacuum },
      { label: "垃圾桶", link: products.bin },
      { label: "Queen 尺寸棉被", link: products.comforter },
    ],
  },
  zhCn: {
    badge: "新生入住，从这里开始",
    title: "欢迎来到",
    description: "新的城市，新的生活。先备齐第一周用品，慢慢把房间变成喜欢的样子。",
    dorm: "住宿舍",
    apartment: "校外租房",
    dormItems: [
      { title: "先睡个好觉", detail: "床单、枕头、被子；OSU 宿舍床单选 Twin XL，毯子尺寸请向卖家确认。", link: products.blanket, linkLabel: "看看毯子" },
      { title: "洗漱与日常用品", detail: "毛巾、牙刷、沐浴用品、洗澡拖鞋与水杯。" },
      { title: "洗衣用品先备齐", detail: "洗衣篮、洗衣液与少量衣架。", link: products.hangers, linkLabel: "看看衣架" },
      { title: "准备你的学习角落", detail: "充电器、防浪涌插排，再加一盏台灯。", link: products.lamp, linkLabel: "看看台灯" },
    ],
    apartmentItems: [
      { title: "先安顿睡觉的地方", detail: "确认有无床架、床垫，购买床上用品前先确认尺寸。", link: products.blanket, linkLabel: "看看毯子" },
      { title: "书桌与椅子", detail: "先问房东提供什么，量好空间再添置。", link: products.desk, linkLabel: "看看书桌" },
      { title: "做第一顿家常饭", detail: "锅、碗盘、餐具与保鲜盒；常吃米饭再添电饭煲。", link: products.rice, linkLabel: "看看电饭煲" },
      { title: "干净入住，舒服生活", detail: "毛巾、卫生纸、垃圾袋，清洁用品可与室友共用。", link: products.vacuum, linkLabel: "看看吸尘器" },
    ],
    dormNote: "OSU 宿舍已配基本家具。电饭煲须在公共厨房使用，不能在房间做饭；买电器前先确认规定。",
    apartmentNote: "共用品先跟室友讨论；买家具前，与卖家确认尺寸、取货时间和搬运方式。",
    source: "OSU 官方入住清单",
    browse: "寻找我的入住用品",
    close: "关闭迎新清单",
    reopen: "新生入住清单",
    footer: "商品分别发布・价格与库存以商品页及卖家确认为准",
    tip: "已有的就带来，需要的再添置。",
    recommended: "这些生活用品，也一起备齐",
    recommendationNote: "清洁用品可与室友共用；住宿舍的同学，厨具请在公共厨房使用。",
    recommendations: [
      { label: "厨具", link: products.kitchen },
      { label: "吸尘器", link: products.vacuum },
      { label: "垃圾桶", link: products.bin },
      { label: "Queen 尺寸被子", link: products.comforter },
    ],
  },
};
