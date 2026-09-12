import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireActiveUser: vi.fn(),
  createAdminClient: vi.fn(),
  getAccountAccessErrorResponse: vi.fn(),
  buildSellerProductUpdate: vi.fn(),
  translateProductName: vi.fn(),
  translateProductDescription: vi.fn(),
  getProductPricing: vi.fn(),
  hasActiveTradeRequest: vi.fn(),
  hasEditableProductFields: vi.fn(),
  revalidatePublicProduct: vi.fn(),
}));

vi.mock("@/utils/auth/requireActiveUser", () => ({
  requireActiveUser: mocks.requireActiveUser,
}));
vi.mock("@/utils/auth/accountAccessResponse", () => ({
  getAccountAccessErrorResponse: mocks.getAccountAccessErrorResponse,
}));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));
vi.mock("@/app/lib/sellerProductUpdate", () => ({
  buildSellerProductUpdate: mocks.buildSellerProductUpdate,
}));
vi.mock("@/app/lib/productTranslations", () => ({
  translateProductName: mocks.translateProductName,
  translateProductDescription: mocks.translateProductDescription,
}));
vi.mock("@/app/lib/notifications", () => ({
  getActivePriceChangeRecipients: vi.fn(),
  notifyTradeEvent: vi.fn(),
}));
vi.mock("@/app/lib/productDiscount", () => ({
  getProductPricing: mocks.getProductPricing,
}));
vi.mock("@/app/lib/productEditLock", () => ({
  hasActiveTradeRequest: mocks.hasActiveTradeRequest,
  hasEditableProductFields: mocks.hasEditableProductFields,
}));
vi.mock("@/app/lib/publicProductCache", () => ({
  revalidatePublicProduct: mocks.revalidatePublicProduct,
}));

import { PATCH } from "./route";

const row = {
  product_id: "product-1",
  name: "Desk lamp",
  description: "Small lamp",
  price: 12,
  category: "home",
  image_url: null,
  seller_id: "seller-1",
  status: "available",
  quantity: 1,
  created_at: "2026-01-01T00:00:00.000Z",
};

function query(result: unknown) {
  const value = {
    update: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn().mockResolvedValue(result),
  };
  value.update.mockReturnValue(value);
  value.select.mockReturnValue(value);
  value.eq.mockReturnValue(value);
  return value;
}

describe("seller product updates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireActiveUser.mockResolvedValue({ user: { id: "seller-1" } });
    mocks.hasEditableProductFields.mockReturnValue(false);
    mocks.buildSellerProductUpdate.mockReturnValue({ ok: true, values: {} });
    mocks.getProductPricing.mockReturnValue({ effectivePrice: 12 });
  });

  test("invalidates public product discovery after a seller marks a listing sold", async () => {
    const existing = query({ data: row, error: null });
    const updated = query({ data: { ...row, status: "sold", quantity: 0 }, error: null });
    const declinedRequests = {
      update: vi.fn(),
      eq: vi.fn(),
    };
    declinedRequests.update.mockReturnValue(declinedRequests);
    declinedRequests.eq.mockReturnValue(declinedRequests);
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn()
        .mockReturnValueOnce(existing)
        .mockReturnValueOnce(updated)
        .mockReturnValueOnce(declinedRequests),
    });

    const response = await PATCH(
      new Request("https://osutrade.example/api/seller/products", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: "product-1", status: "sold" }),
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.revalidatePublicProduct).toHaveBeenCalledWith("product-1");
  });
});
