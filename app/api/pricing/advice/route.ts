import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/utils/supabase/admin";

type ComparablePrice = {
  source: "supabase" | "amazon";
  name: string;
  price: number;
  url?: string;
};

type PricingAdvice = {
  suggestedPrice: number;
  minPrice: number;
  maxPrice: number;
  confidence: "low" | "medium" | "high";
  summary: string;
  signals: string[];
  supabaseComparables: ComparablePrice[];
  amazonComparables: ComparablePrice[];
  agentTrace: string[];
};

const fallbackRatios: Record<string, number> = {
  electronics: 0.65,
  books: 0.55,
  clothing: 0.45,
  home: 0.5,
  general: 0.5,
};

function roundPrice(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.max(1, Math.round(value));
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function percentile(values: number[], ratio: number) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(ratio * sorted.length)));
  return sorted[index];
}

async function querySupabaseSimilarProducts({
  category,
  name,
  description,
}: {
  category: string;
  name: string;
  description?: string;
}): Promise<ComparablePrice[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("products")
    .select("name, description, price, effective_price, category, status, quantity")
    .eq("category", category)
    .gt("price", 0)
    .limit(12);

  if (name.trim()) {
    const firstTerm =
      `${name} ${description ?? ""}`.trim().split(/\s+/)[0] ?? "";
    if (firstTerm.length >= 3) {
      query = query.ilike("name", `%${firstTerm}%`);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row: any) => ({
      source: "supabase" as const,
      name: String(row.name ?? "Similar item"),
      price: Number(row.effective_price ?? row.price),
    }))
    .filter((item) => Number.isFinite(item.price) && item.price > 0);
}

function parseAmazonPrices(html: string, searchUrl: string): ComparablePrice[] {
  const prices = [...html.matchAll(/\$([0-9]{1,4}(?:,[0-9]{3})?(?:\.[0-9]{2})?)/g)]
    .map((match) => Number(match[1].replace(",", "")))
    .filter((price) => Number.isFinite(price) && price > 0 && price < 10000);

  const uniquePrices = [...new Set(prices)].slice(0, 5);
  return uniquePrices.map((price, index) => ({
    source: "amazon" as const,
    name: `Amazon new-price signal ${index + 1}`,
    price,
    url: searchUrl,
  }));
}

async function amazonPricingSubAgent(name: string): Promise<ComparablePrice[]> {
  if (!name.trim()) return [];

  const searchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(name.trim())}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(searchUrl, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) return [];

    const html = await response.text();
    return parseAmazonPrices(html, searchUrl);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function ruleBasedPricingAdvisor({
  category,
  supabaseComparables,
  amazonComparables,
}: {
  category: string;
  supabaseComparables: ComparablePrice[];
  amazonComparables: ComparablePrice[];
}): PricingAdvice {
  const usedPrices = supabaseComparables.map((item) => item.price);
  const newPrices = amazonComparables.map((item) => item.price);
  const usedMedian = median(usedPrices);
  const newMedian = median(newPrices);
  const usedLow = percentile(usedPrices, 0.25);
  const usedHigh = percentile(usedPrices, 0.75);
  const resaleRatio = fallbackRatios[category] ?? fallbackRatios.general;

  const anchor =
    usedMedian ??
    (newMedian ? newMedian * resaleRatio : null) ??
    (category === "books" ? 20 : category === "electronics" ? 60 : 30);

  const suggestedPrice = roundPrice(anchor);
  const minPrice = roundPrice(usedLow ?? suggestedPrice * 0.85);
  const maxPrice = roundPrice(usedHigh ?? suggestedPrice * 1.15);
  const confidence =
    usedPrices.length >= 5 ? "high" : usedPrices.length >= 2 || newPrices.length >= 2 ? "medium" : "low";

  return {
    suggestedPrice,
    minPrice: Math.min(minPrice, suggestedPrice),
    maxPrice: Math.max(maxPrice, suggestedPrice),
    confidence,
    summary:
      usedMedian !== null
        ? `Suggested from the median of ${usedPrices.length} similar OSUTrade listing${usedPrices.length === 1 ? "" : "s"}.`
        : newMedian !== null
          ? "Suggested from Amazon new-price signals with a secondhand resale discount."
          : "Suggested from category defaults because few comparable prices were available.",
    signals: [
      `${usedPrices.length} similar OSUTrade price signal${usedPrices.length === 1 ? "" : "s"}`,
      `${newPrices.length} Amazon new-price signal${newPrices.length === 1 ? "" : "s"}`,
      `Category resale ratio: ${Math.round(resaleRatio * 100)}%`,
    ],
    supabaseComparables,
    amazonComparables,
    agentTrace: [
      "Tool: queried Supabase for same-category OSUTrade listing prices.",
      "Sub-agent: searched Amazon for new-price signals.",
      "Advisor agent: combined used-market and new-price signals into a pricing range.",
    ],
  };
}

async function openAiPricingAdvisor(input: {
  name: string;
  description: string;
  category: string;
  supabaseComparables: ComparablePrice[];
  amazonComparables: ComparablePrice[];
}): Promise<PricingAdvice | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const fallback = ruleBasedPricingAdvisor(input);
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_PRICING_MODEL || "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "You are a pricing advisor for a campus secondhand marketplace. Return concise JSON only.",
          },
          {
            role: "user",
            content: JSON.stringify({
              itemName: input.name,
              itemDescription: input.description,
              category: input.category,
              comparableUsedPrices: input.supabaseComparables,
              amazonNewPriceSignals: input.amazonComparables,
              fallback,
              instructions:
                "Return JSON with suggestedPrice, minPrice, maxPrice, confidence, summary, and signals. Use USD integer prices.",
            }),
          },
        ],
        text: {
          format: {
            type: "json_object",
          },
        },
      }),
    });

    if (!response.ok) return null;

    const payload = await response.json();
    const text = payload.output_text || payload.output?.[0]?.content?.[0]?.text;
    if (!text) return null;

    const parsed = JSON.parse(text);
    return {
      ...fallback,
      suggestedPrice: roundPrice(Number(parsed.suggestedPrice)),
      minPrice: roundPrice(Number(parsed.minPrice)),
      maxPrice: roundPrice(Number(parsed.maxPrice)),
      confidence: ["low", "medium", "high"].includes(parsed.confidence)
        ? parsed.confidence
        : fallback.confidence,
      summary: String(parsed.summary || fallback.summary),
      signals: Array.isArray(parsed.signals)
        ? parsed.signals.map(String).slice(0, 5)
        : fallback.signals,
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "You must be logged in to get pricing advice." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim();
    const category = String(body.category ?? "general").trim() || "general";

    if (!name) {
      return NextResponse.json(
        { message: "Item name is required for pricing advice." },
        { status: 400 }
      );
    }

    const [supabaseComparables, amazonComparables] = await Promise.all([
      querySupabaseSimilarProducts({ category, name, description }),
      amazonPricingSubAgent(`${name} ${description}`.trim()),
    ]);

    const openAiAdvice = await openAiPricingAdvisor({
      name,
      description,
      category,
      supabaseComparables,
      amazonComparables,
    });

    const advice =
      openAiAdvice ??
      ruleBasedPricingAdvisor({
        category,
        supabaseComparables,
        amazonComparables,
      });

    return NextResponse.json(advice);
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to generate pricing advice.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
