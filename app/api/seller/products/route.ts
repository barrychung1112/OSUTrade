import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/utils/supabase/admin";
import { buildSellerProductUpdate } from "@/app/lib/sellerProductUpdate";
import {
  translateProductDescription,
  translateProductName,
} from "@/app/lib/productTranslations";
import {
  getActivePriceChangeRecipients,
  notifyTradeEvent,
} from "@/app/lib/notifications";
import { getProductPricing } from "@/app/lib/productDiscount";

type ProductStatus = "available" | "pending" | "sold" | "removed";

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
  discount_percent?: number | null;
  effective_price?: number | null;
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
  const pricing = getProductPricing(row);
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
    price: pricing.effectivePrice,
    originalPrice: pricing.originalPrice,
    effectivePrice: pricing.effectivePrice,
    discountPercent: pricing.discountPercent,
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

async function getEmailByUserId(userId: string | null | undefined) {
  if (!userId) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    throw error;
  }

  return data.user?.email ?? null;
}

async function safeNotifyTradeEvent(
  args: Parameters<typeof notifyTradeEvent>[0]
) {
  try {
    await notifyTradeEvent(args);
  } catch (error) {
    console.error("Failed to create trade notification.", error);
  }
}

async function safeGetEmailByUserId(userId: string | null | undefined) {
  try {
    return await getEmailByUserId(userId);
  } catch (error) {
    console.error("Failed to load notification recipient email.", error);
    return null;
  }
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
    const hasStatus = Object.prototype.hasOwnProperty.call(body, "status");
    const status = String(body.status ?? "").trim() as ProductStatus;

    if (!productId || (hasStatus && !productStatuses.has(status))) {
      return NextResponse.json(
        { message: "Product id and a valid update are required." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data: existing, error: lookupError } = await supabase
      .from("products")
      .select("*")
      .eq("product_id", productId)
      .eq("seller_id", session.user.id)
      .single();

    if (lookupError) {
      throw lookupError;
    }

    const updatedAt = new Date().toISOString();
    const currentQuantity = Number(existing.quantity ?? 0);
    const editResult = buildSellerProductUpdate(existing, body, updatedAt);

    if (editResult.ok === false) {
      return NextResponse.json({ message: editResult.message }, { status: 400 });
    }

    const nextValues: Record<string, unknown> = hasStatus
      ? status === "sold"
        ? { ...editResult.values, status, quantity: 0, updated_at: updatedAt }
        : {
            ...editResult.values,
            status,
            quantity:
              Object.prototype.hasOwnProperty.call(editResult.values, "quantity")
                ? editResult.values.quantity
                : Math.max(1, currentQuantity),
            updated_at: updatedAt,
          }
      : editResult.values;

    if (Object.prototype.hasOwnProperty.call(body, "name")) {
      const nameTranslations = await translateProductName(String(nextValues.name));
      nextValues.name_en = nameTranslations.en;
      nextValues.name_zh_tw = nameTranslations.zhTw;
      nextValues.name_zh_cn = nameTranslations.zhCn;
    }

    if (Object.prototype.hasOwnProperty.call(body, "description")) {
      const description = String(body.description ?? "").trim();
      const descriptionTranslations = description
        ? await translateProductDescription(description)
        : { en: "", zhTw: "", zhCn: "" };
      nextValues.description_en = descriptionTranslations.en || null;
      nextValues.description_zh_tw = descriptionTranslations.zhTw || null;
      nextValues.description_zh_cn = descriptionTranslations.zhCn || null;
    }

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

    if (hasStatus && status === "sold") {
      await supabase
        .from("trade_requests")
        .update({ status: "declined", updated_at: new Date().toISOString() })
        .eq("product_id", productId)
        .eq("status", "sent");
    }

    const oldPrice = getProductPricing(existing).effectivePrice;
    const newPrice = getProductPricing(data).effectivePrice;
    const priceChanged =
      (Object.prototype.hasOwnProperty.call(body, "price") ||
        Object.prototype.hasOwnProperty.call(body, "discountPercent")) &&
      Number.isFinite(oldPrice) &&
      Number.isFinite(newPrice) &&
      oldPrice !== newPrice;

    if (priceChanged) {
      const { data: requestRows, error: requestRowsError } = await supabase
        .from("trade_requests")
        .select(
          "request_id, buyer_id, quantity, note, status, created_at, price_at_request"
        )
        .eq("product_id", productId)
        .eq("status", "sent");

      if (requestRowsError) {
        throw requestRowsError;
      }

      const recipients = getActivePriceChangeRecipients(
        requestRows ?? [],
        newPrice
      );

      for (const recipient of recipients) {
        const requestRow = (requestRows ?? []).find(
          (row) => row.request_id === recipient.requestId
        );

        if (!requestRow) continue;

        await safeNotifyTradeEvent({
          supabase,
          input: {
            type: "price_changed",
            recipientId: recipient.buyerId,
            actorId: session.user.id,
            request: {
              id: requestRow.request_id,
              quantity: requestRow.quantity,
              note: requestRow.note,
              priceAtRequest: recipient.oldPrice,
            },
            product: {
              id: data.product_id,
              name: data.name,
              price: newPrice,
            },
            priceChange: {
              oldPrice: recipient.oldPrice,
              newPrice: recipient.newPrice,
            },
          },
          recipientEmail: await safeGetEmailByUserId(recipient.buyerId),
        });
      }
    }

    return NextResponse.json({ product: toProduct(data) });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to update seller product.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
