import { createClient } from "@supabase/supabase-js";

const bucketName = "product-images";
const maxImageBytes = 5 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export type UploadedProductImage = {
  path: string;
  token: string;
  publicUrl: string;
};

export class ProductImageUploadError extends Error {
  constructor(
    message: string,
    readonly uploadedImages: UploadedProductImage[]
  ) {
    super(message);
    this.name = "ProductImageUploadError";
  }
}

type Fetcher = typeof fetch;
type SignedUploader = (
  path: string,
  token: string,
  file: File
) => Promise<void>;

type DirectUploadOptions = {
  maxFiles: number;
  fetcher?: Fetcher;
  uploadToSignedUrl?: SignedUploader;
};

function imageLimitMessage(maxFiles: number) {
  return `You can upload up to ${maxFiles} ${maxFiles === 1 ? "image" : "images"}.`;
}

export function validateProductImageFiles(files: File[], maxFiles: number) {
  if (files.length === 0) {
    throw new Error("At least one image is required.");
  }

  if (files.length > maxFiles) {
    throw new Error(imageLimitMessage(maxFiles));
  }

  for (const file of files) {
    if (!allowedTypes.has(file.type)) {
      throw new Error("Only JPG, PNG, or WebP images are supported.");
    }

    if (file.size > maxImageBytes) {
      throw new Error("Images must be 5 MB or smaller.");
    }
  }
}

export async function readApiError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null);
  if (payload && typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  return `${fallback} (HTTP ${response.status})`;
}

function isSignedProductImageUpload(
  value: unknown
): value is UploadedProductImage {
  if (!value || typeof value !== "object") return false;
  const upload = value as Record<string, unknown>;
  return (
    typeof upload.path === "string" &&
    upload.path.length > 0 &&
    typeof upload.token === "string" &&
    upload.token.length > 0 &&
    typeof upload.publicUrl === "string" &&
    upload.publicUrl.length > 0
  );
}

export async function requestSignedProductImageUploads(
  files: File[],
  fetcher: Fetcher = fetch
) {
  const response = await fetcher("/api/products/images/sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      files: files.map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
      })),
    }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Failed to prepare image upload."));
  }

  const payload = (await response.json().catch(() => null)) as {
    uploads?: unknown;
  } | null;
  const uploads = Array.isArray(payload?.uploads) ? payload.uploads : [];

  if (
    uploads.length !== files.length ||
    !uploads.every(isSignedProductImageUpload)
  ) {
    throw new Error("The image upload could not be prepared. Please try again.");
  }

  return uploads;
}

function createDefaultSignedUploader(): SignedUploader {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase public credentials are not configured.");
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return async (path, token, file) => {
    const { error } = await supabase.storage
      .from(bucketName)
      .uploadToSignedUrl(path, token, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (error) throw error;
  };
}

export async function uploadProductImagesDirect(
  files: File[],
  options: DirectUploadOptions
) {
  validateProductImageFiles(files, options.maxFiles);

  const fetcher = options.fetcher ?? fetch;
  const uploads = await requestSignedProductImageUploads(files, fetcher);

  const uploadToSignedUrl =
    options.uploadToSignedUrl ?? createDefaultSignedUploader();
  const uploadedImages: UploadedProductImage[] = [];
  for (let index = 0; index < files.length; index += 1) {
    try {
      await uploadToSignedUrl(
        uploads[index].path,
        uploads[index].token,
        files[index]
      );
      uploadedImages.push(uploads[index]);
    } catch {
      throw new ProductImageUploadError(
        `Failed to upload "${files[index].name}". Please try again.`,
        uploadedImages
      );
    }
  }

  return uploads;
}

export async function deleteProductImages(
  paths: string[],
  fetcher: Fetcher = fetch
) {
  if (paths.length === 0) return;

  const response = await fetcher("/api/products/images", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ paths }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Failed to remove product images."));
  }
}
