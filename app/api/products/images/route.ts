import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/utils/supabase/admin";

const bucketName = "product-images";
const maxImageBytes = 5 * 1024 * 1024;
const maxImages = 3;
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
    const images = formData
      .getAll("images")
      .filter((value): value is File => value instanceof File);
    const legacyImage = formData.get("image");
    if (images.length === 0 && legacyImage instanceof File) {
      images.push(legacyImage);
    }

    if (images.length === 0) {
      return NextResponse.json(
        { message: "At least one product image file is required." },
        { status: 400 }
      );
    }

    if (images.length > maxImages) {
      return NextResponse.json(
        { message: `You can upload up to ${maxImages} product images.` },
        { status: 400 }
      );
    }

    for (const image of images) {
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
    }

    const supabase = createAdminClient();
    const uploadedImages = [];

    for (const image of images) {
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
      uploadedImages.push({
        imageUrl: data.publicUrl,
        path: objectPath,
      });
    }

    const imageUrls = uploadedImages.map((image) => image.imageUrl);
    const paths = uploadedImages.map((image) => image.path);

    return NextResponse.json(
      {
        imageUrl: imageUrls[0],
        imageUrls,
        path: paths[0],
        paths,
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
