import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/utils/supabase/admin";
import { isExpiredSentRequest, requestResponseWindowMs } from "@/app/lib/requestExpiry";
import { getAcceptedRequestProductStatus } from "@/app/lib/sellerRequestAcceptance";
import { notifyTradeEvent } from "@/app/lib/notifications";

type RequestStatus = "sent" | "accepted" | "declined" | "cancelled";
type ResponseStatus = RequestStatus | "expired";

type ProductRow = {
  product_id: string | number;
  name: string;
  name_en?: string | null;
  name_zh_tw?: string | null;
  name_zh_cn?: string | null;
  price: number;
  image_url: string | null;
  image_urls?: string[] | null;
  quantity?: number | null;
};

type RequestRow = {
  request_id: string;
  product_id: string;
  buyer_id: string;
  quantity: number;
  note: string | null;
  status: RequestStatus;
  created_at: string;
};

const requestStatuses = new Set<RequestStatus>([
  "sent",
  "accepted",
  "declined",
  "cancelled",
]);

function normalizeImageUrls(imageUrls?: string[] | null, imageUrl?: string | null) {
  const urls = Array.isArray(imageUrls)
    ? imageUrls.filter((url) => typeof url === "string" && url.trim())
    : [];
  if (urls.length > 0) return urls;
  return imageUrl ? [imageUrl] : [];
}

async function getEmailByUserId(userId: string | null | undefined) {
  if (!userId) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error) {
    throw error;
  }

  return data.user?.email ?? null;
}

async function safeNotifyTradeEvent(
  args: Parameters<typeof notifyTradeEvent>[0]
) {
  try {
    await notifyTradeEvent(args);
  } catch (error) {
    console.error("Failed to create trade notification.", error);
  }
}

async function safeGetEmailByUserId(userId: string | null | undefined) {
  try {
    return await getEmailByUserId(userId);
  } catch (error) {
    console.error("Failed to load notification recipient email.", error);
    return null;
  }
}

function toSellerRequest(
  row: RequestRow,
  product?: ProductRow,
  buyerEmail?: string | null
) {
  const status: ResponseStatus = isExpiredSentRequest(row) ? "expired" : row.status;
  const imageUrls = product
    ? normalizeImageUrls(product.image_urls, product.image_url)
    : [];

  return {
    id: row.request_id,
    itemId: row.product_id,
    buyerId: row.buyer_id,
    buyerEmail: status === "accepted" ? buyerEmail ?? null : null,
    quantity: row.quantity,
    note: row.note ?? "",
    status,
    createdAt: row.created_at,
    product: product
      ? {
          id: product.product_id,
          name: product.name,
          nameTranslations: {
            en: product.name_en ?? product.name,
            zhTw: product.name_zh_tw ?? product.name,
            zhCn: product.name_zh_cn ?? product.name,
          },
          price: product.price,
          imageUrl: imageUrls[0] ?? null,
          imageUrls,
          quantity: product.quantity ?? 1,
        }
      : null,
  };
}

