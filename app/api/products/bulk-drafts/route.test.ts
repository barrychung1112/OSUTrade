import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
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

const originalApiKey = process.env.OPENAI_API_KEY;

function request(imagePaths: unknown) {
  return new NextRequest("https://osutrade.example/api/products/bulk-drafts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ imagePaths }),
  });
}

function mockStorage() {
  const bucket = {
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

function aiResponse() {
  return {
    output_text: JSON.stringify({
      drafts: [
        {
          name: "Desk lamp",
          description: "Small lamp",
          category: "home",
          price: 12,
          quantity: 1,
          confidence: 0.9,
          warnings: [],
          imageIndexes: [0],
        },
      ],
    }),
  };
}

describe("bulk draft route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalApiKey;
  });

  test("rejects image paths owned by another user", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "seller-1" } });

    const response = await POST(request(["seller-2/private.jpg"]));

    expect(response.status).toBe(400);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  test("rejects encoded traversal in an apparently owned image path", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "seller-1" } });

    const response = await POST(
      request(["seller-1/%2e%2e/seller-2/private.jpg"])
    );

    expect(response.status).toBe(400);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  test("sends trusted Supabase URLs to OpenAI without image bytes", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "seller-1" } });
    const { from } = mockStorage();
    const openAiFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(aiResponse()), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", openAiFetch);

    const response = await POST(
      request(["seller-1/one.jpg", "seller-1/two.webp"])
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.drafts[0].name).toBe("Desk lamp");
    expect(from).toHaveBeenCalledWith("product-images");
    const openAiRequest = JSON.parse(openAiFetch.mock.calls[0][1].body);
    const userContent = openAiRequest.input[1].content;
    const imageInputs = userContent.filter(
      (item: { type: string }) => item.type === "input_image"
    );
    expect(imageInputs).toEqual([
      {
        type: "input_image",
        image_url:
          "https://project.supabase.co/storage/v1/object/public/product-images/seller-1/one.jpg",
        detail: "low",
      },
      {
        type: "input_image",
        image_url:
          "https://project.supabase.co/storage/v1/object/public/product-images/seller-1/two.webp",
        detail: "low",
      },
    ]);
    expect(openAiFetch.mock.calls[0][1].body).not.toContain("base64");
  });

  test("returns a safe 502 and logs provider diagnostics", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "seller-1" } });
    mockStorage();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "provider details" } }), {
          status: 429,
          headers: { "x-request-id": "req_123" },
        })
      )
    );
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(request(["seller-1/one.jpg"]));
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload).toEqual({
      code: "AI_PROVIDER_ERROR",
      message: "AI could not analyze these photos. Please try again.",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "OpenAI bulk draft request failed",
      expect.objectContaining({ status: 429, requestId: "req_123" })
    );
    consoleError.mockRestore();
  });

  test.each([
    {
      label: "incomplete response",
      payload: {
        status: "incomplete",
        incomplete_details: { reason: "max_output_tokens" },
        output: [],
      },
    },
    {
      label: "refusal response",
      payload: {
        status: "completed",
        output: [
          {
            type: "message",
            content: [{ type: "refusal", refusal: "Cannot process image." }],
          },
        ],
      },
    },
    {
      label: "malformed structured output",
      payload: { status: "completed", output_text: "not-json" },
    },
  ])("returns 502 for $label", async ({ payload }) => {
    mocks.auth.mockResolvedValue({ user: { id: "seller-1" } });
    mockStorage();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "x-request-id": "req_invalid" },
        })
      )
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(request(["seller-1/one.jpg"]));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      code: "AI_PROVIDER_ERROR",
      message: "AI could not analyze these photos. Please try again.",
    });
    vi.mocked(console.error).mockRestore();
  });

  test("aborts a stalled OpenAI request and returns 502", async () => {
    vi.useFakeTimers();
    mocks.auth.mockResolvedValue({ user: { id: "seller-1" } });
    mockStorage();
    const openAiFetch = vi.fn().mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        })
    );
    vi.stubGlobal("fetch", openAiFetch);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const pendingResponse = POST(request(["seller-1/one.jpg"]));
    await vi.advanceTimersByTimeAsync(20_000);
    const response = await pendingResponse;

    expect(response.status).toBe(502);
    expect(openAiFetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    expect(openAiFetch.mock.calls[0][1].signal.aborted).toBe(true);
    vi.mocked(console.error).mockRestore();
    vi.useRealTimers();
  });
});
