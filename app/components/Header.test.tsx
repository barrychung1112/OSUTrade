import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  locale: "zh" as "en" | "zh",
  nextLocale: "zhCn" as "en" | "zh" | "zhCn",
  pathname: "/",
  push: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ push: mocks.push, refresh: vi.fn() }),
}));

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));

vi.mock("../i18n", () => ({
  LanguageToggle: ({ onLocaleChange }: { onLocaleChange: (locale: "en" | "zh" | "zhCn") => void }) => (
    <button type="button" onClick={() => onLocaleChange(mocks.nextLocale)}>Change language</button>
  ),
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
  afterEach(cleanup);

  beforeEach(() => {
    mocks.locale = "zh";
    mocks.nextLocale = "zhCn";
    mocks.pathname = "/";
    mocks.push.mockReset();
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

  test.each([
    ["/zh-tw/guides", "en", "/en/guides"],
    ["/zh-tw/guides/move-out", "zhCn", "/zh-cn/guides/move-out"],
  ] as const)("keeps the guide route when changing language from %s", (pathname, nextLocale, expectedPath) => {
    mocks.pathname = pathname;
    mocks.nextLocale = nextLocale;
    render(<Header />);

    fireEvent.click(screen.getAllByRole("button", { name: "Change language" })[0]);

    expect(mocks.push).toHaveBeenCalledWith(expectedPath);
  });

  test.each(["/zh-tw/guides", "/zh-tw/guides/move-out"])(
    "marks Guides as active on %s",
    (pathname) => {
      mocks.pathname = pathname;
      render(<Header />);

      screen.getAllByRole("link", { name: "指南" }).forEach((link) => {
        expect(link.className.split(" ")).toContain("bg-orange-50");
      });
    }
  );
});
