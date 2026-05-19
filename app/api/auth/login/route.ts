import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  // call POST when htto request with post
  try {
    const { email, password } = await request.json(); // JavaScript Object Notation

    // Check email and password are not blank
    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required." },
        { status: 400 } // 400 stands for client error
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      //signInWithPassword returns { data: { ... }, error: null } if successes
      email,
      password,
    });

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        return NextResponse.json(
          {
            errorCode: "INVALID_CREDENTIALS",
            message: "The email or password you entered is incorrect.",
          },
          { status: 401 } // 401 stands for Unauthorized
        );
      }

      if (error.message.includes("Email not confirmed")) {
        return NextResponse.json(
          {
            errorCode: "UNCONFIRMED_EMAIL",
            message: "Please confirm your email address before logging in.",
          },
          { status: 403 } // 403 stands for Unauthorized
        );
      }

      return NextResponse.json(
        { message: error.message },
        { status: error.status || 500 }
      ); // 500 stands for internal server error
    }

    const u = data.user;
    // ✅ 回傳 NextAuth 需要的 user 形狀（至少含 id）
    return NextResponse.json(
      {
        id: u.id,
        email: u.email,
        name: u.user_metadata?.full_name ?? u.email?.split("@")[0] ?? "User",
        role: u.user_metadata?.role ?? "user",
      },
      { status: 200 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
