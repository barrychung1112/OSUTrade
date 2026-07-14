import { NextResponse } from "next/server";
import { runVectorMatchBatch } from "@/app/lib/vectorBatch";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

async function runCron(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const result = await runVectorMatchBatch({
    supabase: createAdminClient(),
  });

  return NextResponse.json(
    { data: result },
    { status: result.status === "completed" ? 200 : 500 }
  );
}

export async function GET(request: Request) {
  return runCron(request);
}

export async function POST(request: Request) {
  return runCron(request);
}
