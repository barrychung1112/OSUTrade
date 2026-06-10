import { NextResponse } from "next/server";
import {
  authenticateWithPassword,
  AuthLoginError,
} from "@/utils/auth/passwordLogin";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const user = await authenticateWithPassword(
      String(email ?? ""),
      String(password ?? "")
    );

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    if (error instanceof AuthLoginError) {
      return NextResponse.json(
        { errorCode: error.code, message: error.message },
        { status: error.status }
      );
    }

    console.error(error);
    return NextResponse.json(
      { message: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
