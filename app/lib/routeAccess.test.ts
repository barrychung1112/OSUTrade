import { describe, expect, test } from "vitest";
import { getMiddlewareRedirect, requiresLogin } from "./routeAccess";

describe("requiresLogin", () => {
  test("allows visitors to browse the marketplace", () => {
    expect(requiresLogin("/overview")).toBe(false);
    expect(requiresLogin("/overview?category=electronics")).toBe(false);
  });

  test("allows visitors to review their cookie cart before sending a request", () => {
    expect(requiresLogin("/cart")).toBe(false);
    expect(requiresLogin("/cart?from=product")).toBe(false);
  });

  test("keeps seller and account request pages protected", () => {
    expect(requiresLogin("/sell")).toBe(true);
    expect(requiresLogin("/seller")).toBe(true);
    expect(requiresLogin("/requests")).toBe(true);
  });
});

describe("getMiddlewareRedirect", () => {
  test("does not redirect signed-in users away from the homepage", () => {
    expect(
      getMiddlewareRedirect({
        pathname: "/",
        search: "",
        isLoggedIn: true,
      })
    ).toBeNull();
  });

  test("redirects visitors from protected pages back to login prompt on homepage", () => {
    expect(
      getMiddlewareRedirect({
        pathname: "/sell",
        search: "?draft=1",
        isLoggedIn: false,
      })
    ).toEqual({ pathname: "/", from: "/sell?draft=1" });
  });
});
