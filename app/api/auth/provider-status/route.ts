import { NextResponse } from "next/server";
import { getGoogleAuthConfig } from "@/utils/auth/googleConfig";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    google: getGoogleAuthConfig().configured,
  });
}
