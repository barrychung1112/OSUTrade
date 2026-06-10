import { NextResponse } from "next/server";

const supportUrl = "https://buymeacoffee.com/osutrade";

function numberFromEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export async function GET() {
  const hasRaisedConfig = process.env.FUNDING_RAISED_USD !== undefined;
  const goal = numberFromEnv("FUNDING_GOAL_USD", 2000);
  const raised = hasRaisedConfig
    ? Math.min(numberFromEnv("FUNDING_RAISED_USD", 0), goal)
    : null;

  return NextResponse.json({
    raised,
    goal,
    currency: process.env.FUNDING_CURRENCY || "USD",
    supportUrl,
    progressConfigured: hasRaisedConfig,
  });
}
