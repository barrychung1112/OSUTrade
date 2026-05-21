import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/utils/supabase/admin";

type ProductStatus = "available" | "pending" | "sold" | "removed";

type ProductRow = {
  product_id: string | number;
  name: string;
  price: number;
  category: string | null;
  image_url: string | null;
  seller_id: string | null;
  status: ProductStatus | null;
  created_at: string | null;
};

const productStatuses = new Set<ProductStatus>([
  "available",
  "pending",
  "sold",
  "removed",
]);

function toProduct(row: ProductRow) {
  return {
    id: row.product_id,
    name: row.name,
    price: row.price,
    category: row.category,
    imageUrl: row.image_url,
    sellerId: row.seller_id,
    status: row.status ?? "available",
    createdAt: row.created_at,
  };
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "You must be logged in to view seller products." },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("products")
      .select(
        "product_id, name, price, category, image_url, seller_id, status, created_at"
      )
      .eq("seller_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ data: (data ?? []).map(toProduct) });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to load seller products.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "You must be logged in to update seller products." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const productId = String(body.productId ?? "").trim();
    const status = String(body.status ?? "").trim() as ProductStatus;

    if (!productId || !productStatuses.has(status)) {
      return NextResponse.json(
        { message: "Product id and a valid status are required." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("products")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("product_id", productId)
      .eq("seller_id", session.user.id)
      .select(
        "product_id, name, price, category, image_url, seller_id, status, created_at"
      )
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ product: toProduct(data) });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to update seller product.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
