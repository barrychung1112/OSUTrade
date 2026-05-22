import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/utils/supabase/admin";

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
  price: number;
  image_url: string | null;
  seller_id: string | null;
};

function toRequest(row: RequestRow, product?: ProductRow, sellerEmail?: string) {
  return {
    id: row.request_id,
    itemId: row.product_id,
    buyerId: row.buyer_id,
    quantity: row.quantity,
    note: row.note ?? "",
    status: row.status,
    createdAt: row.created_at,
    sellerEmail: row.status === "accepted" ? sellerEmail ?? null : null,
    product: product
      ? {
          id: product.product_id,
          name: product.name,
          price: product.price,
          imageUrl: product.image_url,
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
          .select("product_id, name, price, image_url, seller_id")
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
