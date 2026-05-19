import { NextResponse, type NextRequest } from "next/server";

type CartItem = {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  quantity: number;
  category?: string | null;
};

const cartCookieName = "osutrade_cart";

function readCart(request: NextRequest): CartItem[] {
  const raw = request.cookies.get(cartCookieName)?.value;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  const response = NextResponse.json({ data: items });
  response.cookies.set(cartCookieName, encodeURIComponent(JSON.stringify(items)), {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
  });
  return response;
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ data: readCart(request) });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const id = String(body.id ?? "").trim();
  const name = String(body.name ?? "").trim();
  const price = Number(body.price);

  if (!id || !name || !Number.isFinite(price)) {
    return NextResponse.json(
      { message: "Product id, name, and price are required." },
      { status: 400 }
    );
  }

  const cart = readCart(request);
  const existing = cart.find((item) => item.id === id);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id,
      name,
      price,
      imageUrl: body.imageUrl ?? null,
      category: body.category ?? "general",
      quantity: 1,
    });
  }

  return writeCart(cart);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const items = Array.isArray(body.items) ? body.items : [];

  const cart = items
    .map((item) => ({
      id: String(item.id ?? "").trim(),
      name: String(item.name ?? "").trim(),
      price: Number(item.price),
      imageUrl: item.imageUrl ?? null,
      category: item.category ?? "general",
      quantity: Math.max(1, Number(item.quantity) || 1),
    }))
    .filter((item) => item.id && item.name && Number.isFinite(item.price));

  return writeCart(cart);
}
