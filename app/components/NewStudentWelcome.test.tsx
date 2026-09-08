import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Theme } from "@radix-ui/themes";
import { I18nProvider } from "../i18n";
import NewStudentWelcome from "./NewStudentWelcome";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function show() {
  return render(
    <Theme>
      <I18nProvider>
        <NewStudentWelcome />
      </I18nProvider>
    </Theme>
  );
}

describe("NewStudentWelcome", () => {
  it("opens on the homepage and links directly to the public marketplace", async () => {
    show();
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Sheets, pillow & blanket")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Find my move-in essentials" }).getAttribute("href")
    ).toBe("/overview");
  });

  it("switches to off-campus essentials and can reopen after closing", async () => {
    show();
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Off-campus" }));
    expect(screen.getByText("Desk & chair")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close welcome guide" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "New student guide" }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
  });

  it.each([
    ["zh", "歡迎來到", "尋找我的入住用品"],
    ["zhCn", "欢迎来到", "寻找我的入住用品"],
  ])("uses saved language %s", async (locale, heading, linkLabel) => {
    localStorage.setItem("osutrade-locale", locale);
    show();
    expect(await screen.findByText(heading)).toBeTruthy();
    expect(screen.getByRole("link", { name: linkLabel }).getAttribute("href")).toBe(
      "/overview"
    );
  });
});
