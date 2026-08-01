import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/utils/supabase/admin";
import { generateCrossPostCopies } from "@/app/lib/crossPostCopy";
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
    category: row.category,
    imageUrl: imageUrls[0] ?? null,
    imageUrls,
    sellerId: row.seller_id,
    status: row.status ?? "available",
    quantity: row.quantity ?? 1,
  };
}

function normalizeProductIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const valueId of value) {
    const id = String(valueId ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "You must be logged in to generate cross-post copy." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const productIds = normalizeProductIds(body?.productIds);
    if (productIds.length < 1 || productIds.length > 10) {
      return NextResponse.json(
        { message: "Select between 1 and 10 products." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("products")
      .select(
        "product_id,name,description,description_en,description_zh_tw,description_zh_cn,name_en,name_zh_tw,name_zh_cn,price,category,image_url,image_urls,seller_id,status,quantity"
      )
      .in("product_id", productIds)
      .eq("seller_id", session.user.id)
      .eq("status", "available");

    if (error) throw error;

    const rows = (data ?? []) as ProductRow[];
    if (rows.length !== productIds.length) {
      return NextResponse.json(
        { message: "One or more selected products are unavailable." },
        { status: 400 }
      );
    }

    const rowsById = new Map(
      rows.map((row) => [String(row.product_id), row] as const)
    );
    const listings = productIds.map((id) => {
      const row = rowsById.get(id)!;
      return {
        product: toProduct(row),
        productUrl: `${request.nextUrl.origin}/product/${encodeURIComponent(id)}`,
      };
    });

    const result = await generateCrossPostCopies(listings);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Failed to generate cross-post copy." },
      { status: 500 }
    );
  }
}
