import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  isTradeMessagesEnabled: vi.fn(),
  issueTradeMessageRealtimeToken: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/app/lib/tradeMessages", () => ({
  isTradeMessagesEnabled: mocks.isTradeMessagesEnabled,
}));
vi.mock("@/app/lib/tradeMessageRealtimeToken", () => ({
  issueTradeMessageRealtimeToken: mocks.issueTradeMessageRealtimeToken,
}));

import { GET } from "./route";

describe("GET /api/realtime/trade-messages-token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isTradeMessagesEnabled.mockReturnValue(true);
    mocks.auth.mockResolvedValue({
      user: { id: "11111111-1111-4111-8111-111111111111" },
    });
    mocks.issueTradeMessageRealtimeToken.mockResolvedValue("signed-token");
    process.env.SUPABASE_REALTIME_JWT_PRIVATE_KEY = "private-key";
    process.env.SUPABASE_REALTIME_JWT_KEY_ID = "key-id";
    process.env.SUPABASE_REALTIME_JWT_ISSUER = "https://osutrade.com";
  });

  test("returns a short-lived token for the signed-in user", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({ token: "signed-token" });
    expect(mocks.issueTradeMessageRealtimeToken).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "11111111-1111-4111-8111-111111111111",
        privateKeyPem: "private-key",
        keyId: "key-id",
        issuer: "https://osutrade.com",
      })
    );
  });

  test("rejects callers without a session", async () => {
    mocks.auth.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mocks.issueTradeMessageRealtimeToken).not.toHaveBeenCalled();
  });

  test("does not issue a token without the realtime signing configuration", async () => {
    delete process.env.SUPABASE_REALTIME_JWT_PRIVATE_KEY;

    const response = await GET();

    expect(response.status).toBe(503);
    expect(mocks.issueTradeMessageRealtimeToken).not.toHaveBeenCalled();
  });
});
