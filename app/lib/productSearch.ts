const searchableProductNameColumns = [
  "name",
  "name_en",
  "name_zh_tw",
  "name_zh_cn",
] as const;

function quotePostgrestPattern(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function buildProductNameSearchFilter(name: string) {
  const query = name.trim();
  const pattern = quotePostgrestPattern(`%${query}%`);
  return searchableProductNameColumns
    .map((column) => `${column}.ilike.${pattern}`)
    .join(",");
}
