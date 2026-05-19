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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {
      return NextResponse.json(
        { message: "You must be logged in to list an item." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const category = String(body.category ?? "").trim();
    const imageUrl = String(body.imageUrl ?? "").trim();
    const price = Number(body.price);

    if (!name || !Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        { message: "Name and a valid price are required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("products")
      .insert({
        name,
        price,
        category: category || "general",
        image_url: imageUrl || null,
      })
      .select("product_id, name, price, category, image_url")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(toProduct(data), { status: 201 });
  } catch (error) {
    console.error(error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
