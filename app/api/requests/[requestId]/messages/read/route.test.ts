import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  createAdminClient: vi.fn(),
  isTradeMessagesEnabled: vi.fn(),
  loadTradeMessageAccess: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));
vi.mock("@/app/lib/tradeMessages", () => ({
  isTradeMessagesEnabled: mocks.isTradeMessagesEnabled,
  loadTradeMessageAccess: mocks.loadTradeMessageAccess,
}));

import { PATCH } from "./route";

const requestId = "33333333-3333-4333-8333-333333333333";
const context = { params: Promise.resolve({ requestId }) };

describe("PATCH /api/requests/[requestId]/messages/read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "buyer-1" } });
    mocks.isTradeMessagesEnabled.mockReturnValue(true);
    mocks.loadTradeMessageAccess.mockResolvedValue({
      allowed: true,
      request: { requestId },
      product: { id: "product-1" },
    });
  });

  test("upserts the current participant's read marker", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    mocks.createAdminClient.mockReturnValue({
      from: vi.fn(() => ({ upsert })),
    });

    const response = await PATCH(
      new Request(`https://osutrade.com/api/requests/${requestId}/messages/read`, {
        method: "PATCH",
      }),
      context
    );

    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        request_id: requestId,
        user_id: "buyer-1",
      }),
      { onConflict: "request_id,user_id" }
    );
  });
});
