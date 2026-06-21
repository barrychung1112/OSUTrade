import { describe, expect, test } from "vitest";
import { requiresLogin } from "./routeAccess";

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
