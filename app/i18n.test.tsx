import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/en/product/p-1",
  useRouter: () => ({ push: mocks.push }),
}));

import { I18nProvider, LanguageToggle } from "./i18n";

describe("LanguageToggle", () => {
  beforeEach(() => {
    mocks.push.mockReset();
    window.localStorage.clear();
  });

  test("changes the product URL when a localized product language is selected", () => {
    render(<I18nProvider><LanguageToggle /></I18nProvider>);

    fireEvent.click(screen.getByRole("button", { name: "繁中" }));

    expect(mocks.push).toHaveBeenCalledWith("/zh-tw/product/p-1");
  });
});
