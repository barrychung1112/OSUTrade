import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ fill: _fill, priority: _priority, unoptimized: _unoptimized, ...props }: Record<string, unknown>) => (
    <img {...props} />
  ),
}));

import ProductImageGallery from "./ProductImageGallery";

const copy = {
  viewFullImage: "View full image",
  imageViewer: "Image viewer",
  closeImageViewer: "Close image viewer",
  previousImage: "Previous image",
  nextImage: "Next image",
  viewImage: "View image {number}",
  imageCounter: "{current} of {total}",
};

describe("ProductImageGallery", () => {
  test("opens the selected image in a full-screen viewer and supports keyboard close", () => {
    render(
      <ProductImageGallery
        images={["https://example.com/desk-1.jpg", "https://example.com/desk-2.jpg"]}
        itemName="Desk"
        copy={copy}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "View full image" }));
    expect(screen.getByRole("dialog", { name: "Image viewer" })).toBeTruthy();
    expect(screen.getByAltText("Desk full size 1")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Next image" }));
    expect(screen.getByAltText("Desk full size 2")).toBeTruthy();
    expect(screen.getByText("2 of 2")).toBeTruthy();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Image viewer" })).toBeNull();
  });
});
