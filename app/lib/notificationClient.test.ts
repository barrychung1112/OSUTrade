import { describe, expect, test } from "vitest";
import { getUnreadIncrease } from "./notificationClient";

describe("notification client state", () => {
  test("detects newly unread notifications after the first load", () => {
    expect(getUnreadIncrease(null, 3)).toBe(0);
    expect(getUnreadIncrease(1, 3)).toBe(2);
    expect(getUnreadIncrease(3, 1)).toBe(0);
  });
});
