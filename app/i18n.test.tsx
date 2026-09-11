import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { I18nProvider, LanguageToggle } from "./i18n";

describe("LanguageToggle", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test("reports a language choice without requiring an app router", () => {
    const onLocaleChange = vi.fn();
    render(
      <I18nProvider>
        <LanguageToggle onLocaleChange={onLocaleChange} />
      </I18nProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "繁中" }));

    expect(onLocaleChange).toHaveBeenCalledWith("zh");
  });
});
