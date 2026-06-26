import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/utils/supabase/admin";
import { generateCrossPostCopies } from "@/app/lib/crossPostCopy";

type ProductRow = {
  product_id: string | number;
  name: string;
  description?: string | null;
  description_en?: string | null;
  description_zh_tw?: string | null;
  description_zh_cn?: string | null;
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
    descriptionTranslations: {
      en: row.description_en ?? row.description ?? "",
      zhTw: row.description_zh_tw ?? row.description ?? "",
      zhCn: row.description_zh_cn ?? row.description ?? "",
    },
    price: row.price,
    category: row.category,
    imageUrl: imageUrls[0] ?? null,
    imageUrls,
    sellerId: row.seller_id,
    status: row.status ?? "available",
    quantity: row.quantity ?? 1,
    sellerContact: {
      phone: row.contact_phone ?? null,
      lineId: row.contact_line_id ?? null,
      wechatId: row.contact_wechat_id ?? null,
    },
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "You must be logged in to generate cross-post copy." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const includeContactInfo = body?.includeContactInfo === true;
    const productUrl = `${request.nextUrl.origin}/product/${id}`;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("product_id", id)
      .eq("seller_id", session.user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { message: "Product not found." },
          { status: 404 }
        );
      }

      throw error;
    }

    const result = await generateCrossPostCopies(toProduct(data), {
      includeContactInfo,
      productUrl,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate cross-post copy.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
