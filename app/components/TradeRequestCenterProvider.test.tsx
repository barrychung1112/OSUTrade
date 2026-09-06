import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestCenterOpenEvent } from "../lib/requestCenterEvents";
import TradeRequestCenterProvider from "./TradeRequestCenterProvider";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "seller-1" } }, status: "authenticated" }),
}));

vi.mock("../i18n", () => ({
  useI18n: () => ({
    locale: "en",
    t: (key: string) => key,
  }),
}));

vi.mock("./SellerRequestCenter", () => ({
  default: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div role="dialog">{children}</div> : null,
}));

describe("TradeRequestCenterProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
  });

  it("opens and loads the focused seller request from an event", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "request-1",
              itemId: "product-1",
              buyerId: "buyer-1",
              buyerEmail: null,
              quantity: 1,
              note: "Meet at the library",
              status: "sent",
              createdAt: "2026-08-31T12:00:00Z",
              product: { name: "Desk lamp", price: 20, imageUrl: null },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    render(
      <TradeRequestCenterProvider>
        <span>Page</span>
      </TradeRequestCenterProvider>
    );

    fireEvent(
      window,
      new CustomEvent(requestCenterOpenEvent, {
        detail: {
          notificationId: "notification-1",
          requestId: "request-1",
          audience: "seller",
        },
      })
    );

    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(await screen.findByText("Desk lamp")).toBeTruthy();
    expect(screen.getByText("seller.accept")).toBeTruthy();
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith("/api/seller/requests", {
        cache: "no-store",
      })
    );
  });
});
