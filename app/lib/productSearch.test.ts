import { describe, expect, test } from "vitest";
import { buildProductNameSearchFilter } from "./productSearch";

describe("buildProductNameSearchFilter", () => {
  test("searches base and translated product name columns", () => {
    expect(buildProductNameSearchFilter("monitor")).toBe(
      'name.ilike."%monitor%",name_en.ilike."%monitor%",name_zh_tw.ilike."%monitor%",name_zh_cn.ilike."%monitor%"'
    );
  });

  test("trims whitespace before building the filter", () => {
    expect(buildProductNameSearchFilter("  螢幕  ")).toContain(
      'name_zh_tw.ilike."%螢幕%"'
    );
  });

  test("quotes search text so commas stay inside the ilike pattern", () => {
    expect(buildProductNameSearchFilter("desk, lamp")).toContain(
      'name.ilike."%desk, lamp%"'
    );
  });

  test("escapes quotes inside search text", () => {
    expect(buildProductNameSearchFilter('12" monitor')).toContain(
      'name.ilike."%12\\" monitor%"'
    );
  });
});
