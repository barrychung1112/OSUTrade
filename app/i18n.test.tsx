import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { I18nProvider, LanguageToggle, useI18n } from "./i18n";

function TranslationProbe() {
  const { t } = useI18n();

  return <p>{t("requests.filter.completed")}</p>;
}

describe("LanguageToggle", () => {
  afterEach(() => {
    cleanup();
  });

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

  test("translates the completed request filter in every supported locale", () => {
    render(
      <I18nProvider>
        <LanguageToggle />
        <TranslationProbe />
      </I18nProvider>
    );

    expect(screen.getByText("Completed")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "繁中" }));
    expect(screen.getByText("已完成")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "简中" }));
    expect(screen.getByText("已完成")).toBeTruthy();
  });
});
