import { describe, expect, test } from "vitest";

import { privatePageMetadata } from "./privatePageMetadata";

describe("private page metadata", () => {
  test("keeps account-specific marketplace pages out of search results", () => {
    expect(privatePageMetadata.robots).toEqual({
      index: false,
      follow: false,
    });
  });
});
