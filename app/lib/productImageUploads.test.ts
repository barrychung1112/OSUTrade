import { describe, expect, test, vi } from "vitest";
import {
  readApiError,
  uploadProductImagesDirect,
  validateProductImageFiles,
} from "./productImageUploads";

function imageFile(name: string, type = "image/jpeg", size = 12) {
  return new File([new Uint8Array(size)], name, { type });
}

describe("validateProductImageFiles", () => {
  test("accepts supported images within the requested limit", () => {
    expect(
      validateProductImageFiles(
        [imageFile("desk.jpg"), imageFile("chair.webp", "image/webp")],
        10
      )
    ).toBeUndefined();
  });

  test("rejects unsupported image types", () => {
    expect(() =>
      validateProductImageFiles([imageFile("notes.gif", "image/gif")], 10)
    ).toThrow("Only JPG, PNG, or WebP images are supported.");
  });

  test("rejects images larger than 5 MB", () => {
    expect(() =>
      validateProductImageFiles(
        [imageFile("large.jpg", "image/jpeg", 5 * 1024 * 1024 + 1)],
        10
      )
    ).toThrow("Images must be 5 MB or smaller.");
  });

  test("rejects more images than the caller allows", () => {
    expect(() =>
      validateProductImageFiles(
        [imageFile("one.jpg"), imageFile("two.jpg")],
        1
      )
    ).toThrow("You can upload up to 1 image.");
  });
});

describe("uploadProductImagesDirect", () => {
  test("requests signed metadata then uploads each file directly", async () => {
    const files = [imageFile("desk.jpg"), imageFile("chair.png", "image/png")];
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          uploads: [
            {
              path: "user-id/desk.jpg",
              token: "desk-token",
              publicUrl: "https://project.supabase.co/storage/v1/object/public/product-images/user-id/desk.jpg",
            },
            {
              path: "user-id/chair.png",
              token: "chair-token",
              publicUrl: "https://project.supabase.co/storage/v1/object/public/product-images/user-id/chair.png",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const uploadToSignedUrl = vi.fn().mockResolvedValue(undefined);

    const result = await uploadProductImagesDirect(files, {
      maxFiles: 10,
      fetcher,
      uploadToSignedUrl,
    });

    expect(fetcher).toHaveBeenCalledWith("/api/products/images/sign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        files: [
          { name: "desk.jpg", type: "image/jpeg", size: 12 },
          { name: "chair.png", type: "image/png", size: 12 },
        ],
      }),
    });
    expect(uploadToSignedUrl).toHaveBeenNthCalledWith(
      1,
      "user-id/desk.jpg",
      "desk-token",
      files[0]
    );
    expect(uploadToSignedUrl).toHaveBeenNthCalledWith(
      2,
      "user-id/chair.png",
      "chair-token",
      files[1]
    );
    expect(result).toEqual([
      expect.objectContaining({ path: "user-id/desk.jpg" }),
      expect.objectContaining({ path: "user-id/chair.png" }),
    ]);
  });

  test("identifies the image that failed to upload", async () => {
    const file = imageFile("damaged.jpg");
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          uploads: [
            {
              path: "user-id/damaged.jpg",
              token: "upload-token",
              publicUrl: "https://project.supabase.co/image.jpg",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    await expect(
      uploadProductImagesDirect([file], {
        maxFiles: 10,
        fetcher,
        uploadToSignedUrl: vi.fn().mockRejectedValue(new Error("network")),
      })
    ).rejects.toThrow('Failed to upload "damaged.jpg". Please try again.');
  });
});

describe("readApiError", () => {
  test("uses a JSON API message when present", async () => {
    const response = new Response(JSON.stringify({ message: "Invalid image." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });

    await expect(readApiError(response, "Upload failed.")).resolves.toBe(
      "Invalid image."
    );
  });

  test("includes HTTP status for non-JSON platform errors", async () => {
    const response = new Response("Payload too large", { status: 413 });

    await expect(readApiError(response, "Upload failed.")).resolves.toBe(
      "Upload failed. (HTTP 413)"
    );
  });
});
