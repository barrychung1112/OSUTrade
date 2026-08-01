import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { canUseDemoProducts, findDemoProduct } from "@/app/lib/demoProducts";
import { getProductPricing } from "@/app/lib/productDiscount";

type ProductRow = {
  product_id: string | number;
  name: string;
  description?: string | null;
  description_en?: string | null;
  description_zh_tw?: string | null;
  description_zh_cn?: string | null;
  name_en?: string | null;
  name_zh_tw?: string | null;
  name_zh_cn?: string | null;
  price: number;
  discount_percent?: number | null;
  effective_price?: number | null;
  category: string | null;
  image_url: string | null;
  image_urls?: string[] | null;
  seller_id: string | null;
  status: string | null;
  quantity: number | null;
};

function normalizeImageUrls(imageUrls?: string[] | null, imageUrl?: string | null) {
  const urls = Array.isArray(imageUrls)
    ? imageUrls.filter((url) => typeof url === "string" && url.trim())
    : [];
  if (urls.length > 0) return urls;
  return imageUrl ? [imageUrl] : [];
}

function toProduct(row: ProductRow) {
  const imageUrls = normalizeImageUrls(row.image_urls, row.image_url);
  const pricing = getProductPricing(row);
  return {
    id: row.product_id,
    name: row.name,
    description: row.description ?? "",
    nameTranslations: {
      en: row.name_en ?? row.name,
      zhTw: row.name_zh_tw ?? row.name,
      zhCn: row.name_zh_cn ?? row.name,
    },
    descriptionTranslations: {
      en: row.description_en ?? row.description ?? "",
      zhTw: row.description_zh_tw ?? row.description ?? "",
      zhCn: row.description_zh_cn ?? row.description ?? "",
    },
    price: pricing.effectivePrice,
    originalPrice: pricing.originalPrice,
    effectivePrice: pricing.effectivePrice,
    discountPercent: pricing.discountPercent,
    category: row.category,
    imageUrl: imageUrls[0] ?? null,
    imageUrls,
    sellerId: row.seller_id,
    status: row.status ?? "available",
    quantity: row.quantity ?? 1,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("product_id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ message: "Product not found." }, { status: 404 });
      }

      throw error;
    }

    return NextResponse.json(toProduct(data), { status: 200 });
  } catch (error) {
    console.error(error);
    if (!canUseDemoProducts()) {
      return NextResponse.json(
        { message: "Failed to load product." },
        { status: 500 }
      );
    }

    const { id } = await params;
    const product = findDemoProduct(id);

    if (!product) {
      return NextResponse.json({ message: "Product not found." }, { status: 404 });
    }

    return NextResponse.json({ ...product, source: "demo" }, { status: 200 });
  }
}
