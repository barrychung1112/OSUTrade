import { describe, expect, test, vi } from "vitest";
import {
  deleteProductImages,
  ProductImageUploadError,
  readApiError,
  requestSignedProductImageUploads,
  shouldPreserveUploadsAfterProductError,
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

  test("accepts images exactly 10 MB", () => {
    expect(
      validateProductImageFiles(
        [imageFile("large.jpg", "image/jpeg", 10 * 1024 * 1024)],
        10
      )
    ).toBeUndefined();
  });

  test("rejects images larger than 10 MB", () => {
    expect(() =>
      validateProductImageFiles(
        [imageFile("large.jpg", "image/jpeg", 10 * 1024 * 1024 + 1)],
        10
      )
    ).toThrow("Images must be 10 MB or smaller.");
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
  test("does not start the next upload until the previous upload finishes", async () => {
    const files = [imageFile("first.jpg"), imageFile("second.jpg")];
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          uploads: [
            {
              path: "user-id/first.jpg",
              token: "first-token",
              publicUrl: "https://project.supabase.co/first.jpg",
            },
            {
              path: "user-id/second.jpg",
              token: "second-token",
              publicUrl: "https://project.supabase.co/second.jpg",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    let finishFirstUpload!: () => void;
    const firstUpload = new Promise<void>((resolve) => {
      finishFirstUpload = resolve;
    });
    const uploadToSignedUrl = vi
      .fn()
      .mockReturnValueOnce(firstUpload)
      .mockResolvedValueOnce(undefined);

    const pending = uploadProductImagesDirect(files, {
      maxFiles: 10,
      fetcher,
      uploadToSignedUrl,
    });
    await vi.waitFor(() => expect(uploadToSignedUrl).toHaveBeenCalledTimes(1));
    expect(uploadToSignedUrl).not.toHaveBeenCalledWith(
      "user-id/second.jpg",
      "second-token",
      files[1]
    );

    finishFirstUpload();
    await pending;
    expect(uploadToSignedUrl).toHaveBeenCalledTimes(2);
  });

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

  test("identifies a later image that failed after an earlier upload succeeded", async () => {
    const files = [imageFile("good.jpg"), imageFile("damaged.jpg")];
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          uploads: [
            {
              path: "user-id/good.jpg",
              token: "good-token",
              publicUrl: "https://project.supabase.co/good.jpg",
            },
            {
              path: "user-id/damaged.jpg",
              token: "damaged-token",
              publicUrl: "https://project.supabase.co/damaged.jpg",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    let error: unknown;
    try {
      await uploadProductImagesDirect(files, {
        maxFiles: 10,
        fetcher,
        uploadToSignedUrl: vi
          .fn()
          .mockResolvedValueOnce(undefined)
          .mockRejectedValueOnce(new Error("network")),
      });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ProductImageUploadError);
    expect(error).toMatchObject({
      message: 'Failed to upload "damaged.jpg". Please try again.',
      uploadedImages: [
        expect.objectContaining({ path: "user-id/good.jpg" }),
        expect.objectContaining({ path: "user-id/damaged.jpg" }),
      ],
    });
  });
});

describe("requestSignedProductImageUploads", () => {
  test("rejects a non-array uploads payload with the stable error", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ uploads: "x" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    await expect(
      requestSignedProductImageUploads([imageFile("desk.jpg")], fetcher)
    ).rejects.toThrow("The image upload could not be prepared. Please try again.");
  });

  test("rejects malformed signed upload entries", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          uploads: [
            {
              path: "user-id/desk.jpg",
              publicUrl: "https://project.supabase.co/desk.jpg",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    await expect(
      requestSignedProductImageUploads([imageFile("desk.jpg")], fetcher)
    ).rejects.toThrow("The image upload could not be prepared. Please try again.");
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

describe("deleteProductImages", () => {
  test("requests authenticated cleanup for uploaded storage paths", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ removed: 2 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    const paths = ["seller-1/one.jpg", "seller-1/two.jpg"];

    await deleteProductImages(paths, fetcher);

    expect(fetcher).toHaveBeenCalledWith("/api/products/images", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ paths }),
    });
  });

  test("does not call cleanup when there are no paths", async () => {
    const fetcher = vi.fn();

    await deleteProductImages([], fetcher);

    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("shouldPreserveUploadsAfterProductError", () => {
  test("preserves uploads when product creation may have committed", () => {
    expect(shouldPreserveUploadsAfterProductError(null)).toBe(true);
    expect(shouldPreserveUploadsAfterProductError(200)).toBe(true);
    expect(shouldPreserveUploadsAfterProductError(201)).toBe(true);
    expect(shouldPreserveUploadsAfterProductError(500)).toBe(true);
    expect(shouldPreserveUploadsAfterProductError(502)).toBe(true);
    expect(shouldPreserveUploadsAfterProductError(400)).toBe(false);
    expect(shouldPreserveUploadsAfterProductError(401)).toBe(false);
  });
});
