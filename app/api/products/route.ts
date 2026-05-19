import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const searchParams = request.nextUrl.searchParams;
    const name = searchParams.get("name");
    const category = searchParams.get("category");
    const sort = searchParams.get("sort");

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);
    const rangeFrom = (page - 1) * limit;
    const rangeTo = rangeFrom + limit - 1;

    let query = supabase
      .from("products")
      .select("product_id, name, price, category, image_url", {
        count: "exact",
      });

    if (name) {
      query = query.ilike("name", `%${name}%`);
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (sort === "asc" || sort === "desc") {
      query = query.order("price", { ascending: sort === "asc" });
    }

    query = query.range(rangeFrom, rangeTo);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json(
      {
        data: (data ?? []).map(toProduct),
        total: count ?? 0,
        page,
        limit,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
