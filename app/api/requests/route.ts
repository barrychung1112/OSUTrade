import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const itemId = String(body.itemId ?? "").trim();
  const quantity = Number(body.quantity);
  const note = String(body.note ?? "").trim();

  if (!itemId || !Number.isFinite(quantity) || quantity < 1) {
    return NextResponse.json(
      { message: "Item id and quantity are required." },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      request: {
        itemId,
        quantity,
        note,
        status: "sent",
      },
    },
    { status: 201 }
  );
}
