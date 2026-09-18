import type { Metadata } from "next";

import HomePageClient from "./HomePageClient";
import { selectRandomHomeHeroProducts } from "./lib/homeHeroProducts";
import { getHomeSeason } from "./lib/homeSeason";
import { listPublicProducts } from "./lib/publicProduct";

export const dynamic = "force-dynamic";

const title = "OSUTrade | Used Furniture, Textbooks & Dorm Essentials in Corvallis";
const description =
  "Find secondhand furniture, textbooks, appliances, and dorm essentials from Oregon State students in Corvallis, then arrange local pickup directly with sellers.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/" },
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "OSUTrade",
    type: "website",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

export default async function HomePage() {
  const season = getHomeSeason();

  try {
    const products = await listPublicProducts();
    const heroProducts = selectRandomHomeHeroProducts(products);

    return <HomePageClient products={products} heroProducts={heroProducts} season={season} />;
  } catch (error) {
    console.error("Failed to load public homepage discovery data.", error);
    return <HomePageClient products={[]} heroProducts={[]} season={season} discoveryError />;
  }
}
