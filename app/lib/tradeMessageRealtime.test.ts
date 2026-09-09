import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  channel: vi.fn(),
  on: vi.fn(),
  subscribe: vi.fn(),
  removeChannel: vi.fn(),
  setAuth: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));

import {
  getTradeMessageRealtimeToken,
  resetTradeMessageRealtimeTokenCache,
  subscribeToTradeMessages,
} from "./tradeMessageRealtime";

describe("trade message realtime", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let broadcastHandler: ((event: { payload: unknown }) => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    resetTradeMessageRealtimeTokenCache();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          token: "trade-message-token",
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);
    mocks.subscribe.mockImplementation((callback) => {
      callback("SUBSCRIBED");
      return { topic: "trade-message:request-1" };
    });
    mocks.on.mockImplementation(
      (_type, _filter, callback: (event: { payload: unknown }) => void) => {
        broadcastHandler = callback;
        return { subscribe: mocks.subscribe };
      }
    );
    mocks.channel.mockReturnValue({ on: mocks.on });
    mocks.createClient.mockReturnValue({
      channel: mocks.channel,
      removeChannel: mocks.removeChannel,
      realtime: { setAuth: mocks.setAuth },
    });
  });

  test("caches the short-lived token and keeps the signing endpoint same-origin", async () => {
    await expect(getTradeMessageRealtimeToken()).resolves.toBe("trade-message-token");
    await expect(getTradeMessageRealtimeToken()).resolves.toBe("trade-message-token");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/realtime/trade-messages-token",
      expect.objectContaining({ credentials: "same-origin", cache: "no-store" })
    );
  });

  test("subscribes to one private request topic and ignores self or unrelated broadcasts", () => {
    const onMessage = vi.fn();
    const onStatus = vi.fn();
    const unsubscribe = subscribeToTradeMessages({
      requestId: "request-1",
      currentUserId: "buyer-1",
      onMessage,
      onStatus,
    });

    expect(mocks.channel).toHaveBeenCalledWith("trade-message:request-1", {
      config: { private: true },
    });
    expect(onStatus).toHaveBeenCalledWith("SUBSCRIBED");

    broadcastHandler?.({
      payload: {
        requestId: "other-request",
        messageId: "message-1",
        senderId: "seller-1",
        createdAt: "2026-09-09T12:00:00.000Z",
      },
    });
    broadcastHandler?.({
      payload: {
        requestId: "request-1",
        messageId: "message-2",
        senderId: "buyer-1",
        createdAt: "2026-09-09T12:00:00.000Z",
      },
    });
    broadcastHandler?.({
      payload: {
        requestId: "request-1",
        messageId: "message-3",
        senderId: "seller-1",
        createdAt: "2026-09-09T12:00:00.000Z",
      },
    });
    broadcastHandler?.({
      payload: {
        requestId: "request-1",
        messageId: "message-3",
        senderId: "seller-1",
        createdAt: "2026-09-09T12:00:00.000Z",
      },
    });

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith({
      requestId: "request-1",
      messageId: "message-3",
      senderId: "seller-1",
      createdAt: "2026-09-09T12:00:00.000Z",
    });

    unsubscribe();
    expect(mocks.removeChannel).toHaveBeenCalledTimes(1);
  });
});
