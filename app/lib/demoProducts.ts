export type DemoProduct = {
  id: string;
  name: string;
  price: number;
  category: string;
  imageUrl: string;
};

export const demoProducts: DemoProduct[] = [
  {
    id: "demo-bike",
    name: "Commuter Bike",
    price: 85,
    category: "general",
    imageUrl: "/images/Bike_0.jpg",
  },
  {
    id: "demo-dell-monitor",
    name: "Dell 24-inch Monitor",
    price: 70,
    category: "electronics",
    imageUrl: "/images/DellMonitor_0.jpg",
  },
  {
    id: "demo-mini-fridge",
    name: "Dorm Mini Fridge",
    price: 95,
    category: "electronics",
    imageUrl: "/images/Fridge1_0.jpg",
  },
  {
    id: "demo-led-lamp",
    name: "LED Desk Lamp",
    price: 18,
    category: "home",
    imageUrl: "/images/LED lamp_0.jpg",
  },
  {
    id: "demo-bookshelf",
    name: "Small Bookshelf",
    price: 35,
    category: "home",
    imageUrl: "/images/shelf_0.jpg",
  },
  {
    id: "demo-study-table",
    name: "Study Table",
    price: 55,
    category: "home",
    imageUrl: "/images/table_0.jpg",
  },
  {
    id: "demo-textbook",
    name: "CS Textbook Bundle",
    price: 30,
    category: "books",
    imageUrl: "/images/Fridge2_0.jpg",
  },
  {
    id: "demo-bike-helmet",
    name: "Bike Helmet",
    price: 20,
    category: "clothing",
    imageUrl: "/images/Bike2_0.jpg",
  },
];

export function canUseDemoProducts() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_DEMO_PRODUCTS === "true"
  );
}

export function filterDemoProducts({
  name,
  category,
  sort,
  page,
  limit,
}: {
  name?: string | null;
  category?: string | null;
  sort?: string | null;
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