async function getSellerProducts(sellerId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("seller_id", sellerId);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "You must be logged in to view seller requests." },
        { status: 401 }
      );
    }

    const products = await getSellerProducts(session.user.id);
    const productIds = products.map((product) => String(product.product_id));

    if (productIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("trade_requests")
      .select("request_id, product_id, buyer_id, quantity, note, status, created_at")
      .in("product_id", productIds)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const productsById = new Map(
      products.map((product) => [String(product.product_id), product])
    );
    const buyerEmailById = new Map<string, string | null>();

    for (const request of data ?? []) {
      if (request.status !== "accepted") continue;
      if (!buyerEmailById.has(request.buyer_id)) {
        buyerEmailById.set(
          request.buyer_id,
          await getEmailByUserId(request.buyer_id)
        );
      }
    }

    return NextResponse.json({
      data: (data ?? []).map((item) =>
        toSellerRequest(
          item,
          productsById.get(String(item.product_id)),
          buyerEmailById.get(item.buyer_id)
        )
      ),
    });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to load seller requests.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "You must be logged in to update seller requests." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const requestId = String(body.requestId ?? "").trim();
    const status = String(body.status ?? "").trim() as RequestStatus;

    if (!requestId || !requestStatuses.has(status)) {
      return NextResponse.json(
        { message: "Request id and a valid status are required." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const products = await getSellerProducts(session.user.id);
    const productIds = new Set(
      products.map((product) => String(product.product_id))
    );

    const { data: existing, error: lookupError } = await supabase
      .from("trade_requests")
      .select("request_id, product_id, quantity, status, created_at")
      .eq("request_id", requestId)
      .single();

    if (lookupError) {
      throw lookupError;
    }

    if (!productIds.has(String(existing.product_id))) {
      return NextResponse.json(
        { message: "Request not found for this seller." },
        { status: 404 }
      );
    }

    if (
      ["accepted", "declined"].includes(status) &&
      existing.status === "sent" &&
      Date.now() - new Date(existing.created_at).getTime() > requestResponseWindowMs
    ) {
      return NextResponse.json(
        { message: "This request response window has expired." },
        { status: 409 }
      );
    }

    const product = products.find(
      (item) => String(item.product_id) === String(existing.product_id)
    );

    const updatedAt = new Date().toISOString();
    let responseProduct = product;

    if (status === "accepted") {
      if (existing.status !== "sent") {
        return NextResponse.json(
          { message: "Only pending requests can be accepted." },
          { status: 409 }
        );
      }

      const availableQuantity = Number(product?.quantity ?? 1);

      if (existing.quantity > availableQuantity) {
        return NextResponse.json(
          {
            message: `Only ${availableQuantity} item(s) are available.`,
            availableQuantity,
          },
          { status: 409 }
        );
      }
    }

    const requestUpdateQuery = supabase
      .from("trade_requests")
      .update({ status, updated_at: updatedAt })
      .eq("request_id", requestId);

    if (status === "accepted") {
      requestUpdateQuery.eq("status", "sent");
    }

    const { data, error } = await requestUpdateQuery
      .select("request_id, product_id, buyer_id, quantity, note, status, created_at")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        {
          message:
            status === "accepted"
              ? "Only sent requests can be accepted."
              : "Request not found.",
        },
        { status: status === "accepted" ? 409 : 404 }
      );
    }

    if (status === "accepted") {
      const availableQuantity = Number(product?.quantity ?? 1);
      const remainingQuantity = availableQuantity - data.quantity;
      const nextProductStatus =
        getAcceptedRequestProductStatus(remainingQuantity);
      let autoDeclinedRequests: RequestRow[] = [];

      const { data: updatedProduct, error: productUpdateError } = await supabase
        .from("products")
        .update({
          quantity: remainingQuantity,
          status: nextProductStatus,
          updated_at: updatedAt,
        })
        .eq("product_id", data.product_id)
        .eq("seller_id", session.user.id)
        .eq("status", "available")
        .eq("quantity", availableQuantity)
        .gte("quantity", data.quantity)
        .select("*")
        .maybeSingle();

      if (productUpdateError) {
        const { error: revertError } = await supabase
          .from("trade_requests")
          .update({ status: "sent", updated_at: updatedAt })
          .eq("request_id", requestId)
          .eq("status", "accepted");

        if (revertError) {
          throw revertError;
        }

        throw productUpdateError;
      }

      if (!updatedProduct) {
        const { error: revertError } = await supabase
          .from("trade_requests")
          .update({ status: "sent", updated_at: updatedAt })
          .eq("request_id", requestId)
          .eq("status", "accepted");

        if (revertError) {
          throw revertError;
        }

        const { data: latestProduct, error: latestProductError } = await supabase
          .from("products")
          .select("quantity")
          .eq("product_id", data.product_id)
          .eq("seller_id", session.user.id)
          .maybeSingle();

        if (latestProductError) {
          throw latestProductError;
        }

        const latestAvailableQuantity = Number(latestProduct?.quantity ?? 0);

        return NextResponse.json(
          {
            message: `Request quantity exceeds available stock. Only ${latestAvailableQuantity} item(s) are available.`,
            availableQuantity: latestAvailableQuantity,
          },
          { status: 409 }
        );
      }

      responseProduct = updatedProduct;

      if (remainingQuantity === 0) {
        const { data: pendingRequests, error: pendingRequestsError } =
          await supabase
            .from("trade_requests")
            .select("request_id, product_id, buyer_id, quantity, note, status, created_at")
            .eq("product_id", data.product_id)
            .eq("status", "sent");

        if (pendingRequestsError) {
          throw pendingRequestsError;
        }

        autoDeclinedRequests = pendingRequests ?? [];

        const { error: declinePendingError } = await supabase
          .from("trade_requests")
          .update({ status: "declined", updated_at: updatedAt })
          .eq("product_id", data.product_id)
          .eq("status", "sent");

        if (declinePendingError) {
          throw declinePendingError;
        }

        for (const declinedRequest of autoDeclinedRequests) {
          await safeNotifyTradeEvent({
            supabase,
            input: {
              type: "request_declined",
              recipientId: declinedRequest.buyer_id,
              actorId: session.user.id,
              request: {
                id: declinedRequest.request_id,
                quantity: declinedRequest.quantity,
                note: declinedRequest.note,
              },
              product: {
                id: responseProduct.product_id,
                name: responseProduct.name,
                price: responseProduct.price,
              },
            },
            recipientEmail: await safeGetEmailByUserId(declinedRequest.buyer_id),
          });
        }
      }
    }

    const buyerEmail =
      data.status === "accepted"
        ? await getEmailByUserId(data.buyer_id)
        : data.status === "declined"
          ? await safeGetEmailByUserId(data.buyer_id)
          : null;

    if (data.status === "accepted" || data.status === "declined") {
      await safeNotifyTradeEvent({
        supabase,
        input: {
          type: data.status === "accepted" ? "request_accepted" : "request_declined",
          recipientId: data.buyer_id,
          actorId: session.user.id,
          request: {
            id: data.request_id,
            quantity: data.quantity,
            note: data.note,
          },
          product: {
            id: responseProduct?.product_id ?? data.product_id,
            name: responseProduct?.name ?? "your requested item",
            price: responseProduct?.price,
          },
        },
        recipientEmail: buyerEmail,
      });
    }

    return NextResponse.json({
      request: toSellerRequest(data, responseProduct, buyerEmail),
    });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to update seller request.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
