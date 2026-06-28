import type { PublishedCrossPostProduct } from "./crossPostFinalizer";
import type { CrossPostFlowStage } from "./crossPostPreview";

export function createBulkDraftRequestTracker() {
  let currentRequestId = 0;

  return {
    start() {
      currentRequestId += 1;
      return currentRequestId;
    },
    invalidate() {
      currentRequestId += 1;
    },
    isCurrent(requestId: number) {
      return requestId === currentRequestId;
    },
  };
}

export function isBulkDraftMutationLocked(
  bulkPublishing: boolean,
  crossPostStage: CrossPostFlowStage = "idle"
) {
  return (
    bulkPublishing ||
    crossPostStage === "generating" ||
    crossPostStage === "reviewing" ||
    crossPostStage === "publishing"
  );
}

export function getPendingCrossPostDraftIds(
  snapshotIds: string[],
  publishedProducts: PublishedCrossPostProduct[]
) {
  const publishedIds = new Set(
    publishedProducts.map((product) => product.clientId)
  );
  const seen = new Set<string>();
  return snapshotIds.filter((draftId) => {
    if (seen.has(draftId) || publishedIds.has(draftId)) return false;
    seen.add(draftId);
    return true;
  });
}

export function isBulkPublishActionBarVisible(stage: CrossPostFlowStage) {
  return (
    stage === "idle" || stage === "generating" || stage === "finalized"
  );
}
