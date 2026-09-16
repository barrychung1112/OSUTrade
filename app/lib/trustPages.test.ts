import { describe, expect, test } from "vitest";

import { TRUST_PAGE_PATHS, trustPageMetadata, trustPages } from "./trustPages";

describe("trust pages", () => {
  test("publishes the four public trust routes", () => {
    expect(TRUST_PAGE_PATHS).toEqual([
      "/privacy",
      "/terms",
      "/contact",
      "/safety",
    ]);
  });

  test("identifies the operator and public email without claiming university affiliation", () => {
    expect(trustPages.contact.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          body: expect.arrayContaining([
            expect.stringContaining("CHUNG PEIHSI (Barry Chung)"),
            expect.stringContaining("barrychung1112@gmail.com"),
            expect.stringContaining("Oregon, USA"),
          ]),
        }),
      ])
    );
    expect(JSON.stringify(trustPages)).toContain("not affiliated with Oregon State University");
  });

  test("gives each page a canonical public metadata URL", () => {
    expect(trustPageMetadata("privacy").alternates?.canonical).toBe("/privacy");
    expect(trustPageMetadata("safety").alternates?.canonical).toBe("/safety");
  });

  test("states the current publication date consistently", () => {
    expect(JSON.stringify(trustPages)).toContain("Last updated: September 16, 2026.");
  });
});
