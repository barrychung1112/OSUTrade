import { NextResponse, type NextRequest } from "next/server";
import { type ProductRow, toProductRecord } from "@/app/lib/productRecord";
import { createAdminClient } from "@/utils/supabase/admin";

const productSelect =
  "product_id,name,description,description_en,description_zh_tw,description_zh_cn,name_en,name_zh_tw,name_zh_cn,price,discount_percent,clearance_price,effective_price,category,image_url,image_urls,seller_id,status,quantity,created_at";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function positiveInteger(value: string | null, fallback: number, maximum: number) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sellerId: string }> }
) {
  try {
    const { sellerId } = await params;

    if (!uuidPattern.test(sellerId)) {
      return NextResponse.json({ message: "Seller not found." }, { status: 404 });
    }

    const page = positiveInteger(request.nextUrl.searchParams.get("page"), 1, 10_000);
    const limit = positiveInteger(request.nextUrl.searchParams.get("limit"), 20, 50);
    const rangeFrom = (page - 1) * limit;
    const rangeTo = rangeFrom + limit - 1;
    const supabase = createAdminClient();

    const { data: seller, error: sellerError } = await supabase
      .from("users")
      .select("id,name")
      .eq("id", sellerId)
      .maybeSingle();

    if (sellerError) throw sellerError;
    if (!seller) {
      return NextResponse.json({ message: "Seller not found." }, { status: 404 });
    }

    const { data, error, count } = await supabase
      .from("products")
      .select(productSelect, { count: "exact" })
      .eq("seller_id", sellerId)
      .eq("status", "available")
      .gt("quantity", 0)
      .order("created_at", { ascending: false })
      .range(rangeFrom, rangeTo);

    if (error) throw error;

    return NextResponse.json(
      {
        seller: { id: seller.id, name: seller.name },
        data: ((data ?? []) as ProductRow[]).map(toProductRecord),
        total: count ?? 0,
        page,
        limit,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to load seller profile.", error);
    return NextResponse.json(
      { message: "Failed to load seller profile." },
      { status: 500 }
    );
  }
}
