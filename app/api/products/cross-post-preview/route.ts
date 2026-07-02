import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import {
  generateCrossPostPreview,
  parseCrossPostPreviewItems,
} from "@/app/lib/crossPostPreview";

export const maxDuration = 60;

const forbiddenItemFields = [
  "contactPhone",
  "contactLineId",
  "contactWechatId",
  "sellerContact",
  "productUrl",
] as const;

function hasForbiddenPreviewFields(value: unknown) {
  if (!Array.isArray(value)) return false;

  return value.some(
    (item) =>
      item !== null &&
      typeof item === "object" &&
      forbiddenItemFields.some((field) =>
        Object.prototype.hasOwnProperty.call(item, field)
      )
  );
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "You must be logged in to preview cross-post copy." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (hasForbiddenPreviewFields(body?.items)) {
      return NextResponse.json(
        { message: "Preview items contain unsupported fields." },
        { status: 400 }
      );
    }

    const parsed = parseCrossPostPreviewItems(body?.items);
    if (parsed.ok === false) {
      return NextResponse.json({ message: parsed.message }, { status: 400 });
    }

    const result = await generateCrossPostPreview(parsed.items);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Failed to generate cross-post preview." },
      { status: 500 }
    );
  }
}
