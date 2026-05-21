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

function toRequest(row: RequestRow) {
  return {
    id: row.request_id,
    itemId: row.product_id,
    buyerId: row.buyer_id,
    quantity: row.quantity,
    note: row.note ?? "",
    status: row.status,
    createdAt: row.created_at,
  };
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
