import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/utils/supabase/admin";
import { isOwnedProductImagePath } from "@/app/lib/productImagePath";

const bucketName = "product-images";
const maxImageBytes = 10 * 1024 * 1024;
const maxImages = 3;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function validateProductImages(images: File[]) {
  for (const image of images) {
    if (!allowedTypes.has(image.type)) {
      return "Only JPG, PNG, or WebP images are supported.";
    }

    if (image.size > maxImageBytes) {
      return "Product images must be 10 MB or smaller.";
    }
  }

  return null;
}

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

    const validationError = validateProductImages(images);
    if (validationError) {
      return NextResponse.json(
        { message: validationError },
        { status: 400 }
      );
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

export async function DELETE(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "You must be logged in to remove product images." },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => null)) as {
      paths?: unknown;
    } | null;
    const paths = body?.paths;

    if (
      !Array.isArray(paths) ||
      paths.length === 0 ||
      paths.length > 10 ||
      !paths.every(
        (path): path is string =>
          typeof path === "string" &&
          isOwnedProductImagePath(path, session.user.id)
      )
    ) {
      return NextResponse.json(
        { message: "Invalid product image paths." },
        { status: 400 }
      );
    }

    const uniquePaths = [...new Set(paths)];
    const supabase = createAdminClient();
    const bucket = supabase.storage.from(bucketName);
    const images = uniquePaths.map((path) => ({
      path,
      publicUrl: bucket.getPublicUrl(path).data.publicUrl,
    }));
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("image_url,image_urls")
      .eq("seller_id", session.user.id);

    if (productsError) throw productsError;

    const referencedUrls = new Set<string>();
    for (const product of products ?? []) {
      if (typeof product.image_url === "string") {
        referencedUrls.add(product.image_url);
      }
      if (Array.isArray(product.image_urls)) {
        product.image_urls.forEach((url: unknown) => {
          if (typeof url === "string") referencedUrls.add(url);
        });
      }
    }

    const removablePaths = images
      .filter((image) => !referencedUrls.has(image.publicUrl))
      .map((image) => image.path);
    if (removablePaths.length === 0) {
      return NextResponse.json(
        { removed: 0, preserved: uniquePaths.length },
        { status: 200 }
      );
    }

    const { data, error } = await bucket.remove(removablePaths);

    if (error) throw error;

    return NextResponse.json(
      {
        removed: data?.length ?? 0,
        preserved: uniquePaths.length - removablePaths.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to remove product images", error);
    return NextResponse.json(
      { message: "Failed to remove product images. Please try again." },
      { status: 500 }
    );
  }
}
