import { NextResponse } from "next/server";
import { requireActiveUser } from "@/utils/auth/requireActiveUser";
import { getAccountAccessErrorResponse } from "@/utils/auth/accountAccessResponse";
import { createAdminClient } from "@/utils/supabase/admin";
import { getUnreadCount, toNotification } from "@/app/lib/notificationPresenter";

export async function GET() {
  try {
    const session = await requireActiveUser();

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("notifications")
      .select(
        "notification_id, type, title, body, request_id, product_id, payload, read_at, created_at"
      )
      .eq("recipient_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    const rows = data ?? [];

    return NextResponse.json({
      data: rows.map(toNotification),
      unreadCount: getUnreadCount(rows),
    });
  } catch (error) {
    const accessResponse = getAccountAccessErrorResponse(error, "You must be logged in to view notifications.");
    if (accessResponse) return accessResponse;

    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to load notifications.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireActiveUser();

    const body = await request.json();
    const notificationId = String(body.notificationId ?? "").trim();
    const markAllRead = Boolean(body.markAllRead);
    const now = new Date().toISOString();
    const supabase = createAdminClient();

    let query = supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("recipient_id", session.user.id)
      .is("read_at", null);

    if (!markAllRead) {
      if (!notificationId) {
        return NextResponse.json(
          { message: "Notification id is required." },
          { status: 400 }
        );
      }
      query = query.eq("notification_id", notificationId);
    }

    const { error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const accessResponse = getAccountAccessErrorResponse(error, "You must be logged in to update notifications.");
    if (accessResponse) return accessResponse;

    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to update notifications.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
