import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createBulkDraftResponseFormat,
  extractAiDraftResponseText,
  parseAiDraftResponse,
} from "@/app/lib/aiProductDrafts";
import { createAdminClient } from "@/utils/supabase/admin";

const bucketName = "product-images";
const maxImages = 10;
const openAiTimeoutMs = 20_000;

class AiProviderError extends Error {}
class AiConfigurationError extends Error {}

function isOwnedStoragePath(path: string, userId: string) {
  return (
    path.startsWith(`${userId}/`) &&
    !path.startsWith("/") &&
    !path.split("/").some((segment) => segment === ".." || segment === ".")
  );
}

async function generateAiDrafts(imageUrls: string[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AiConfigurationError("OPENAI_API_KEY is not configured.");
  }

  const imageContents = imageUrls.map((imageUrl) => ({
    type: "input_image",
    image_url: imageUrl,
    detail: "low",
  }));

  let response: Response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), openAiTimeoutMs);
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
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
              ...imageContents,
            ],
          },
        ],
        text: {
          format: createBulkDraftResponseFormat(),
        },
      }),
    });
  } catch (error) {
    console.error("OpenAI bulk draft request failed", {
      status: null,
      requestId: null,
      error: error instanceof Error ? error.message : "Network error",
    });
    throw new AiProviderError("OpenAI request failed.");
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    console.error("OpenAI bulk draft request failed", {
      status: response.status,
      requestId: response.headers.get("x-request-id"),
    });
    throw new AiProviderError("OpenAI returned an error response.");
  }

  const payload = await response.json().catch(() => null);
  if (!payload) {
    console.error("OpenAI bulk draft request failed", {
      status: response.status,
      requestId: response.headers.get("x-request-id"),
      error: "Invalid JSON response",
    });
    throw new AiProviderError("OpenAI returned invalid JSON.");
  }

  const output = Array.isArray(payload.output) ? payload.output : [];
  const hasRefusal = output.some((item: any) =>
    Array.isArray(item?.content)
      ? item.content.some((part: any) => part?.type === "refusal")
      : false
  );

  if (payload.status === "incomplete" || hasRefusal) {
    console.error("OpenAI bulk draft request failed", {
      status: response.status,
      requestId: response.headers.get("x-request-id"),
      responseStatus: payload.status ?? null,
      refused: hasRefusal,
    });
    throw new AiProviderError("OpenAI did not complete the draft response.");
  }

  const responseText = extractAiDraftResponseText(payload);
  const drafts = responseText
    ? parseAiDraftResponse(responseText, imageUrls.length)
    : [];

  if (drafts.length === 0) {
    console.error("OpenAI bulk draft request failed", {
      status: response.status,
      requestId: response.headers.get("x-request-id"),
      responseStatus: payload.status ?? null,
      error: "Missing or invalid structured output",
    });
    throw new AiProviderError("OpenAI returned invalid structured output.");
  }

  return drafts;
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

    const body = (await request.json().catch(() => null)) as {
      imagePaths?: unknown;
    } | null;
    const imagePaths = body?.imagePaths;

    if (!Array.isArray(imagePaths) || imagePaths.length === 0) {
      return NextResponse.json(
        { message: "At least one image is required." },
        { status: 400 }
      );
    }

    if (imagePaths.length > maxImages) {
      return NextResponse.json(
        { message: `You can analyze up to ${maxImages} images at a time.` },
        { status: 400 }
      );
    }

    if (
      !imagePaths.every(
        (path): path is string =>
          typeof path === "string" && isOwnedStoragePath(path, session.user.id)
      )
    ) {
      return NextResponse.json(
        { message: "Invalid product image paths." },
        { status: 400 }
      );
    }

    const uniquePaths = [...new Set(imagePaths)];
    if (uniquePaths.length !== imagePaths.length) {
      return NextResponse.json(
        { message: "Duplicate product image paths are not allowed." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const bucket = supabase.storage.from(bucketName);
    const imageUrls = imagePaths.map(
      (path) => bucket.getPublicUrl(path).data.publicUrl
    );
    const aiDrafts = await generateAiDrafts(imageUrls);

    return NextResponse.json({ drafts: aiDrafts }, { status: 200 });
  } catch (error) {
    if (error instanceof AiConfigurationError) {
      console.error("OpenAI bulk draft configuration error", error.message);
      return NextResponse.json(
        {
          code: "AI_NOT_CONFIGURED",
          message: "AI draft generation is not configured.",
        },
        { status: 503 }
      );
    }

    if (error instanceof AiProviderError) {
      return NextResponse.json(
        {
          code: "AI_PROVIDER_ERROR",
          message: "AI could not analyze these photos. Please try again.",
        },
        { status: 502 }
      );
    }

    console.error("Failed to generate bulk listing drafts", error);
    return NextResponse.json(
      { message: "Failed to generate listing drafts." },
      { status: 500 }
    );
  }
}
