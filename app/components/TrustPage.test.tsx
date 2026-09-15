import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

vi.mock("./Header", () => ({ default: () => <header>Header</header> }));

import TrustPage from "./TrustPage";

describe("TrustPage", () => {
  test("renders the public contact information with an email action", () => {
    render(<TrustPage pageKey="contact" />);

    expect(screen.getByRole("heading", { level: 1, name: "Contact OSUTrade" })).toBeTruthy();
    expect(screen.getByText("Operator: CHUNG PEIHSI (Barry Chung).")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Email OSUTrade support" }).getAttribute("href")).toBe(
      "mailto:barrychung1112@gmail.com"
    );
  });
});
