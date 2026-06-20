export function canLoadMoreProducts({
  hasMore,
  loading,
  loadingMore,
}: {
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
}) {
  return hasMore && !loading && !loadingMore;
}
