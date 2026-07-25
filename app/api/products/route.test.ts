import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  createAdminClient: vi.fn(),
  createClient: vi.fn(),
  translateProductName: vi.fn(),
  translateProductDescription: vi.fn(),
  notifyMatchingWantedRequests: vi.fn(),
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
vi.mock("@/app/lib/wantedRequests", () => ({
  notifyMatchingWantedRequests: mocks.notifyMatchingWantedRequests,
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
    expect(mocks.notifyMatchingWantedRequests).not.toHaveBeenCalled();
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
    expect(mocks.notifyMatchingWantedRequests).toHaveBeenCalledWith({
      supabase: expect.anything(),
      product: expect.objectContaining({
        product_id: "product-1",
        name: "Desk lamp",
      }),
    });
  });

  test("still creates the product when immediate wanted matching fails", async () => {
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
    mocks.notifyMatchingWantedRequests.mockRejectedValueOnce(
      new Error("Embedding provider unavailable")
    );

    const response = await POST(request("request-notify-failure"));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.id).toBe("product-1");
  });

  test("creates a product when the idempotency column is not deployed yet", async () => {
    const lookup = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: "42703",
          message: "column products.client_request_id does not exist",
        },
      }),
    };
    lookup.select.mockReturnValue(lookup);
    lookup.eq.mockReturnValue(lookup);
    const fallbackLookup = lookupQuery(null);
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
      .mockReturnValueOnce(fallbackLookup)
      .mockReturnValueOnce(insertQuery);
    mocks.createAdminClient.mockReturnValue({ from });

    const response = await POST(request());

    expect(response.status).toBe(201);
    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        product_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      })
    );
    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.not.objectContaining({ client_request_id: expect.anything() })
    );
  });

  test("finds an earlier retry by deterministic product id without the new column", async () => {
    const clientKeyLookup = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: "42703",
          message: "column products.client_request_id does not exist",
        },
      }),
    };
    clientKeyLookup.select.mockReturnValue(clientKeyLookup);
    clientKeyLookup.eq.mockReturnValue(clientKeyLookup);
    const fallbackLookup = lookupQuery(productRow());
    const from = vi
      .fn()
      .mockReturnValueOnce(clientKeyLookup)
      .mockReturnValueOnce(fallbackLookup);
    mocks.createAdminClient.mockReturnValue({ from });

    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.id).toBe("product-1");
    expect(fallbackLookup.eq).toHaveBeenNthCalledWith(
      2,
      "product_id",
      expect.stringMatching(/^[0-9a-f-]{36}$/)
    );
    expect(mocks.translateProductName).not.toHaveBeenCalled();
  });

  test("returns the winning legacy-schema product after a concurrent insert", async () => {
    const clientKeyLookup = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: "42703",
          message: "column products.client_request_id does not exist",
        },
      }),
    };
    clientKeyLookup.select.mockReturnValue(clientKeyLookup);
    clientKeyLookup.eq.mockReturnValue(clientKeyLookup);
    const firstFallbackLookup = lookupQuery(null);
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
      .mockReturnValueOnce(clientKeyLookup)
      .mockReturnValueOnce(firstFallbackLookup)
      .mockReturnValueOnce(insertQuery)
      .mockReturnValueOnce(recoveryLookup);
    mocks.createAdminClient.mockReturnValue({ from });

    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.id).toBe("product-1");
    expect(recoveryLookup.eq).toHaveBeenNthCalledWith(
      2,
      "product_id",
      expect.stringMatching(/^[0-9a-f-]{36}$/)
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
