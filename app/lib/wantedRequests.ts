import { sendEmail as defaultSendEmail, type SendEmail } from "./email";

export type WantedRequestStatus = "active" | "paused" | "fulfilled" | "deleted";

export type WantedRequestRow = {
  wanted_request_id: string;
  user_id: string;
  query: string;
  max_price?: number | string | null;
  category?: string | null;
  description?: string | null;
  email_subscribed: boolean;
  status: WantedRequestStatus | string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type WantedProductRow = {
  product_id: string | number;
  name: string;
  name_en?: string | null;
  name_zh_tw?: string | null;
  name_zh_cn?: string | null;
  description?: string | null;
  description_en?: string | null;
  description_zh_tw?: string | null;
  description_zh_cn?: string | null;
  price?: number | string | null;
  category?: string | null;
};

export type WantedMatch = {
  wantedRequestId: string;
  userId: string;
  productId: string;
  score: number;
};

export type WantedRequestInput = {
  query?: unknown;
  maxPrice?: unknown;
  category?: unknown;
  description?: unknown;
  emailSubscribed?: unknown;
};

export type WantedRequestValues = {
  query: string;
  max_price: number | null;
  category: string | null;
  description: string | null;
  email_subscribed: boolean;
};

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeSearchText(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function normalizePrice(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://osutrade.com"
  ).replace(/\/$/, "");
}

function formatPrice(value: number | string | null | undefined) {
  const numeric = normalizePrice(value) ?? 0;
  return numeric.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function queryTokens(query: string) {
  const normalized = normalizeSearchText(query);
  const parts = normalized
    .split(/[\s,;，。]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

  return Array.from(new Set([normalized, ...parts].filter(Boolean)));
}

function productSearchText(product: WantedProductRow) {
  return [
    product.name,
    product.name_en,
    product.name_zh_tw,
    product.name_zh_cn,
    product.description,
    product.description_en,
    product.description_zh_tw,
    product.description_zh_cn,
    product.category,
  ]
    .map(normalizeSearchText)
    .filter(Boolean)
    .join(" ");
}

export function normalizeWantedRequestInput(input: WantedRequestInput):
  | { ok: true; values: WantedRequestValues }
  | { ok: false; message: string } {
  const query = normalizeText(input.query);
  if (!query) {
    return { ok: false, message: "Wanted item is required." };
  }

  const maxPrice = normalizePrice(input.maxPrice);
  if (
    input.maxPrice !== null &&
    input.maxPrice !== undefined &&
    input.maxPrice !== "" &&
    (maxPrice === null || maxPrice <= 0)
  ) {
    return { ok: false, message: "Budget must be greater than 0." };
  }

  const category = normalizeText(input.category);
  const description = normalizeText(input.description);

  return {
    ok: true,
    values: {
      query,
      max_price: maxPrice,
      category: category || null,
      description: description || null,
      email_subscribed: input.emailSubscribed === false ? false : true,
    },
  };
}

export function findWantedRequestMatches(
  product: WantedProductRow,
  requests: WantedRequestRow[]
): WantedMatch[] {
  const productPrice = normalizePrice(product.price);
  const productCategory = normalizeSearchText(product.category);
  const searchable = productSearchText(product);

  return requests
    .map((request) => {
      if (request.status !== "active" || !request.email_subscribed) return null;

      const budget = normalizePrice(request.max_price);
      if (budget !== null && productPrice !== null && productPrice > budget) {
        return null;
      }

      const requestCategory = normalizeSearchText(request.category);
      if (requestCategory && requestCategory !== productCategory) return null;

      const hits = queryTokens(request.query).filter((token) =>
        searchable.includes(token)
      );

      if (hits.length === 0) return null;

      const score = hits.length + (requestCategory ? 1 : 0);
      return {
        wantedRequestId: request.wanted_request_id,
        userId: request.user_id,
        productId: String(product.product_id),
        score,
      };
    })
    .filter((match): match is WantedMatch => Boolean(match))
    .sort((left, right) => right.score - left.score);
}

export function buildWantedRequestEmail({
  wantedQuery,
  productName,
  productPrice,
  productUrl,
}: {
  wantedQuery: string;
  productName: string;
  productPrice: number | string | null | undefined;
  productUrl: string;
}) {
  return {
    subject: `[OSUTrade] New listing matches your wanted item: ${productName}`,
    text: [
      "Hi,",
      "",
      "A new OSUTrade listing may match something you wanted.",
      "",
      `Wanted item: ${wantedQuery}`,
      `Matched listing: ${productName}`,
      `Price: ${formatPrice(productPrice)}`,
      "",
      "View listing:",
      productUrl,
      "",
      "If this is no longer relevant, open your Requests page and pause or mark the wanted item as fulfilled.",
      "",
      "OSUTrade",
      "Campus secondhand marketplace",
    ].join("\n"),
  };
}

export function buildProductUrl(productId: string | number) {
  return `${getAppUrl()}/product/${productId}`;
}

type NotifyWantedMatchesOptions = {
  supabase: {
    from: (table: string) => any;
    auth?: {
      admin?: {
        getUserById: (userId: string) => Promise<{
          data: { user?: { email?: string | null } | null };
          error: Error | null;
        }>;
      };
    };
  };
  product: WantedProductRow;
  sendEmail?: SendEmail;
};

async function getEmailByUserId(
  supabase: NotifyWantedMatchesOptions["supabase"],
  userId: string
) {
  const result = await supabase.auth?.admin?.getUserById(userId);
  if (result?.error) throw result.error;
  return result?.data.user?.email ?? null;
}

export async function notifyMatchingWantedRequests({
  supabase,
  product,
  sendEmail = defaultSendEmail,
}: NotifyWantedMatchesOptions) {
  const { data: wantedRequests, error: requestError } = await supabase
    .from("wanted_requests")
    .select("*")
    .eq("status", "active")
    .eq("email_subscribed", true);

  if (requestError) throw requestError;

  const matches = findWantedRequestMatches(product, wantedRequests ?? []);
  const results: Array<{
    wantedRequestId: string;
    productId: string;
    emailed: boolean;
    emailError: string | null;
  }> = [];

  for (const match of matches) {
    const { data: matchRow, error: matchError } = await supabase
      .from("wanted_request_matches")
      .insert({
        wanted_request_id: match.wantedRequestId,
        product_id: match.productId,
        score: match.score,
      })
      .select("match_id")
      .single();

    if (matchError) {
      if (matchError.code === "23505") continue;
      throw matchError;
    }

    const wantedRequest = (wantedRequests ?? []).find(
      (request: WantedRequestRow) =>
        request.wanted_request_id === match.wantedRequestId
    );
    const productName = product.name || "New OSUTrade listing";
    let emailError: string | null = null;
    let emailed = false;

    try {
      const email = await getEmailByUserId(supabase, match.userId);
      if (email) {
        await sendEmail({
          to: email,
          ...buildWantedRequestEmail({
            wantedQuery: wantedRequest?.query ?? "your wanted item",
            productName,
            productPrice: product.price,
            productUrl: buildProductUrl(product.product_id),
          }),
        });
        emailed = true;
      }
    } catch (error) {
      emailError =
        error instanceof Error ? error.message : "Failed to send wanted email.";
    }

    await supabase
      .from("wanted_request_matches")
      .update({
        emailed_at: emailed ? new Date().toISOString() : null,
        email_error: emailError,
      })
      .eq("match_id", matchRow?.match_id);

    results.push({
      wantedRequestId: match.wantedRequestId,
      productId: match.productId,
      emailed,
      emailError,
    });
  }

  return { matches: results };
}
