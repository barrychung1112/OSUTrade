import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/utils/supabase/admin";

const bucketName = "product-images";
const maxImageBytes = 10 * 1024 * 1024;
const maxImages = 10;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

type FileMetadata = {
  name: string;
  type: string;
  size: number;
};

function extensionFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

function isFileMetadata(value: unknown): value is FileMetadata {
  if (!value || typeof value !== "object") return false;
  const file = value as Record<string, unknown>;
  return (
    typeof file.name === "string" &&
    file.name.length > 0 &&
    typeof file.type === "string" &&
    allowedTypes.has(file.type) &&
    typeof file.size === "number" &&
    Number.isFinite(file.size) &&
    file.size > 0 &&
    file.size <= maxImageBytes
  );
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "You must be logged in to upload product images." },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      files?: unknown;
    } | null;
    const files = body?.files;

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { message: "At least one product image is required." },
        { status: 400 }
      );
    }

    if (files.length > maxImages) {
      return NextResponse.json(
        { message: `You can upload up to ${maxImages} product images.` },
        { status: 400 }
      );
    }

    if (!files.every(isFileMetadata)) {
      return NextResponse.json(
        { message: "Images must be JPG, PNG, or WebP files no larger than 10 MB." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const bucket = supabase.storage.from(bucketName);
    const uploads = [];

    for (const file of files) {
      const path = `${session.user.id}/${crypto.randomUUID()}.${extensionFor(
        file.type
      )}`;
      const { data, error } = await bucket.createSignedUploadUrl(path);
      if (error || !data?.token) {
        throw error ?? new Error("Supabase did not return an upload token.");
      }

      const { data: publicData } = bucket.getPublicUrl(path);
      uploads.push({
        path,
        token: data.token,
        publicUrl: publicData.publicUrl,
      });
    }

    return NextResponse.json({ uploads }, { status: 200 });
  } catch (error) {
    console.error("Failed to sign product image upload", error);
    return NextResponse.json(
      { message: "Failed to prepare image upload. Please try again." },
      { status: 500 }
    );
  }
}
