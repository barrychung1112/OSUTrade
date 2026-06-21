import { describe, expect, test } from "vitest";
import { getHomeCtaAction } from "./homeCtaAccess";

describe("getHomeCtaAction", () => {
  test("lets visitors browse the marketplace without opening login", () => {
    expect(
      getHomeCtaAction({
        path: "/overview",
        authStatus: "unauthenticated",
        hasUser: false,
      })
    ).toEqual({ type: "navigate", path: "/overview" });
  });

  test("requires login before listing an item", () => {
    expect(
      getHomeCtaAction({
        path: "/sell",
        authStatus: "unauthenticated",
        hasUser: false,
      })
    ).toEqual({ type: "login", path: "/sell" });
  });
});
