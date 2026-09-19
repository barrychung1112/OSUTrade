import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const globalStyles = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

describe("seasonal hero responsive geometry", () => {
  test("gives the 541–860px product scene enough height for the monitor tile", () => {
    expect(globalStyles).toMatch(
      /@media \(min-width: 541px\) and \(max-width: 860px\) \{\s*\.home-product-scene \{\s*height: 420px;/
    );
  });
});
