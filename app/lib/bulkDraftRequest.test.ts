import { describe, expect, test } from "vitest";
import {
  createBulkDraftRequestTracker,
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
  test("locks draft changes only while publishing", () => {
    expect(isBulkDraftMutationLocked(true)).toBe(true);
    expect(isBulkDraftMutationLocked(false)).toBe(false);
  });
});
