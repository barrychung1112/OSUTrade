import { describe, expect, test } from "vitest";
import {
  createBulkDraftRequestTracker,
  getPendingCrossPostDraftIds,
  isBulkDraftMutationLocked,
} from "./bulkDraftRequest";

describe("createBulkDraftRequestTracker", () => {
  test("invalidates responses from an earlier photo selection", () => {
    const tracker = createBulkDraftRequestTracker();
    const firstRequest = tracker.start();

    tracker.invalidate();
    const secondRequest = tracker.start();

    expect(tracker.isCurrent(firstRequest)).toBe(false);
    expect(tracker.isCurrent(secondRequest)).toBe(true);
  });
});

describe("isBulkDraftMutationLocked", () => {
  test("locks draft changes while a preview snapshot is active", () => {
    expect(isBulkDraftMutationLocked(false, "idle")).toBe(false);
    expect(isBulkDraftMutationLocked(false, "generating")).toBe(true);
    expect(isBulkDraftMutationLocked(false, "reviewing")).toBe(true);
    expect(isBulkDraftMutationLocked(false, "publishing")).toBe(true);
    expect(isBulkDraftMutationLocked(false, "finalized")).toBe(false);
    expect(isBulkDraftMutationLocked(true, "idle")).toBe(true);
  });
});

describe("getPendingCrossPostDraftIds", () => {
  test("returns only unpublished snapshot ids in their original order", () => {
    expect(
      getPendingCrossPostDraftIds(
        ["a", "b", "c"],
        [
          {
            clientId: "b",
            productId: "p-2",
            name: "B",
            productUrl: "/product/p-2",
          },
        ]
      )
    ).toEqual(["a", "c"]);
  });

  test("deduplicates snapshot ids without reordering them", () => {
    expect(getPendingCrossPostDraftIds(["a", "a", "b"], [])).toEqual([
      "a",
      "b",
    ]);
  });
});
