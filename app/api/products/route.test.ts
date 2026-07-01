import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  createAdminClient: vi.fn(),
  createClient: vi.fn(),
  translateProductName: vi.fn(),
  translateProductDescription: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));
vi.mock("@/utils/supabase/server", () => ({
  createClient: mocks.createClient,
}));
vi.mock("@/app/lib/productTranslations", () => ({
  translateProductName: mocks.translateProductName,
  translateProductDescription: mocks.translateProductDescription,
}));

import { POST } from "./route";

function productRow() {
  return {
    product_id: "product-1",
    name: "Desk lamp",
    description: "Small lamp",
    name_en: "Desk lamp",
    name_zh_tw: "檯燈",
    name_zh_cn: "台灯",
    description_en: "Small lamp",
    description_zh_tw: "小檯燈",
    description_zh_cn: "小台灯",
    price: 12,
    category: "home",
    image_url: "https://project.supabase.co/lamp.jpg",
    image_urls: ["https://project.supabase.co/lamp.jpg"],
    seller_id: "seller-1",
    status: "available",
    quantity: 1,
  };
}

function request(idempotencyKey = "request-1") {
  return new NextRequest("https://osutrade.example/api/products", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": idempotencyKey,
    },
    body: JSON.stringify({
      name: "Desk lamp",
      description: "Small lamp",
      price: 12,
      quantity: 1,
      category: "home",
      imageUrls: ["https://project.supabase.co/lamp.jpg"],
    }),
  });
}

function lookupQuery(data: ReturnType<typeof productRow> | null) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

describe("product create idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "seller-1" } });
    mocks.translateProductName.mockResolvedValue({
      en: "Desk lamp",
      zhTw: "檯燈",
      zhCn: "台灯",
    });
    mocks.translateProductDescription.mockResolvedValue({
      en: "Small lamp",
      zhTw: "小檯燈",
      zhCn: "小台灯",
    });
  });

  test("returns the existing product for a repeated idempotency key", async () => {
    const lookup = lookupQuery(productRow());
    const from = vi.fn().mockReturnValue(lookup);
    mocks.createAdminClient.mockReturnValue({ from });

    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.id).toBe("product-1");
    expect(lookup.eq).toHaveBeenNthCalledWith(1, "seller_id", "seller-1");
    expect(lookup.eq).toHaveBeenNthCalledWith(2, "client_request_id", "request-1");
    expect(mocks.translateProductName).not.toHaveBeenCalled();
  });

  test("stores the idempotency key on a new product", async () => {
    const lookup = lookupQuery(null);
    const insertQuery = {
      insert: vi.fn(),
      select: vi.fn(),
      single: vi.fn().mockResolvedValue({ data: productRow(), error: null }),
    };
    insertQuery.insert.mockReturnValue(insertQuery);
    insertQuery.select.mockReturnValue(insertQuery);
    const from = vi
      .fn()
      .mockReturnValueOnce(lookup)
      .mockReturnValueOnce(insertQuery);
    mocks.createAdminClient.mockReturnValue({ from });

    const response = await POST(request());

    expect(response.status).toBe(201);
    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        seller_id: "seller-1",
        client_request_id: "request-1",
      })
    );
  });

  test("returns the winning product after a concurrent unique conflict", async () => {
    const firstLookup = lookupQuery(null);
    const insertQuery = {
      insert: vi.fn(),
      select: vi.fn(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "23505", message: "duplicate key value" },
      }),
    };
    insertQuery.insert.mockReturnValue(insertQuery);
    insertQuery.select.mockReturnValue(insertQuery);
    const recoveryLookup = lookupQuery(productRow());
    const from = vi
      .fn()
      .mockReturnValueOnce(firstLookup)
      .mockReturnValueOnce(insertQuery)
      .mockReturnValueOnce(recoveryLookup);
    mocks.createAdminClient.mockReturnValue({ from });

    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.id).toBe("product-1");
    expect(recoveryLookup.eq).toHaveBeenNthCalledWith(
      2,
      "client_request_id",
      "request-1"
    );
  });
});
