import { describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  permanentRedirect: vi.fn(() => {
    throw new Error("redirected");
  }),
}));

vi.mock("next/navigation", () => ({
  permanentRedirect: mocks.permanentRedirect,
  useParams: () => ({ id: "p-1" }),
}));
import LegacyProductPage from "./page";

describe("legacy product URL", () => {
  test("permanently redirects to the English localized URL", async () => {
    await expect(
      LegacyProductPage({ params: Promise.resolve({ id: "p-1" }) })
    ).rejects.toThrow("redirected");

    expect(mocks.permanentRedirect).toHaveBeenCalledWith("/en/product/p-1");
  });
});
