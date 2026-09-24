import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  locale: "zh" as "en" | "zh",
  nextLocale: "zhCn" as "en" | "zh" | "zhCn",
  pathname: "/",
  push: vi.fn(),
  refresh: vi.fn(),
  updateSession: vi.fn(),
  session: null as { user: { id: string; name: string; email: string } } | null,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
  useSession: () => ({
    data: mocks.session,
    status: mocks.session ? "authenticated" : "unauthenticated",
    update: mocks.updateSession,
  }),
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
    mocks.refresh.mockReset();
    mocks.updateSession.mockReset();
    mocks.session = null;
    vi.stubGlobal("fetch", vi.fn());
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

  test("links an authenticated seller to their own public profile", () => {
    mocks.session = {
      user: { id: "seller-1", name: "Campus Seller", email: "seller@example.com" },
    };
    render(<Header />);

    fireEvent.click(screen.getAllByRole("button", { name: "Campus Seller" })[0]);

    expect(
      screen.getByRole("menuitem", { name: "account.viewSellerProfile" }).getAttribute("href")
    ).toBe("/sellers/seller-1");
  });

  test("refreshes a stale session name from the canonical public profile", async () => {
    mocks.session = {
      user: { id: "seller-1", name: "Old Auth Name", email: "seller@example.com" },
    };
    const fetchMock = vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: { name: "Canonical Profile Name" } }), { status: 200 })
    );

    render(<Header />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/account/display-name", {
        cache: "no-store",
      });
    });
    expect(mocks.updateSession).toHaveBeenCalledWith({ name: "Canonical Profile Name" });
  });

  test("updates the visible session name after saving a display name", async () => {
    mocks.session = {
      user: { id: "seller-1", name: "Old Name", email: "seller@example.com" },
    };
    const fetchMock = vi.mocked(fetch).mockImplementation(async (_input, init) => {
      const name = init?.method === "PATCH" ? "New Name" : "Old Name";
      return new Response(JSON.stringify({ data: { name } }), { status: 200 });
    });
    render(<Header />);

    fireEvent.click(screen.getAllByRole("button", { name: "Old Name" })[0]);
    fireEvent.click(screen.getByRole("menuitem", { name: "account.editDisplayName" }));
    fireEvent.change(screen.getByRole("textbox", { name: "account.displayName" }), {
      target: { value: "New Name" },
    });
    fireEvent.click(screen.getByRole("button", { name: "account.saveDisplayName" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/account/display-name", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "New Name" }),
      });
    });
    expect(mocks.updateSession).toHaveBeenCalledWith({ name: "New Name" });
    expect(mocks.refresh).toHaveBeenCalled();
  });

  test("renders the display-name dialog at the document body level", () => {
    mocks.session = {
      user: { id: "seller-1", name: "Campus Seller", email: "seller@example.com" },
    };
    render(<Header />);

    fireEvent.click(screen.getAllByRole("button", { name: "Campus Seller" })[0]);
    fireEvent.click(screen.getByRole("menuitem", { name: "account.editDisplayName" }));

    expect(screen.getByRole("dialog").parentElement).toBe(document.body);
  });
});
