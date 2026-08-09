import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { canUseDemoProducts, findDemoProduct } from "@/app/lib/demoProducts";
import { toProductRecord } from "@/app/lib/productRecord";

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

    return NextResponse.json(toProductRecord(data), { status: 200 });
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
