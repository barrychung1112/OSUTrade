import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import SiteFooter from "./SiteFooter";

describe("SiteFooter", () => {
  test("links every public trust page and exposes the support email", () => {
    render(<SiteFooter />);

    expect(screen.getByRole("link", { name: "Privacy" }).getAttribute("href")).toBe(
      "/privacy"
    );
    expect(screen.getByRole("link", { name: "Terms" }).getAttribute("href")).toBe("/terms");
    expect(screen.getByRole("link", { name: "Contact" }).getAttribute("href")).toBe(
      "/contact"
    );
    expect(screen.getByRole("link", { name: "Safety" }).getAttribute("href")).toBe("/safety");
    expect(
      screen.getByRole("link", { name: "barrychung1112@gmail.com" }).getAttribute("href")
    ).toBe("mailto:barrychung1112@gmail.com");
  });
});
