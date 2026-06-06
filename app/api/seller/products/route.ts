import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/utils/supabase/admin";

type ProductStatus = "available" | "pending" | "sold" | "removed";

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
  contact_phone?: string | null;
  contact_line_id?: string | null;
  contact_wechat_id?: string | null;
  seller_id: string | null;
  status: ProductStatus | null;
  quantity: number | null;
  created_at: string | null;
};

const productStatuses = new Set<ProductStatus>([
  "available",
  "pending",
  "sold",
  "removed",
]);

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
    sellerContact: {
      phone: row.contact_phone ?? null,
      lineId: row.contact_line_id ?? null,
      wechatId: row.contact_wechat_id ?? null,
    },
    status: row.status ?? "available",
    quantity: row.quantity ?? 1,
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
      .select("*")
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
    const { data: existing, error: lookupError } = await supabase
      .from("products")
      .select("product_id, quantity")
      .eq("product_id", productId)
      .eq("seller_id", session.user.id)
      .single();

    if (lookupError) {
      throw lookupError;
    }

    const currentQuantity = Number(existing.quantity ?? 0);
    const nextValues =
      status === "sold"
        ? { status, quantity: 0, updated_at: new Date().toISOString() }
        : {
            status,
            quantity: Math.max(1, currentQuantity),
            updated_at: new Date().toISOString(),
          };

    const { data, error } = await supabase
      .from("products")
      .update(nextValues)
      .eq("product_id", productId)
      .eq("seller_id", session.user.id)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    if (status === "sold") {
      await supabase
        .from("trade_requests")
        .update({ status: "declined", updated_at: new Date().toISOString() })
        .eq("product_id", productId)
        .eq("status", "sent");
    }

    return NextResponse.json({ product: toProduct(data) });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to update seller product.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
