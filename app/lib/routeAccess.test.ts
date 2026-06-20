import { describe, expect, test } from "vitest";
import { requiresLogin } from "./routeAccess";

describe("requiresLogin", () => {
  test("allows visitors to browse the marketplace", () => {
    expect(requiresLogin("/overview")).toBe(false);
    expect(requiresLogin("/overview?category=electronics")).toBe(false);
  });

  test("keeps trade actions protected", () => {
    expect(requiresLogin("/sell")).toBe(true);
    expect(requiresLogin("/cart")).toBe(true);
    expect(requiresLogin("/seller")).toBe(true);
    expect(requiresLogin("/requests")).toBe(true);
  });
});
