import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

import { DELETE } from "./route";

function request(paths: unknown) {
  return new NextRequest("https://osutrade.example/api/products/images", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ paths }),
  });
}

describe("product image cleanup route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("rejects unauthenticated cleanup", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await DELETE(request(["seller-1/image.jpg"]));

    expect(response.status).toBe(401);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  test("rejects paths that do not belong to the signed-in user", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "seller-1" } });

    const response = await DELETE(request(["seller-2/private.jpg"]));

    expect(response.status).toBe(400);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  test("removes only validated owner paths", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "seller-1" } });
    const bucket = {
      remove: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const from = vi.fn().mockReturnValue(bucket);
    mocks.createAdminClient.mockReturnValue({ storage: { from } });
    const paths = ["seller-1/one.jpg", "seller-1/two.webp"];

    const response = await DELETE(request(paths));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(from).toHaveBeenCalledWith("product-images");
    expect(bucket.remove).toHaveBeenCalledWith(paths);
    expect(payload.removed).toBe(0);
  });
});
