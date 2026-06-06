import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { canUseDemoProducts, filterDemoProducts } from "@/app/lib/demoProducts";
import { translateProductName } from "@/app/lib/productTranslations";

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
    imageUrl: imageUrls[0] ?? null,
    imageUrls,
    sellerId: row.seller_id,
    status: row.status ?? "available",
    quantity: row.quantity ?? 1,
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
      .select("*", { count: "exact" })
      .eq("status", "available")
      .gt("quantity", 0);

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
    if (!canUseDemoProducts()) {
      return NextResponse.json(
        { message: "Failed to load products." },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);

    return NextResponse.json(
      {
        ...filterDemoProducts({
          name: searchParams.get("name"),
          category: searchParams.get("category"),
          sort: searchParams.get("sort"),
          page,
          limit,
        }),
        source: "demo",
      },
      { status: 200 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "You must be logged in to list an item." },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim();
    const category = String(body.category ?? "").trim();
    const imageUrls = Array.isArray(body.imageUrls)
      ? body.imageUrls
          .map((value: unknown) => String(value ?? "").trim())
          .filter(Boolean)
      : [];
    const fallbackImageUrl = String(body.imageUrl ?? "").trim();
    if (imageUrls.length === 0 && fallbackImageUrl) {
      imageUrls.push(fallbackImageUrl);
    }
    if (imageUrls.length === 0) {
      return NextResponse.json(
        { message: "At least one product image is required." },
        { status: 400 }
      );
    }
    if (imageUrls.length > 3) {
      return NextResponse.json(
        { message: "You can add up to 3 product images." },
        { status: 400 }
      );
    }
    const imageUrl = imageUrls[0] ?? "";
    const contactPhone = String(body.contactPhone ?? "").trim();
    const contactLineId = String(body.contactLineId ?? "").trim();
    const contactWechatId = String(body.contactWechatId ?? "").trim();
    const price = Number(body.price);
    const quantity = Number(body.quantity ?? 1);

    if (!name || !Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        { message: "Name and a valid price are required." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json(
        { message: "Quantity must be at least 1." },
        { status: 400 }
      );
    }

    const nameTranslations = await translateProductName(name);

    const insertValues = {
      name,
      description: description || null,
      name_en: nameTranslations.en,
      name_zh_tw: nameTranslations.zhTw,
      name_zh_cn: nameTranslations.zhCn,
      price,
      category: category || "general",
      image_url: imageUrl || null,
      image_urls: imageUrls.length > 0 ? imageUrls : null,
      contact_phone: contactPhone || null,
      contact_line_id: contactLineId || null,
      contact_wechat_id: contactWechatId || null,
      seller_id: session.user.id,
      quantity,
      status: "available",
    };

    let { data, error } = await supabase
      .from("products")
      .insert(insertValues)
      .select(
        "product_id, name, description, name_en, name_zh_tw, name_zh_cn, price, category, image_url, image_urls, seller_id, status, quantity"
      )
      .single();

    if (error && /description|name_(en|zh_tw|zh_cn)|image_urls|contact_(phone|line_id|wechat_id)|schema cache/i.test(error.message ?? "")) {
      const {
        description,
        name_en,
        name_zh_tw,
        name_zh_cn,
        image_urls,
        contact_phone,
        contact_line_id,
        contact_wechat_id,
        ...legacyValues
      } = insertValues;
      const legacyResult = await supabase
        .from("products")
        .insert(legacyValues)
        .select("product_id, name, price, category, image_url, seller_id, status, quantity")
        .single();

      data = legacyResult.data as any;
      error = legacyResult.error;
    }

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
