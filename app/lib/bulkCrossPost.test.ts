import { describe, expect, test } from "vitest";
import { buildBulkCrossPostPreviewItems } from "./bulkCrossPost";

describe("buildBulkCrossPostPreviewItems", () => {
  test("keeps selected draft order and sends only listing facts", () => {
    const items = buildBulkCrossPostPreviewItems([
      {
        id: "draft-b",
        name: " Monitor ",
        description: " 24 inch display ",
        price: 75,
        quantity: 1,
        category: "electronics",
        imageIndexes: [1],
        contactWechatId: "private-wechat",
      },
      {
        id: "draft-a",
        name: "Chair",
        description: "Desk chair",
        price: 20,
        quantity: 2,
        category: "home",
      },
    ]);

    expect(items.map((item) => item.clientId)).toEqual(["draft-b", "draft-a"]);
    expect(items[0]).toEqual({
      clientId: "draft-b",
      name: "Monitor",
      description: "24 inch display",
      price: 75,
      quantity: 1,
      category: "electronics",
    });
    expect(JSON.stringify(items)).not.toContain("private-wechat");
    expect(JSON.stringify(items)).not.toContain("imageIndexes");
  });

  test("rejects invalid or duplicate drafts as one snapshot", () => {
    const draft = {
      id: "draft-1",
      name: "Chair",
      description: "",
      price: 20,
      quantity: 1,
      category: "home",
    };
    expect(() => buildBulkCrossPostPreviewItems([draft, draft])).toThrow(
      "unique"
    );
  });
});
