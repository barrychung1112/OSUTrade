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

import { POST } from "./route";

function request(files: Array<Record<string, unknown>>) {
  return new NextRequest("https://osutrade.example/api/products/images/sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ files }),
  });
}

function validFile(name = "desk.jpg") {
  return { name, type: "image/jpeg", size: 1024 };
}

function mockStorage() {
  const bucket = {
    createSignedUploadUrl: vi
      .fn()
      .mockImplementation(async (path: string) => ({
        data: { path, token: `token-for-${path}`, signedUrl: "https://signed" },
        error: null,
      })),
    getPublicUrl: vi.fn().mockImplementation((path: string) => ({
      data: {
        publicUrl: `https://project.supabase.co/storage/v1/object/public/product-images/${path}`,
      },
    })),
  };
  const from = vi.fn().mockReturnValue(bucket);
  mocks.createAdminClient.mockReturnValue({ storage: { from } });
  return { bucket, from };
}

describe("signed product image upload route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("rejects unauthenticated requests", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await POST(request([validFile()]));

    expect(response.status).toBe(401);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  test("rejects invalid file metadata before creating upload tokens", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "seller-1" } });
    const invalidType = await POST(
      request([{ name: "animation.gif", type: "image/gif", size: 100 }])
    );
    const oversized = await POST(
      request([
        {
          name: "large.jpg",
          type: "image/jpeg",
          size: 10 * 1024 * 1024 + 1,
        },
      ])
    );

    expect(invalidType.status).toBe(400);
    expect(oversized.status).toBe(400);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  test("creates owner-scoped paths and returns signed upload metadata", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "seller-1" } });
    const { bucket, from } = mockStorage();

    const response = await POST(
      request([
        { ...validFile("desk.jpg"), size: 10 * 1024 * 1024 },
        { ...validFile("lamp.png"), type: "image/png" },
      ])
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(from).toHaveBeenCalledWith("product-images");
    expect(bucket.createSignedUploadUrl).toHaveBeenCalledTimes(2);
    const paths = bucket.createSignedUploadUrl.mock.calls.map(([path]) => path);
    expect(paths[0]).toMatch(/^seller-1\/[0-9a-f-]+\.jpg$/);
    expect(paths[1]).toMatch(/^seller-1\/[0-9a-f-]+\.png$/);
    expect(payload.uploads).toEqual([
      expect.objectContaining({ path: paths[0], token: `token-for-${paths[0]}` }),
      expect.objectContaining({ path: paths[1], token: `token-for-${paths[1]}` }),
    ]);
    expect(payload.uploads[0].publicUrl).toContain(paths[0]);
  });
});
