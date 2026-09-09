import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isTradeMessagesEnabled } from "@/app/lib/tradeMessages";
import { issueTradeMessageRealtimeToken } from "@/app/lib/tradeMessageRealtimeToken";

const tokenLifetimeSeconds = 5 * 60;

function serviceUnavailable(message: string) {
  return NextResponse.json({ message }, { status: 503 });
}

export async function GET() {
  try {
    if (!isTradeMessagesEnabled()) {
      return NextResponse.json({ message: "Trade messages are not enabled." }, { status: 404 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "You must be logged in to connect to trade messages." },
        { status: 401 }
      );
    }

    const privateKeyPem = process.env.SUPABASE_REALTIME_JWT_PRIVATE_KEY;
    const keyId = process.env.SUPABASE_REALTIME_JWT_KEY_ID;
    const issuer = process.env.SUPABASE_REALTIME_JWT_ISSUER;
    if (!privateKeyPem || !keyId || !issuer) {
      return serviceUnavailable("Trade message realtime is not configured.");
    }

    const now = new Date();
    const token = await issueTradeMessageRealtimeToken({
      userId: session.user.id,
      privateKeyPem,
      keyId,
      issuer,
      now,
    });

    return NextResponse.json(
      {
        token,
        expiresAt: new Date(now.getTime() + tokenLifetimeSeconds * 1000).toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Failed to issue trade message realtime token.", error);
    return serviceUnavailable("Trade message realtime is temporarily unavailable.");
  }
}
