import { NextResponse } from "next/server";
import { normalizeFavoriteProductIds, isPublicFavoriteProduct } from "@/app/lib/favorites";
import { type ProductRow, toProductRecord } from "@/app/lib/productRecord";
import { getAccountAccessErrorResponse } from "@/utils/auth/accountAccessResponse";
import { requireActiveUser } from "@/utils/auth/requireActiveUser";
import { createAdminClient } from "@/utils/supabase/admin";

const productSelect =
  "product_id,name,description,description_en,description_zh_tw,description_zh_cn,name_en,name_zh_tw,name_zh_cn,price,discount_percent,clearance_price,effective_price,category,image_url,image_urls,seller_id,status,quantity,created_at";

function orderProducts(rows: ProductRow[], productIds: string[]) {
  const productsById = new Map(
    rows
      .filter(isPublicFavoriteProduct)
      .map((row) => [String(row.product_id), toProductRecord(row)])
  );

  return productIds.flatMap((productId) => {
    const product = productsById.get(productId);
    return product ? [product] : [];
  });
}

async function loadAvailableProducts(
  supabase: ReturnType<typeof createAdminClient>,
  productIds: string[]
) {
  if (productIds.length === 0) return [];

  const { data, error } = await supabase
    .from("products")
    .select(productSelect)
    .in("product_id", productIds)
    .eq("status", "available")
    .gt("quantity", 0);

  if (error) throw error;

  return orderProducts((data ?? []) as ProductRow[], productIds);
}

export async function GET() {
  try {
    const session = await requireActiveUser();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("product_favorites")
      .select("product_id")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const productIds = normalizeFavoriteProductIds(
      (data ?? []).map((favorite) => favorite.product_id)
    );
    const products = await loadAvailableProducts(supabase, productIds);

    return NextResponse.json({ data: products }, { status: 200 });
  } catch (error) {
    const accessResponse = getAccountAccessErrorResponse(
      error,
      "You must be logged in to view favorites."
    );
    if (accessResponse) return accessResponse;

    console.error("Failed to load favorites.", error);
    return NextResponse.json(
      { message: "Failed to load favorites." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireActiveUser();
    const body = (await request.json().catch(() => null)) as {
      productId?: unknown;
      productIds?: unknown;
    } | null;
    const rawProductIds = Array.isArray(body?.productIds)
      ? body.productIds
      : [body?.productId];
    const productIds = normalizeFavoriteProductIds(rawProductIds);

    if (productIds.length === 0) {
      return NextResponse.json(
        { message: "At least one product is required." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("product_favorites").upsert(
      productIds.map((productId) => ({
        user_id: session.user.id,
        product_id: productId,
      })),
      { onConflict: "user_id,product_id", ignoreDuplicates: true }
    );

    if (error) throw error;

    return NextResponse.json({ data: productIds }, { status: 200 });
  } catch (error) {
    const accessResponse = getAccountAccessErrorResponse(
      error,
      "You must be logged in to save favorites."
    );
    if (accessResponse) return accessResponse;

    console.error("Failed to save favorites.", error);
    return NextResponse.json(
      { message: "Failed to save favorites." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireActiveUser();
    const body = (await request.json().catch(() => null)) as {
      productId?: unknown;
    } | null;
    const productId = normalizeFavoriteProductIds([body?.productId], 1)[0];

    if (!productId) {
      return NextResponse.json(
        { message: "A product is required." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("product_favorites")
      .delete()
      .eq("user_id", session.user.id)
      .eq("product_id", productId);

    if (error) throw error;

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const accessResponse = getAccountAccessErrorResponse(
      error,
      "You must be logged in to remove favorites."
    );
    if (accessResponse) return accessResponse;

    console.error("Failed to remove favorite.", error);
    return NextResponse.json(
      { message: "Failed to remove favorite." },
      { status: 500 }
    );
  }
}
