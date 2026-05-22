import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { email, password, username } = await request.json();
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const normalizedUsername = String(username ?? "").trim();

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(
        {
          errorCode: "EMAIL_INVALID",
          message: "Please enter a valid email address.",
        },
        { status: 400 }
      );
    }

    if (!normalizedUsername || !password) {
      return NextResponse.json(
        {
          errorCode: "SIGNUP_FIELDS_REQUIRED",
          message: "Username, email, and password are required.",
        },
        { status: 400 }
      );
    }

    const { data: existingUser, error: userLookupError } = await supabase
      .from("users")
      .select("name")
      .eq("name", normalizedUsername)
      .maybeSingle();

    if (userLookupError) {
      throw userLookupError;
    }

    if (existingUser) {
      return NextResponse.json(
        {
          errorCode: "USERNAME_ALREADY_TAKEN",
          message: "This username is already in use. Can you rename it?",
        },
        { status: 409 }
      );
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: password,
      options: {
        data: {
          name: normalizedUsername,
        },
      },
    });

    if (error) {
      if (error.message.includes("User already registered")) {
        return NextResponse.json(
          {
            errorCode: "EMAIL_ALREADY_REGISTERED",
            message: "This email is already registered.",
          },
          { status: 409 }
        );
      }

      if (error.message.toLowerCase().includes("password should be at least")) {
        return NextResponse.json(
          {
            errorCode: "WEAK_PASSWORD",
            message:
              "Password is too weak. It must be at least 6 characters long.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          errorCode: "AUTH_ERROR",
          message: error.message,
        },
        { status: 400 }
      );
    }

    const u = data.user;

    if (!u) {
      return NextResponse.json(
        {
          status: "confirmation_required",
          email: normalizedEmail,
          name: normalizedUsername,
          message: "Please check your email to confirm your account.",
        },
        { status: 202 }
      );
    }

    return NextResponse.json(
      {
        id: u.id,
        email: u.email,
        name:
          u.user_metadata?.name ??
          u.user_metadata?.full_name ??
          u.email?.split("@")[0] ??
          "User",
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
