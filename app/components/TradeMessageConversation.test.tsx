import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import TradeMessageConversation from "./TradeMessageConversation";

const mocks = vi.hoisted(() => ({
  t: (key: string, values?: Record<string, string | number>) =>
    key === "tradeMessages.characters" ? `${values?.count}/1000` : key,
}));

vi.mock("../i18n", () => ({
  useI18n: () => ({
    t: mocks.t,
  }),
}));
describe("TradeMessageConversation", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("crypto", { randomUUID: () => "11111111-1111-4111-8111-111111111111" });
  });

  test("loads history, acknowledges read state, and sends an optimistic message", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                id: "message-1",
                requestId: "request-1",
                senderId: "seller-1",
                body: "The desk lamp is ready.",
                clientMessageId: "22222222-2222-4222-8222-222222222222",
                createdAt: "2026-09-09T12:00:00.000Z",
              },
            ],
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              id: "message-2",
              requestId: "request-1",
              senderId: "buyer-1",
              body: "Could we meet after class?",
              clientMessageId: "11111111-1111-4111-8111-111111111111",
              createdAt: "2026-09-09T12:01:00.000Z",
            },
          }),
          { status: 201 }
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <TradeMessageConversation
        request={{ id: "request-1", status: "accepted", product: { name: "Desk lamp" } }}
        currentUserId="buyer-1"
        onBack={vi.fn()}
      />
    );

    expect(await screen.findByText("The desk lamp is ready.")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Desk lamp" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/requests/request-1/messages/read",
        expect.objectContaining({ method: "PATCH" })
      )
    );

    fireEvent.change(screen.getByLabelText("tradeMessages.messageLabel"), {
      target: { value: "Could we meet after class?" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "tradeMessages.send" }).closest("form")!);

    expect(await screen.findByText("Could we meet after class?")).toBeTruthy();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/requests/request-1/messages",
        expect.objectContaining({ method: "POST" })
      )
    );
  });

  test("refreshes the visible conversation every eight seconds", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      if (String(input).includes("/messages?limit=50")) {
        return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
      }

      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <TradeMessageConversation
        request={{ id: "request-1", status: "accepted", product: { name: "Desk lamp" } }}
        currentUserId="buyer-1"
        onBack={vi.fn()}
      />
    );

    await act(async () => {});
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/requests/request-1/messages?limit=50",
      { cache: "no-store" }
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8_000);
    });

    const messageLoads = fetchMock.mock.calls.filter(([input]) =>
      String(input).includes("/messages?limit=50")
    );
    expect(messageLoads).toHaveLength(2);
  });
});
