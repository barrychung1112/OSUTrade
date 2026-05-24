import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { canUseDemoProducts, findDemoProduct } from "@/app/lib/demoProducts";

type ProductRow = {
  product_id: string | number;
  name: string;
  description?: string | null;
  name_en?: string | null;
  name_zh_tw?: string | null;
  name_zh_cn?: string | null;
  price: number;
  category: string | null;
  image_url: string | null;
  seller_id: string | null;
  status: string | null;
  quantity: number | null;
};

function toProduct(row: ProductRow) {
  return {
    id: row.product_id,
    name: row.name,
    description: row.description ?? "",
    nameTranslations: {
      en: row.name_en ?? row.name,
      zhTw: row.name_zh_tw ?? row.name,
      zhCn: row.name_zh_cn ?? row.name,
    },
    price: row.price,
    category: row.category,
    imageUrl: row.image_url,
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
