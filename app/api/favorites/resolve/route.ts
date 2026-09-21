import { NextResponse } from "next/server";
import { isPublicFavoriteProduct, normalizeFavoriteProductIds } from "@/app/lib/favorites";
import { type ProductRow, toProductRecord } from "@/app/lib/productRecord";
import { createClient } from "@/utils/supabase/server";

const productSelect =
  "product_id,name,description,description_en,description_zh_tw,description_zh_cn,name_en,name_zh_tw,name_zh_cn,price,discount_percent,clearance_price,effective_price,category,image_url,image_urls,seller_id,status,quantity,created_at";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      productIds?: unknown;
    } | null;
    const productIds = normalizeFavoriteProductIds(body?.productIds);

    if (productIds.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select(productSelect)
      .in("product_id", productIds)
      .eq("status", "available")
      .gt("quantity", 0);

    if (error) throw error;

    const productsById = new Map(
      ((data ?? []) as ProductRow[])
        .filter(isPublicFavoriteProduct)
        .map((row) => [String(row.product_id), toProductRecord(row)])
    );
    const products = productIds.flatMap((productId) => {
      const product = productsById.get(productId);
      return product ? [product] : [];
    });

    return NextResponse.json({ data: products }, { status: 200 });
  } catch (error) {
    console.error("Failed to resolve favorite products.", error);
    return NextResponse.json(
      { message: "Failed to resolve favorite products." },
      { status: 500 }
    );
  }
}
