import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { I18nProvider } from "../i18n";
import BulkDraftFields from "./BulkDraftFields";

afterEach(cleanup);

describe("BulkDraftFields", () => {
  test("shows labeled fields and an explicit USD price", () => {
    const onChange = vi.fn();

    render(
      <I18nProvider>
        <BulkDraftFields
          draft={{
            id: "draft-1",
            name: "Floor lamp",
            description: "Adjustable reading lamp",
            price: 1,
            quantity: 1,
            category: "home",
            locale: "zh",
          }}
          categories={["general", "home"]}
          disabled={false}
          onChange={onChange}
        />
      </I18nProvider>
    );

    expect((screen.getByLabelText("Item name") as HTMLInputElement).value).toBe(
      "Floor lamp"
    );
    expect(
      (screen.getByLabelText("Item description") as HTMLTextAreaElement).value
    ).toBe("Adjustable reading lamp");
    expect((screen.getByLabelText("Price") as HTMLInputElement).value).toBe("1");
    expect(
      (screen.getByLabelText("Quantity available") as HTMLInputElement).value
    ).toBe("1");
    expect((screen.getByLabelText("Category") as HTMLSelectElement).value).toBe(
      "home"
    );
    expect(screen.getByText("$")).toBeTruthy();
    expect(screen.getByText("Draft language: 繁中")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Price"), {
      target: { value: "25" },
    });

    expect(onChange).toHaveBeenCalledWith({ price: 25 });
  });
});
