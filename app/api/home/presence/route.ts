import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

const cookieName = "osutrade_presence";
const activeWindowMinutes = 5;

async function countWithSupabase(sessionId: string) {
  const supabase = createAdminClient();
  const seenAt = new Date().toISOString();
  const activeSince = new Date(Date.now() - activeWindowMinutes * 60_000).toISOString();

  await supabase
    .from("user_presence")
    .delete()
    .lt("last_seen_at", activeSince);

  const { error: upsertError } = await supabase.from("user_presence").upsert(
    {
      session_id: sessionId,
      last_seen_at: seenAt,
    },
    { onConflict: "session_id" }
  );

  if (upsertError) {
    throw upsertError;
  }

  const { count, error } = await supabase
    .from("user_presence")
    .select("session_id", { count: "exact", head: true })
    .gte("last_seen_at", activeSince);

  if (error) {
    throw error;
  }

  return count ?? 1;
}

export async function POST(request: NextRequest) {
  const existingSessionId = request.cookies.get(cookieName)?.value;
  const sessionId = existingSessionId || randomUUID();
  let onlineUsers = 1;

  try {
    onlineUsers = await countWithSupabase(sessionId);
  } catch (error) {
    console.warn("Presence fallback used:", error);
  }

  const response = NextResponse.json({
    onlineUsers,
    activeWindowMinutes,
  });

  response.cookies.set(cookieName, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: activeWindowMinutes * 60,
    path: "/",
  });

  return response;
}
