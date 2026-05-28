import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/utils/supabase/admin";
import { isExpiredSentRequest, requestResponseWindowMs } from "@/app/lib/requestExpiry";

type RequestRow = {
  request_id: string;
  product_id: string;
  buyer_id: string;
  quantity: number;
  note: string | null;
  status: string;
  created_at: string;
};

type ProductRow = {
  product_id: string | number;
  name: string;
  name_en?: string | null;
  name_zh_tw?: string | null;
  name_zh_cn?: string | null;
  price: number;
  image_url: string | null;
  contact_phone?: string | null;
  contact_line_id?: string | null;
  contact_wechat_id?: string | null;
  seller_id: string | null;
  status?: string | null;
  quantity?: number | null;
};

function toRequest(row: RequestRow, product?: ProductRow, sellerEmail?: string) {
  const status = isExpiredSentRequest(row) ? "expired" : row.status;

  return {
    id: row.request_id,
    itemId: row.product_id,
    buyerId: row.buyer_id,
    quantity: row.quantity,
    note: row.note ?? "",
    status,
    createdAt: row.created_at,
    sellerEmail: status === "accepted" ? sellerEmail ?? null : null,
    sellerContact:
      status === "accepted"
        ? {
            email: sellerEmail ?? null,
            phone: product?.contact_phone ?? null,
            lineId: product?.contact_line_id ?? null,
            wechatId: product?.contact_wechat_id ?? null,
          }
        : null,
    product: product
      ? {
          id: product.product_id,
          name: product.name,
          nameTranslations: {
            en: product.name_en ?? product.name,
            zhTw: product.name_zh_tw ?? product.name,
            zhCn: product.name_zh_cn ?? product.name,
          },
          price: product.price,
          imageUrl: product.image_url,
          quantity: product.quantity ?? 1,
        }
      : null,
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

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "You must be logged in to view your requests." },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("trade_requests")
      .select("request_id, product_id, buyer_id, quantity, note, status, created_at")
      .eq("buyer_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const requests = data ?? [];
    const productIds = requests.map((item) => String(item.product_id));
    const { data: products, error: productError } = productIds.length
      ? await supabase
          .from("products")
          .select("*")
          .in("product_id", productIds)
      : { data: [], error: null };

    if (productError) {
      throw productError;
    }

    const productsById = new Map(
      (products ?? []).map((product) => [String(product.product_id), product])
    );
    const sellerEmailById = new Map<string, string | null>();

    for (const request of requests) {
      if (request.status !== "accepted") continue;

      const product = productsById.get(String(request.product_id));
      const sellerId = product?.seller_id;

      if (sellerId && !sellerEmailById.has(sellerId)) {
        sellerEmailById.set(sellerId, await getEmailByUserId(sellerId));
      }
    }

    return NextResponse.json({
      data: requests.map((request) => {
        const product = productsById.get(String(request.product_id));
        const sellerEmail = product?.seller_id
          ? sellerEmailById.get(product.seller_id)
          : null;

        return toRequest(request, product, sellerEmail ?? undefined);
      }),
    });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to load requests.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "You must be logged in to update your requests." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const requestId = String(body.requestId ?? "").trim();
    const status = String(body.status ?? "").trim();

    if (!requestId || status !== "cancelled") {
      return NextResponse.json(
        { message: "Request id and cancelled status are required." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data: existing, error: lookupError } = await supabase
      .from("trade_requests")
      .select("request_id, buyer_id, status")
      .eq("request_id", requestId)
      .eq("buyer_id", session.user.id)
      .single();

    if (lookupError) {
      throw lookupError;
    }

    if (existing.status !== "sent") {
      return NextResponse.json(
        { message: "Only pending requests can be cancelled." },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("trade_requests")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("request_id", requestId)
      .eq("buyer_id", session.user.id)
      .select("request_id, product_id, buyer_id, quantity, note, status, created_at")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ request: toRequest(data) });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to update request.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "You must be logged in to send a request." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const itemId = String(body.itemId ?? "").trim();
    const quantity = Number(body.quantity);
    const note = String(body.note ?? "").trim();

    if (!itemId || !Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json(
        { message: "Item id and quantity are required." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("product_id", itemId)
      .single();

    if (productError) {
      throw productError;
    }

    if (product.seller_id === session.user.id) {
      return NextResponse.json(
        { message: "You cannot request your own listing." },
        { status: 409 }
      );
    }

    const availableQuantity = Number(product.quantity ?? 1);

    if (product.status !== "available" || availableQuantity < 1) {
      return NextResponse.json(
        { message: "This item is no longer available for requests." },
        { status: 409 }
      );
    }

    if (quantity > availableQuantity) {
      return NextResponse.json(
        {
          message: `Only ${availableQuantity} item(s) are available.`,
          availableQuantity,
        },
        { status: 409 }
      );
    }

    const { data: existingRequests, error: existingRequestError } = await supabase
      .from("trade_requests")
      .select("request_id, status, created_at")
      .eq("product_id", itemId)
      .eq("buyer_id", session.user.id)
      .in("status", ["sent", "accepted"]);

    if (existingRequestError) {
      throw existingRequestError;
    }

    const activeExistingRequest = (existingRequests ?? []).find(
      (existingRequest) => !isExpiredSentRequest(existingRequest)
    );

    if (activeExistingRequest) {
      return NextResponse.json(
        {
          message:
            "You already have an active request for this item. Wait until it is declined before sending another one.",
          existingRequestId: activeExistingRequest.request_id,
          existingStatus: activeExistingRequest.status,
        },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("trade_requests")
      .insert({
        product_id: itemId,
        buyer_id: session.user.id,
        quantity,
        note: note || null,
        status: "sent",
      })
      .select(
        "request_id, product_id, buyer_id, quantity, note, status, created_at"
      )
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(
      {
        ok: true,
        request: toRequest(data),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to send request.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
