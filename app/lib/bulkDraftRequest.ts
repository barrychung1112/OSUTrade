import type { PublishedCrossPostProduct } from "./crossPostFinalizer";
import type { CrossPostFlowStage } from "./crossPostPreview";

export function createBulkDraftPayload(images: Array<{ path: string }>) {
  return {
    imagePaths: images.map((image) => image.path),
  };
}

export function sendBulkDraftRequest(
  images: Array<{ path: string }>,
  fetcher: typeof fetch = fetch
) {
  return fetcher("/api/products/bulk-drafts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(createBulkDraftPayload(images)),
  });
}

export function getUncommittedImagePaths(
  images: Array<{ path: string }>,
  committedPaths: ReadonlySet<string>
) {
  return images
    .map((image) => image.path)
    .filter((path) => !committedPaths.has(path));
}

export function getOrCreateProductRequestKey(
  keys: Map<string, string>,
  itemId: string,
  createKey: () => string = () => crypto.randomUUID()
) {
  const existingKey = keys.get(itemId);
  if (existingKey) return existingKey;

  const key = createKey();
  keys.set(itemId, key);
  return key;
}

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
  crossPostStage: CrossPostFlowStage = "idle",
  bulkLoading = false
) {
  return (
    bulkPublishing ||
    bulkLoading ||
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
