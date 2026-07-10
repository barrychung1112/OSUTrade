import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { I18nProvider } from "../i18n";
import WantedRequestsPanel from "./WantedRequestsPanel";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "wanted-1",
            query: "mini fridge",
            maxPrice: 85,
            category: "home",
            description: "before move-in",
            emailSubscribed: true,
            status: "active",
          },
        ],
      }),
    })
  );
});

describe("WantedRequestsPanel", () => {
  test("loads wanted items and renders subscription state", async () => {
    render(
      <I18nProvider>
        <WantedRequestsPanel />
      </I18nProvider>
    );

    expect(await screen.findByText("mini fridge")).toBeTruthy();
    expect(screen.getByText("Budget: $85.00")).toBeTruthy();
    expect(screen.getByText("Email alerts on")).toBeTruthy();
  });

  test("creates a wanted request from the form", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: "wanted-2",
            query: "bike",
            maxPrice: 120,
            category: "general",
            description: "",
            emailSubscribed: true,
            status: "active",
          },
        }),
      } as Response);

    render(
      <I18nProvider>
        <WantedRequestsPanel />
      </I18nProvider>
    );

    fireEvent.change(await screen.findByLabelText("Wanted item"), {
      target: { value: "bike" },
    });
    fireEvent.change(screen.getByLabelText("Max budget"), {
      target: { value: "120" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save wanted item" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        "/api/wanted-requests",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"query":"bike"'),
        })
      )
    );
    expect(await screen.findByText("bike")).toBeTruthy();
  });
});
