import { describe, expect, test } from "vitest";
import { getAcceptedRequestProductStatus } from "./sellerRequestAcceptance";

describe("accepted request product status", () => {
  test("keeps product available when accepted request leaves stock remaining", () => {
    expect(getAcceptedRequestProductStatus(2)).toBe("available");
  });

  test("marks product pending when accepted request reserves all remaining stock", () => {
    expect(getAcceptedRequestProductStatus(0)).toBe("pending");
  });
});
