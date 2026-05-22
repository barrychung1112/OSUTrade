import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/utils/supabase/admin";

type RequestStatus = "sent" | "accepted" | "declined" | "cancelled";

type ProductRow = {
  product_id: string | number;
  name: string;
  price: number;
  image_url: string | null;
  quantity?: number | null;
};

type RequestRow = {
  request_id: string;
  product_id: string;
  buyer_id: string;
  quantity: number;
  note: string | null;
  status: RequestStatus;
  created_at: string;
};

const requestStatuses = new Set<RequestStatus>([
  "sent",
  "accepted",
  "declined",
  "cancelled",
]);

async function getEmailByUserId(userId: string | null | undefined) {
  if (!userId) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    throw error;
  }

  return data.user?.email ?? null;
}

function toSellerRequest(
  row: RequestRow,
  product?: ProductRow,
  buyerEmail?: string | null
) {
  return {
    id: row.request_id,
    itemId: row.product_id,
    buyerId: row.buyer_id,
    buyerEmail: row.status === "accepted" ? buyerEmail ?? null : null,
    quantity: row.quantity,
    note: row.note ?? "",
    status: row.status,
    createdAt: row.created_at,
    product: product
      ? {
          id: product.product_id,
          name: product.name,
          price: product.price,
          imageUrl: product.image_url,
          quantity: product.quantity ?? 1,
        }
      : null,
  };
}

async function getSellerProducts(sellerId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("seller_id", sellerId);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "You must be logged in to view seller requests." },
        { status: 401 }
      );
    }

    const products = await getSellerProducts(session.user.id);
    const productIds = products.map((product) => String(product.product_id));

    if (productIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("trade_requests")
      .select("request_id, product_id, buyer_id, quantity, note, status, created_at")
      .in("product_id", productIds)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const productsById = new Map(
      products.map((product) => [String(product.product_id), product])
    );
    const buyerEmailById = new Map<string, string | null>();

    for (const request of data ?? []) {
      if (request.status !== "accepted") continue;
      if (!buyerEmailById.has(request.buyer_id)) {
        buyerEmailById.set(
          request.buyer_id,
          await getEmailByUserId(request.buyer_id)
        );
      }
    }

    return NextResponse.json({
      data: (data ?? []).map((item) =>
        toSellerRequest(
          item,
          productsById.get(String(item.product_id)),
          buyerEmailById.get(item.buyer_id)
        )
      ),
    });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to load seller requests.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "You must be logged in to update seller requests." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const requestId = String(body.requestId ?? "").trim();
    const status = String(body.status ?? "").trim() as RequestStatus;

    if (!requestId || !requestStatuses.has(status)) {
      return NextResponse.json(
        { message: "Request id and a valid status are required." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const products = await getSellerProducts(session.user.id);
    const productIds = new Set(
      products.map((product) => String(product.product_id))
    );

    const { data: existing, error: lookupError } = await supabase
      .from("trade_requests")
      .select("request_id, product_id, quantity, status")
      .eq("request_id", requestId)
      .single();

    if (lookupError) {
      throw lookupError;
    }

    if (!productIds.has(String(existing.product_id))) {
      return NextResponse.json(
        { message: "Request not found for this seller." },
        { status: 404 }
      );
    }

    const product = products.find(
      (item) => String(item.product_id) === String(existing.product_id)
    );

    if (status === "accepted") {
      if (existing.status !== "sent") {
        return NextResponse.json(
          { message: "Only pending requests can be accepted." },
          { status: 409 }
        );
      }

      const availableQuantity = Number(product?.quantity ?? 1);

      if (existing.quantity > availableQuantity) {
        return NextResponse.json(
          {
            message: `Only ${availableQuantity} item(s) are available.`,
            availableQuantity,
          },
          { status: 409 }
        );
      }
    }

    const { data, error } = await supabase
      .from("trade_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("request_id", requestId)
      .select("request_id, product_id, buyer_id, quantity, note, status, created_at")
      .single();

    if (error) {
      throw error;
    }

    if (status === "accepted") {
      const availableQuantity = Number(product?.quantity ?? 1);
      const remainingQuantity = availableQuantity - data.quantity;
      const nextProductStatus = remainingQuantity > 0 ? "available" : "sold";

      await supabase
        .from("products")
        .update({
          quantity: remainingQuantity,
          status: nextProductStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("product_id", data.product_id)
        .eq("seller_id", session.user.id);

      if (remainingQuantity === 0) {
        await supabase
          .from("trade_requests")
          .update({ status: "declined", updated_at: new Date().toISOString() })
          .eq("product_id", data.product_id)
          .eq("status", "sent");
      }
    }

    const buyerEmail =
      data.status === "accepted" ? await getEmailByUserId(data.buyer_id) : null;

    return NextResponse.json({
      request: toSellerRequest(data, product, buyerEmail),
    });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to update seller request.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
