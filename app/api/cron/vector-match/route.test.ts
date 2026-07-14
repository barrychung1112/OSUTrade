import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  runVectorMatchBatch: vi.fn(),
}));

vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock("@/app/lib/vectorBatch", () => ({
  runVectorMatchBatch: mocks.runVectorMatchBatch,
}));

import { GET, POST } from "./route";

function cronRequest(token?: string) {
  return new Request("https://osutrade.com/api/cron/vector-match", {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
}

function cronGetRequest(token?: string) {
  return new Request("https://osutrade.com/api/cron/vector-match", {
    method: "GET",
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
}

describe("vector match cron route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "secret-1";
  });

  test("rejects requests without the cron bearer token", async () => {
    const response = await POST(cronRequest());

    expect(response.status).toBe(401);
    expect(mocks.runVectorMatchBatch).not.toHaveBeenCalled();
  });

  test("runs the vector batch with an admin client when authorized", async () => {
    const supabase = { from: vi.fn() };
    mocks.createAdminClient.mockReturnValue(supabase);
    mocks.runVectorMatchBatch.mockResolvedValue({
      status: "completed",
      productsChecked: 1,
      productsEmbedded: 1,
      wantedRequestsChecked: 1,
      wantedRequestsEmbedded: 1,
      matchesCreated: 1,
      emailsSent: 1,
    });

    const response = await POST(cronRequest("secret-1"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.status).toBe("completed");
    expect(mocks.runVectorMatchBatch).toHaveBeenCalledWith(
      expect.objectContaining({ supabase })
    );
  });

  test("supports GET because Vercel Cron invokes cron paths with GET", async () => {
    const supabase = { from: vi.fn() };
    mocks.createAdminClient.mockReturnValue(supabase);
    mocks.runVectorMatchBatch.mockResolvedValue({
      status: "completed",
      productsChecked: 0,
      productsEmbedded: 0,
      wantedRequestsChecked: 0,
      wantedRequestsEmbedded: 0,
      matchesCreated: 0,
      emailsSent: 0,
    });

    const response = await GET(cronGetRequest("secret-1"));

    expect(response.status).toBe(200);
    expect(mocks.runVectorMatchBatch).toHaveBeenCalledWith(
      expect.objectContaining({ supabase })
    );
  });
});
