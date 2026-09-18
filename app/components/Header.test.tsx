import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ locale: "zh" as "en" | "zh" }));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));

vi.mock("../i18n", () => ({
  LanguageToggle: () => <div data-testid="language-toggle" />,
  useI18n: () => ({
    locale: mocks.locale,
    t: (key: string) => key === "nav.guides"
      ? (mocks.locale === "en" ? "Guides" : "指南")
      : key,
  }),
}));

vi.mock("./LoginModal", () => ({ default: () => <button type="button">Login</button> }));
vi.mock("./NotificationBell", () => ({ default: () => null }));
vi.mock("@radix-ui/themes", () => ({ Avatar: () => <span /> }));
vi.mock("framer-motion", () => ({
  motion: { header: ({ children }: { children: React.ReactNode }) => <header>{children}</header> },
}));

import Header from "./Header";

describe("Header", () => {
  beforeEach(() => {
    mocks.locale = "zh";
  });

  test("uses the localized Guides route in both desktop and mobile navigation", () => {
    render(<Header />);

    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));

    const guideLinks = screen.getAllByRole("link", { name: "指南" });
    expect(guideLinks).toHaveLength(2);
    guideLinks.forEach((link) => {
      expect(link.getAttribute("href")).toBe("/zh-tw/guides/move-in");
    });
  });

  test("uses the English Guides route in both desktop and mobile navigation", () => {
    mocks.locale = "en";
    render(<Header />);

    fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));

    const guideLinks = screen.getAllByRole("link", { name: "Guides" });
    expect(guideLinks).toHaveLength(2);
    guideLinks.forEach((link) => {
      expect(link.getAttribute("href")).toBe("/en/guides/move-in");
    });
  });
});
