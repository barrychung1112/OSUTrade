import { NextResponse, type NextRequest } from "next/server";
import { getProductPricing } from "@/app/lib/productDiscount";
import { createClient } from "@/utils/supabase/server";

type CartItem = {
  id: string;
  name: string;
  nameTranslations?: {
    en?: string | null;
    zhTw?: string | null;
    zhCn?: string | null;
  } | null;
  price: number;
  imageUrl?: string | null;
  quantity: number;
  availableQuantity?: number | null;
  category?: string | null;
};

function normalizeQuantity(quantity: number, availableQuantity?: number | null) {
  const requested = Math.max(1, Math.floor(Number(quantity) || 1));
  if (!Number.isInteger(availableQuantity) || availableQuantity < 1) {
    return requested;
  }
  return Math.min(requested, availableQuantity);
}

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

function normalizeNameTranslations(value: any, fallbackName: string) {
  if (!value || typeof value !== "object") {
    return {
      en: fallbackName,
      zhTw: fallbackName,
      zhCn: fallbackName,
    };
  }

  return {
    en: String(value.en ?? fallbackName),
    zhTw: String(value.zhTw ?? fallbackName),
    zhCn: String(value.zhCn ?? fallbackName),
  };
}

export async function GET(request: NextRequest) {
  const cart = readCart(request);
  if (cart.length === 0) return NextResponse.json({ data: cart });

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select(
        "product_id, price, discount_percent, clearance_price, effective_price, quantity, status"
      )
      .in("product_id", cart.map((item) => item.id));

    if (error) throw error;

    const products = new Map(
      (data ?? []).map((product) => [String(product.product_id), product])
    );
    const refreshed = cart.map((item) => {
      const product = products.get(item.id);
      if (!product) return item;
      const availableQuantity =
        product.status === "available" ? Number(product.quantity ?? 0) : 0;
      return {
        ...item,
        price: getProductPricing(product).effectivePrice,
        availableQuantity,
        quantity: normalizeQuantity(item.quantity, availableQuantity),
      };
    });

    return writeCart(refreshed);
  } catch (error) {
    console.error("Failed to refresh cart pricing.", error);
    return NextResponse.json({ data: cart });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const id = String(body.id ?? "").trim();
  const name = String(body.name ?? "").trim();
  const nameTranslations = normalizeNameTranslations(body.nameTranslations, name);
  const price = Number(body.price);
  const availableQuantity = Number(body.availableQuantity ?? body.quantityAvailable ?? 1);
  const maxQuantity =
    Number.isInteger(availableQuantity) && availableQuantity > 0
      ? availableQuantity
      : 1;

  if (!id || !name || !Number.isFinite(price)) {
    return NextResponse.json(
      { message: "Product id, name, and price are required." },
      { status: 400 }
    );
  }

  const cart = readCart(request);
  const existing = cart.find((item) => item.id === id);

  if (existing) {
    existing.price = price;
    existing.availableQuantity = maxQuantity;
    existing.nameTranslations = nameTranslations;
    existing.quantity = normalizeQuantity(existing.quantity + 1, maxQuantity);
  } else {
    cart.push({
      id,
      name,
      nameTranslations,
      price,
      imageUrl: body.imageUrl ?? null,
      category: body.category ?? "general",
      quantity: 1,
      availableQuantity: maxQuantity,
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
      nameTranslations: normalizeNameTranslations(
        item.nameTranslations,
        String(item.name ?? "").trim()
      ),
      price: Number(item.price),
      imageUrl: item.imageUrl ?? null,
      category: item.category ?? "general",
      availableQuantity:
        Number.isInteger(Number(item.availableQuantity)) &&
        Number(item.availableQuantity) > 0
          ? Number(item.availableQuantity)
          : null,
      quantity: normalizeQuantity(
        Number(item.quantity),
        Number.isInteger(Number(item.availableQuantity))
          ? Number(item.availableQuantity)
          : null
      ),
    }))
    .filter((item) => item.id && item.name && Number.isFinite(item.price));

  return writeCart(cart);
}
