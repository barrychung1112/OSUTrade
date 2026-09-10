import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  isTradeMessagesEnabled,
  loadTradeMessageAccess,
} from "@/app/lib/tradeMessages";

type RouteContext = {
  params: Promise<{ requestId: string }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  try {
    if (!isTradeMessagesEnabled()) {
      return NextResponse.json({ message: "Trade messages are not enabled." }, { status: 404 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "You must be logged in to use trade messages." },
        { status: 401 }
      );
    }

    const { requestId } = await context.params;
    const supabase = createAdminClient();
    const access = await loadTradeMessageAccess({
      supabase,
      requestId,
      userId: session.user.id,
    });
    if (!access.allowed || !access.request || !access.product) {
      return NextResponse.json(
        { message: "You cannot access messages for this request." },
        { status: 403 }
      );
    }

    const { error } = await supabase.from("trade_message_reads").upsert(
      {
        request_id: requestId,
        user_id: session.user.id,
        last_read_at: new Date().toISOString(),
      },
      { onConflict: "request_id,user_id" }
    );
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Failed to mark messages read.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
