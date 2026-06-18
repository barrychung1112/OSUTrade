type ProductStatus = "available" | "pending" | "sold" | "removed";

type ExistingProduct = {
  status: ProductStatus | string | null;
  quantity: number | null;
};

export type SellerProductEditInput = {
  name?: unknown;
  description?: unknown;
  price?: unknown;
  category?: unknown;
  quantity?: unknown;
  contactPhone?: unknown;
  contactLineId?: unknown;
  contactWechatId?: unknown;
};

type SellerProductUpdateResult =
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; message: string };

function hasOwn(input: SellerProductEditInput, key: keyof SellerProductEditInput) {
  return Object.prototype.hasOwnProperty.call(input, key);
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

export function buildSellerProductUpdate(
  existing: ExistingProduct,
  input: SellerProductEditInput,
  updatedAt = new Date().toISOString()
): SellerProductUpdateResult {
  const values: Record<string, unknown> = {};
  const editsPriceOrQuantity = hasOwn(input, "price") || hasOwn(input, "quantity");

  if (existing.status === "sold" && editsPriceOrQuantity) {
    return {
      ok: false,
      message: "Sold listings cannot change price or quantity.",
    };
  }

  if (hasOwn(input, "name")) {
    const name = cleanText(input.name);
    if (!name) return { ok: false, message: "Name is required." };
    values.name = name;
  }

  if (hasOwn(input, "description")) {
    values.description = cleanText(input.description) || null;
  }

  if (hasOwn(input, "price")) {
    const price = Number(input.price);
    if (!Number.isFinite(price) || price <= 0) {
      return { ok: false, message: "Price must be greater than 0." };
    }
    values.price = price;
  }

  if (hasOwn(input, "category")) {
    values.category = cleanText(input.category) || "general";
  }

  if (hasOwn(input, "quantity")) {
    const quantity = Number(input.quantity);
    if (!Number.isInteger(quantity) || quantity < 0) {
      return { ok: false, message: "Quantity must be 0 or greater." };
    }
    values.quantity = quantity;
  }

  if (hasOwn(input, "contactPhone")) {
    values.contact_phone = cleanText(input.contactPhone) || null;
  }

  if (hasOwn(input, "contactLineId")) {
    values.contact_line_id = cleanText(input.contactLineId) || null;
  }

  if (hasOwn(input, "contactWechatId")) {
    values.contact_wechat_id = cleanText(input.contactWechatId) || null;
  }

  values.updated_at = updatedAt;
  return { ok: true, values };
}
