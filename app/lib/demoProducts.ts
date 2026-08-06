export type DemoProduct = {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl: string;
  quantity: number;
  createdAt: string;
};

export const demoProducts: DemoProduct[] = [
  {
    id: "demo-bike",
    name: "Commuter Bike",
    description: "Lightly used commuter bike for campus errands and short rides.",
    price: 85,
    category: "general",
    imageUrl: "/images/Bike_0.jpg",
    quantity: 1,
    createdAt: "2026-06-19T12:00:00.000Z",
  },
  {
    id: "demo-dell-monitor",
    name: "Dell 24-inch Monitor",
    description: "External monitor with stand, good for dorm desks and study setups.",
    price: 70,
    category: "electronics",
    imageUrl: "/images/DellMonitor_0.jpg",
    quantity: 2,
    createdAt: "2026-06-18T12:00:00.000Z",
  },
  {
    id: "demo-mini-fridge",
    name: "Dorm Mini Fridge",
    description: "Compact fridge sized for dorm rooms or shared apartments.",
    price: 95,
    category: "electronics",
    imageUrl: "/images/Fridge1_0.jpg",
    quantity: 1,
    createdAt: "2026-06-17T12:00:00.000Z",
  },
  {
    id: "demo-led-lamp",
    name: "LED Desk Lamp",
    description: "Adjustable desk lamp with bright LED lighting.",
    price: 18,
    category: "home",
    imageUrl: "/images/LED lamp_0.jpg",
    quantity: 3,
    createdAt: "2026-06-16T12:00:00.000Z",
  },
  {
    id: "demo-bookshelf",
    name: "Small Bookshelf",
    description: "Compact shelf for books, decor, or dorm storage.",
    price: 35,
    category: "home",
    imageUrl: "/images/shelf_0.jpg",
    quantity: 1,
    createdAt: "2026-06-14T12:00:00.000Z",
  },
  {
    id: "demo-study-table",
    name: "Study Table",
    description: "Simple study table with enough room for a laptop and notes.",
    price: 55,
    category: "home",
    imageUrl: "/images/table_0.jpg",
    quantity: 1,
    createdAt: "2026-06-12T12:00:00.000Z",
  },
  {
    id: "demo-textbook",
    name: "CS Textbook Bundle",
    description: "Bundle of used computer science textbooks for reference or classes.",
    price: 30,
    category: "books",
    imageUrl: "/images/Fridge2_0.jpg",
    quantity: 4,
    createdAt: "2026-06-10T12:00:00.000Z",
  },
  {
    id: "demo-bike-helmet",
    name: "Bike Helmet",
    description: "Campus bike helmet with adjustable fit.",
    price: 20,
    category: "clothing",
    imageUrl: "/images/Bike2_0.jpg",
    quantity: 1,
    createdAt: "2026-06-08T12:00:00.000Z",
  },
];

export function canUseDemoProducts() {
  return process.env.ENABLE_DEMO_PRODUCTS === "true";
}

export function filterDemoProducts({
  name,
  category,
  sort,
  discounted,
  clearance,
  page,
  limit,
}: {
  name?: string | null;
  category?: string | null;
  sort?: string | null;
  discounted?: boolean;
  clearance?: boolean;
  page: number;
  limit: number;
}) {
  let products = demoProducts;

  if (name) {
    const query = name.toLowerCase();
    products = products.filter((product) =>
      product.name.toLowerCase().includes(query)
    );
  }

  if (category) {
    products = products.filter((product) => product.category === category);
  }

  if (discounted) {
    products = products.filter(
      (product) => Number((product as DemoProduct & { discountPercent?: number }).discountPercent) > 0
    );
  }

  if (clearance) {
    products = products.filter(
      (product) => Boolean((product as DemoProduct & { isClearance?: boolean }).isClearance)
    );
  }

  if (sort === "asc" || sort === "desc") {
    products = [...products].sort((a, b) =>
      sort === "asc" ? a.price - b.price : b.price - a.price
    );
  }

  const total = products.length;
  const start = (page - 1) * limit;
  const data = products.slice(start, start + limit);

  return { data, total, page, limit };
}

export function findDemoProduct(id: string) {
  return demoProducts.find((product) => product.id === id) ?? null;
}
