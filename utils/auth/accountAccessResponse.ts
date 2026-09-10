import { NextResponse } from "next/server";
import { AccountAccessError } from "@/utils/auth/requireActiveUser";

export function getAccountAccessErrorResponse(
  error: unknown,
  unauthenticatedMessage: string
) {
  if (!(error instanceof AccountAccessError)) return null;

  return NextResponse.json(
    {
      message:
        error.status === 401 ? unauthenticatedMessage : error.message,
    },
    { status: error.status }
  );
}
