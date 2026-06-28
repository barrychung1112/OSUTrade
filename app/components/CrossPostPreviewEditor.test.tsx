import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Theme } from "@radix-ui/themes";
import { afterEach, describe, expect, test, vi } from "vitest";
import { I18nProvider } from "../i18n";
import {
  crossPostPlatforms,
  platformLanguage,
  type CrossPostCopy,
} from "../lib/crossPostCopy";
import type { PublishedCrossPostProduct } from "../lib/crossPostFinalizer";
import CrossPostPreviewEditor from "./CrossPostPreviewEditor";

const fiveCopies: CrossPostCopy[] = crossPostPlatforms.map((platform) => ({
  platform,
  language: platformLanguage[platform],
  title: `${platform} title`,
  body: `${platform} body`,
}));

afterEach(cleanup);

function Harness({
  publishedProducts = [],
}: {
  publishedProducts?: PublishedCrossPostProduct[];
}) {
  const [copies, setCopies] = useState(fiveCopies);
  return (
    <I18nProvider>
      <Theme>
        <CrossPostPreviewEditor
          copies={copies}
          source="ai"
          publishedProducts={publishedProducts}
          busy={false}
          error={null}
          confirmLabel="Confirm"
          canGoBack
          canConfirm
          onCopiesChange={setCopies}
          onBack={vi.fn()}
          onConfirm={vi.fn()}
        />
      </Theme>
    </I18nProvider>
  );
}

describe("CrossPostPreviewEditor", () => {
  test("keeps independent edits across all five platform tabs", () => {
    render(<Harness />);

    expect(
      crossPostPlatforms.every((platform) =>
        screen.getByRole("tab", {
          name:
            platform === "facebook"
              ? "Facebook"
              : platform === "craigslist"
                ? "Craigslist"
                : platform === "line"
                  ? "LINE"
                  : platform === "wechat"
                    ? "WeChat"
                    : "Discord",
        })
      )
    ).toBe(true);

    fireEvent.click(screen.getByRole("tab", { name: "LINE" }));
    fireEvent.change(screen.getByLabelText("Post title"), {
      target: { value: "LINE edited" },
    });
    fireEvent.change(screen.getByLabelText("Post body"), {
      target: { value: "LINE body edited" },
    });
    fireEvent.click(screen.getByRole("tab", { name: "Facebook" }));
    fireEvent.click(screen.getByRole("tab", { name: "LINE" }));

    expect((screen.getByLabelText("Post title") as HTMLInputElement).value).toBe(
      "LINE edited"
    );
    expect(
      (screen.getByLabelText("Post body") as HTMLTextAreaElement).value
    ).toBe("LINE body edited");
  });

  test("shows the no-link notice before publishing and managed links after publishing", () => {
    const { rerender } = render(<Harness />);

    expect(screen.getByText(/does not include OSUTrade product links/i)).toBeTruthy();

    rerender(
      <Harness
        publishedProducts={[
          {
            clientId: "manual-1",
            productId: "p-1",
            name: "Desk Lamp",
            productUrl: "https://osutrade.example/product/p-1",
          },
        ]}
      />
    );

    expect(screen.getByText(/https:\/\/osutrade\.example\/product\/p-1/)).toBeTruthy();
    expect(
      screen.queryByText(/does not include OSUTrade product links/i)
    ).toBeNull();
  });
});
