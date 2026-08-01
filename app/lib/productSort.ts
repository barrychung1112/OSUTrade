type SortableQuery = {
  order: (
    column: string,
    options: { ascending: boolean }
  ) => SortableQuery;
};

export function applyProductListSort<TQuery extends SortableQuery>(
  query: TQuery,
  sort: string | null
) {
  let sortedQuery: SortableQuery = query;

  if (sort === "asc" || sort === "desc") {
    sortedQuery = sortedQuery.order("effective_price", { ascending: sort === "asc" });
  }

  sortedQuery = sortedQuery
    .order("created_at", { ascending: false })
    .order("product_id", { ascending: false });

  return sortedQuery as TQuery;
}
