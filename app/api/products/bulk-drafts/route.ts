import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createBulkDraftResponseFormat,
  createFallbackDrafts,
  extractAiDraftResponseText,
  parseAiDraftResponse,
} from "@/app/lib/aiProductDrafts";

const maxImages = 10;
const maxImageBytes = 5 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

async function fileToDataUrl(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${bytes.toString("base64")}`;
}

async function generateAiDrafts(images: File[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [];

  const imageContents = await Promise.all(
    images.map(async (image, index) => ({
      type: "input_image",
      image_url: await fileToDataUrl(image),
      detail: "low",
      index,
    }))
  );

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_BULK_LISTING_MODEL || "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "You create editable product listing drafts for a campus secondhand marketplace. Return JSON only. Never publish items. If unsure, use conservative defaults and warnings.",
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text:
                  "Analyze each image as a potential sale item. Extract visible handwritten prices if present. Return JSON with key drafts. Each draft must include name, description, category, price, quantity, confidence, warnings, and imageIndexes. Categories must be one of general, electronics, clothing, books, home. Use USD prices. Keep imageIndexes zero-based.",
              },
              ...imageContents.map(({ type, image_url, detail }) => ({
                type,
                image_url,
                detail,
              })),
            ],
          },
        ],
        text: {
          format: createBulkDraftResponseFormat(),
        },
      }),
    });

    if (!response.ok) return [];

    const payload = await response.json();
    const responseText = extractAiDraftResponseText(payload);
    return responseText ? parseAiDraftResponse(responseText, images.length) : [];
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "You must be logged in to generate listing drafts." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const images = formData
      .getAll("images")
      .filter((value): value is File => value instanceof File);

    if (images.length === 0) {
      return NextResponse.json(
        { message: "At least one image is required." },
        { status: 400 }
      );
    }

    if (images.length > maxImages) {
      return NextResponse.json(
        { message: `You can analyze up to ${maxImages} images at a time.` },
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
          { message: "Images must be 5 MB or smaller." },
          { status: 400 }
        );
      }
    }

    const aiDrafts = await generateAiDrafts(images);
    const drafts =
      aiDrafts.length > 0 ? aiDrafts : createFallbackDrafts(images.length);

    return NextResponse.json({ drafts }, { status: 200 });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to generate listing drafts.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
