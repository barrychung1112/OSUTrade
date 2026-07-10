import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  normalizeWantedRequestInput,
  type WantedRequestRow,
  type WantedRequestStatus,
} from "@/app/lib/wantedRequests";

const editableStatuses = new Set<WantedRequestStatus>([
  "active",
  "paused",
  "fulfilled",
]);

function toWantedRequest(row: WantedRequestRow) {
  return {
    id: row.wanted_request_id,
    userId: row.user_id,
    query: row.query,
    maxPrice: row.max_price === null ? null : Number(row.max_price),
    category: row.category ?? null,
    description: row.description ?? "",
    emailSubscribed: row.email_subscribed,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function requireUser() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET() {
  try {
    const userId = await requireUser();
    if (!userId) {
      return NextResponse.json(
        { message: "You must be logged in to view wanted items." },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("wanted_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      data: (data ?? [])
        .filter((row: WantedRequestRow) => row.status !== "deleted")
        .map(toWantedRequest),
    });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to load wanted items.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUser();
    if (!userId) {
      return NextResponse.json(
        { message: "You must be logged in to create wanted items." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const normalized = normalizeWantedRequestInput(body);
    if (!normalized.ok) {
      return NextResponse.json({ message: normalized.message }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("wanted_requests")
      .insert({
        user_id: userId,
        ...normalized.values,
        status: "active",
      })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ data: toWantedRequest(data) }, { status: 201 });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to create wanted item.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await requireUser();
    if (!userId) {
      return NextResponse.json(
        { message: "You must be logged in to update wanted items." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const id = String(body.id ?? "").trim();
    if (!id) {
      return NextResponse.json(
        { message: "Wanted item id is required." },
        { status: 400 }
      );
    }

    const values: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (Object.prototype.hasOwnProperty.call(body, "query")) {
      const normalized = normalizeWantedRequestInput(body);
      if (!normalized.ok) {
        return NextResponse.json({ message: normalized.message }, { status: 400 });
      }
      Object.assign(values, normalized.values);
    } else {
      if (Object.prototype.hasOwnProperty.call(body, "emailSubscribed")) {
        values.email_subscribed = body.emailSubscribed === false ? false : true;
      }
      if (Object.prototype.hasOwnProperty.call(body, "status")) {
        const status = String(body.status ?? "").trim() as WantedRequestStatus;
        if (!editableStatuses.has(status)) {
          return NextResponse.json(
            { message: "Invalid wanted item status." },
            { status: 400 }
          );
        }
        values.status = status;
      }
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("wanted_requests")
      .update(values)
      .eq("wanted_request_id", id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ data: toWantedRequest(data) });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to update wanted item.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await requireUser();
    if (!userId) {
      return NextResponse.json(
        { message: "You must be logged in to delete wanted items." },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const id = String(url.searchParams.get("id") ?? "").trim();
    if (!id) {
      return NextResponse.json(
        { message: "Wanted item id is required." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("wanted_requests")
      .update({ status: "deleted", updated_at: new Date().toISOString() })
      .eq("wanted_request_id", id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ data: toWantedRequest(data) });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to delete wanted item.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
