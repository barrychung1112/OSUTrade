import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ useSession: vi.fn() }));

vi.mock("next-auth/react", () => ({ useSession: mocks.useSession }));

import FavoriteProvider, { useFavorites } from "./FavoriteProvider";
import { favoriteStorageKey } from "../lib/favorites";

function FavoriteProbe() {
  const { favoriteIds, isFavorite, toggleFavorite } = useFavorites();

  return (
    <>
      <output data-testid="favorite-ids">{favoriteIds.join(",")}</output>
      <output data-testid="has-local">{String(isFavorite("local-1"))}</output>
      <button type="button" onClick={() => void toggleFavorite("local-1")}>
        Toggle local
      </button>
    </>
  );
}

describe("FavoriteProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    mocks.useSession.mockReturnValue({ data: null, status: "unauthenticated" });
  });

  afterEach(cleanup);

  test("keeps a guest favorite on the current device", async () => {
    render(
      <FavoriteProvider>
        <FavoriteProbe />
      </FavoriteProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Toggle local" }));

    await waitFor(() => {
      expect(screen.getByTestId("has-local").textContent).toBe("true");
    });
    expect(window.localStorage.getItem(favoriteStorageKey)).toBe('["local-1"]');
  });

  test("merges device favorites into the signed-in account without dropping either list", async () => {
    window.localStorage.setItem(favoriteStorageKey, '["local-1"]');
    mocks.useSession.mockReturnValue({
      data: { user: { id: "user-1" } },
      status: "authenticated",
    });
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ id: "account-1" }] }), { status: 200 })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: ["local-1"] }), { status: 200 }));

    render(
      <FavoriteProvider>
        <FavoriteProbe />
      </FavoriteProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("favorite-ids").textContent).toBe(
        "local-1,account-1"
      );
    });
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/favorites", {
      cache: "no-store",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/favorites", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productIds: ["local-1"] }),
    });
  });

  test("loads account favorites without posting an empty device batch", async () => {
    mocks.useSession.mockReturnValue({
      data: { user: { id: "user-1" } },
      status: "authenticated",
    });
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [{ id: "account-1" }] }), { status: 200 })
    );

    render(
      <FavoriteProvider>
        <FavoriteProbe />
      </FavoriteProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("favorite-ids").textContent).toBe("account-1");
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
