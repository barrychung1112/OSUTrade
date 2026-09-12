import HomePageClient from "./HomePageClient";
import { listPublicProducts } from "./lib/publicProduct";

export default async function HomePage() {
  try {
    const products = await listPublicProducts();
    return <HomePageClient products={products} />;
  } catch (error) {
    console.error("Failed to load public homepage discovery data.", error);
    return <HomePageClient products={[]} discoveryError />;
  }
}
