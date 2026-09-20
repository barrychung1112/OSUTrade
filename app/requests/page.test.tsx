import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RequestsPage from "./page";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "buyer-1" } }, status: "authenticated" }),
}));

const t = (key: string) => key;

vi.mock("../i18n", () => ({
  useI18n: () => ({ locale: "en", t }),
}));

vi.mock("../components/Header", () => ({ default: () => null }));
vi.mock("../components/LoginModal", () => ({ default: () => null }));
vi.mock("../components/WantedRequestsPanel", () => ({ default: () => null }));

const sentRequest = {
  id: "request-1",
  itemId: "product-1",
  quantity: 1,
  note: "",
  status: "sent",
  createdAt: "2026-09-20T00:00:00.000Z",
  product: {
    id: "product-1",
    name: "Desk lamp",
    price: 20,
    imageUrl: null,
  },
};

describe("RequestsPage cancellation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  afterEach(() => cleanup());

  it("reloads requests from the server after a buyer cancels one", async () => {
    const cancelledRequest = { ...sentRequest, status: "cancelled" };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [sentRequest] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    ).mockResolvedValueOnce(
      new Response(JSON.stringify({ request: cancelledRequest }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    ).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [cancelledRequest] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    render(<RequestsPage />);

    const cancelButton = await screen.findByText("requests.cancel");
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/requests", {
        cache: "no-store",
      });
    });
    expect(await screen.findByText("requests.status.cancelled")).toBeTruthy();
  });
});
