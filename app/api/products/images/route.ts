import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/utils/supabase/admin";

const bucketName = "product-images";
const maxImageBytes = 5 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function extensionFor(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
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

    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json(
        { message: "A product image file is required." },
        { status: 400 }
      );
    }

    if (!allowedTypes.has(image.type)) {
      return NextResponse.json(
        { message: "Only JPG, PNG, or WebP images are supported." },
        { status: 400 }
      );
    }

    if (image.size > maxImageBytes) {
      return NextResponse.json(
        { message: "Product images must be 5 MB or smaller." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const objectPath = `${session.user.id}/${crypto.randomUUID()}.${extensionFor(
      image
    )}`;
    const bytes = await image.arrayBuffer();

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(objectPath, bytes, {
        cacheControl: "3600",
        contentType: image.type,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage.from(bucketName).getPublicUrl(objectPath);

    return NextResponse.json(
      {
        imageUrl: data.publicUrl,
        path: objectPath,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to upload product image.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
