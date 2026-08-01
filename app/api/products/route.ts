import { after, NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { auth } from "@/auth";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { canUseDemoProducts, filterDemoProducts } from "@/app/lib/demoProducts";
import {
  translateProductDescription,
  translateProductName,
} from "@/app/lib/productTranslations";
import { notifyMatchingWantedRequests } from "@/app/lib/wantedRequests";
import { buildProductNameSearchFilter } from "@/app/lib/productSearch";
import { applyProductListSort } from "@/app/lib/productSort";
import { getProductPricing } from "@/app/lib/productDiscount";

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
  seller_id: string | null;
  status: string | null;
  quantity: number | null;
  created_at?: string | null;
};

export const maxDuration = 60;

function productIdForIdempotencyKey(userId: string, key: string) {
  const hex = createHash("sha256")
    .update(`${userId}\0${key}`)
    .digest("hex")
    .slice(0, 32);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

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
    status: row.status ?? "available",
    quantity: row.quantity ?? 1,
    createdAt: row.created_at ?? null,
  };
}

const schemaOptionalFields = [
  "description",
  "description_en",
  "description_zh_tw",
  "description_zh_cn",
  "name_en",
  "name_zh_tw",
  "name_zh_cn",
  "image_urls",
  "contact_phone",
  "contact_line_id",
  "contact_wechat_id",
] as const;

function withoutUnsupportedSchemaField<T extends Record<string, unknown>>(
  values: T,
  message: string
) {
  const nextValues = { ...values };
  const normalizedMessage = message.toLowerCase();
  let removedField = false;

  for (const field of schemaOptionalFields) {
    const mentionsField =
      field === "description"
        ? /\bdescription\b/.test(normalizedMessage) &&
          !/description_(en|zh_tw|zh_cn)/.test(normalizedMessage)
        : normalizedMessage.includes(field);

    if (mentionsField) {
      delete nextValues[field];
      removedField = true;
    }
  }

  if (!removedField && /schema cache|could not find/i.test(message)) {
    for (const field of schemaOptionalFields) {
      delete nextValues[field];
    }
  }

  return {
    values: nextValues,
    changed: Object.keys(nextValues).length !== Object.keys(values).length,
  };
}

async function safeNotifyMatchingWantedRequests({
  supabase,
  product,
}: {
  supabase: ReturnType<typeof createAdminClient>;
  product: ProductRow;
}) {
  try {
    await notifyMatchingWantedRequests({ supabase, product });
  } catch (error) {
    console.error("Failed to notify matching wanted requests.", error);
  }
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

    if (name?.trim()) {
      query = query.or(buildProductNameSearchFilter(name));
    }

    if (category) {
      query = query.eq("category", category);
    }

    query = applyProductListSort(query, sort);

    query = query.range(rangeFrom, rangeTo);

    const { data, error, count } = await query;

    if (error) throw error;

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
    const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
    if (idempotencyKey.length > 128) {
      return NextResponse.json(
        { message: "Invalid idempotency key." },
        { status: 400 }
      );
    }

    let idempotencyAvailable = Boolean(idempotencyKey);
    let fallbackProductId = "";
    if (idempotencyKey) {
      const { data: existingProduct, error: existingError } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", session.user.id)
        .eq("client_request_id", idempotencyKey)
        .maybeSingle();

      if (existingError) {
        const message = existingError.message ?? "";
        const missingIdempotencyColumn =
          /client_request_id/i.test(message) &&
          (existingError.code === "42703" ||
            existingError.code === "PGRST204" ||
            /schema cache|could not find|does not exist/i.test(message));
        if (!missingIdempotencyColumn) throw existingError;
        idempotencyAvailable = false;
        fallbackProductId = productIdForIdempotencyKey(
          session.user.id,
          idempotencyKey
        );
      }
      if (existingProduct) {
        return NextResponse.json(toProduct(existingProduct as ProductRow), {
          status: 200,
        });
      }
    }

    if (fallbackProductId) {
      const { data: existingProduct, error: existingError } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", session.user.id)
        .eq("product_id", fallbackProductId)
        .maybeSingle();

      if (existingError) throw existingError;
      if (existingProduct) {
        return NextResponse.json(toProduct(existingProduct as ProductRow), {
          status: 200,
        });
      }
    }

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

    const [nameTranslations, descriptionTranslations] = await Promise.all([
      translateProductName(name),
      description
        ? translateProductDescription(description)
        : Promise.resolve({ en: "", zhTw: "", zhCn: "" }),
    ]);

    const insertValues = {
      name,
      description: description || null,
      description_en: descriptionTranslations.en || null,
      description_zh_tw: descriptionTranslations.zhTw || null,
      description_zh_cn: descriptionTranslations.zhCn || null,
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
      ...(idempotencyAvailable
        ? { client_request_id: idempotencyKey }
        : {}),
      ...(fallbackProductId ? { product_id: fallbackProductId } : {}),
      seller_id: session.user.id,
      quantity,
      status: "available",
    };

    let currentInsertValues: Record<string, unknown> = insertValues;
    let data: ProductRow | null = null;
    let error: any = null;

    for (let attempt = 0; attempt <= schemaOptionalFields.length; attempt += 1) {
      const result = await supabase
        .from("products")
        .insert(currentInsertValues)
        .select("*")
        .single();

      data = result.data as ProductRow | null;
      error = result.error;

      if (!error) {
        break;
      }

      if (
        !/description|description_(en|zh_tw|zh_cn)|name_(en|zh_tw|zh_cn)|image_urls|contact_(phone|line_id|wechat_id)|schema cache|could not find/i.test(
          error.message ?? ""
        )
      ) {
        break;
      }

      const fallback = withoutUnsupportedSchemaField(
        currentInsertValues,
        error.message ?? ""
      );

      if (!fallback.changed) {
        break;
      }

      currentInsertValues = fallback.values;
    }

    if (
      error?.code === "23505" &&
      (idempotencyAvailable || Boolean(fallbackProductId))
    ) {
      let recoveryQuery = supabase
        .from("products")
        .select("*")
        .eq("seller_id", session.user.id);
      recoveryQuery = idempotencyAvailable
        ? recoveryQuery.eq("client_request_id", idempotencyKey)
        : recoveryQuery.eq("product_id", fallbackProductId);
      const { data: existingProduct, error: recoveryError } =
        await recoveryQuery.maybeSingle();

      if (recoveryError) throw recoveryError;
      if (existingProduct) {
        return NextResponse.json(toProduct(existingProduct as ProductRow), {
          status: 200,
        });
      }
    }

    if (error) throw error;

    if (data) {
      after(() =>
        safeNotifyMatchingWantedRequests({ supabase, product: data })
      );
    }

    return NextResponse.json(toProduct(data), { status: 201 });
  } catch (error) {
    console.error(error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
