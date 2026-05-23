import { NextResponse } from "next/server";

function numberFromEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export async function GET() {
  const goal = numberFromEnv("FUNDING_GOAL_USD", 2000);
  const raised = Math.min(numberFromEnv("FUNDING_RAISED_USD", 0), goal);
  const supportUrl =
    process.env.FUNDING_SUPPORT_URL || "https://buymeacoffee.com/osutrade";

  return NextResponse.json({
    raised,
    goal,
    currency: process.env.FUNDING_CURRENCY || "USD",
    supportUrl,
  });
}
