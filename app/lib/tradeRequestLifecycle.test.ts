import { describe, expect, it } from "vitest";
import { canSellerTransition } from "./tradeRequestLifecycle";

describe("seller trade request lifecycle", () => {
  it("allows only the actions belonging to the current stage", () => {
    expect(canSellerTransition("sent", "accept")).toBe(true);
    expect(canSellerTransition("sent", "decline")).toBe(true);
    expect(canSellerTransition("accepted", "complete")).toBe(true);
    expect(canSellerTransition("accepted", "cancel")).toBe(true);
    expect(canSellerTransition("completed", "cancel")).toBe(false);
    expect(canSellerTransition("cancelled", "complete")).toBe(false);
  });
});
