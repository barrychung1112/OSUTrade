import {
  parseCrossPostPreviewItems,
  type CrossPostPreviewItem,
} from "./crossPostPreview";

type BulkCrossPostDraftFacts = {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  category: string;
  [key: string]: unknown;
};

export function buildBulkCrossPostPreviewItems(
  drafts: BulkCrossPostDraftFacts[]
): CrossPostPreviewItem[] {
  const parsed = parseCrossPostPreviewItems(
    drafts.map((draft) => ({
      clientId: draft.id,
      name: draft.name,
      description: draft.description,
      price: Number(draft.price),
      quantity: Number(draft.quantity),
      category: draft.category,
    }))
  );
  if (parsed.ok === false) throw new Error(parsed.message);
  return parsed.items;
}
