import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { findDemoProduct } from "@/app/lib/demoProducts";

type ProductRow = {
  product_id: string | number;
  name: string;
  price: number;
  category: string | null;
  image_url: string | null;
};

function toProduct(row: ProductRow) {
  return {
    id: row.product_id,
    name: row.name,
    price: row.price,
    category: row.category,
    imageUrl: row.image_url,
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
      .select("product_id, name, price, category, image_url")
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
    const { id } = await params;
    const product = findDemoProduct(id);

    if (!product) {
      return NextResponse.json({ message: "Product not found." }, { status: 404 });
    }

    return NextResponse.json({ ...product, source: "demo" }, { status: 200 });
  }
}
