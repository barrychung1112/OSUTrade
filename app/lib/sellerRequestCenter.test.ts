import { describe, expect, it } from "vitest";
import { groupSellerRequests } from "./sellerRequestCenter";

const requests = [
  { id: "accepted", status: "accepted", createdAt: "2026-08-01T12:00:00Z" },
  { id: "completed", status: "completed", createdAt: "2026-08-04T12:00:00Z" },
  { id: "new", status: "sent", createdAt: "2026-08-03T12:00:00Z" },
  { id: "expired", status: "expired", createdAt: "2026-08-02T12:00:00Z" },
  { id: "older", status: "sent", createdAt: "2026-08-01T10:00:00Z" },
  { id: "declined", status: "declined", createdAt: "2026-08-02T10:00:00Z" },
] as const;

describe("groupSellerRequests", () => {
  it("groups requests by actionable state", () => {
    const result = groupSellerRequests(requests);

    expect(result.active.map((request) => request.id)).toEqual([
      "new",
      "older",
      "accepted",
    ]);
    expect(result.expired.map((request) => request.id)).toEqual(["expired"]);
    expect(result.history.map((request) => request.id)).toEqual([
      "completed",
      "declined",
    ]);
  });

  it("returns a pending count from the same grouped source", () => {
    expect(groupSellerRequests(requests).pendingCount).toBe(2);
    expect(groupSellerRequests(requests).actionableCount).toBe(3);
  });
});
