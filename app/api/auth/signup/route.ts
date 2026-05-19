// File: app/auth/signup/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    // The request body still sends "username" as per your API spec
    const { email, password, username } = await request.json(); // awit means all procee should wait untill this completes

    // Requirement: 400 Validation error for email domain
    if (!email || !email.endsWith("@oregonstate.edu")) {
      return NextResponse.json(
        {
          errorCode: "EMAIL_DOMAIN_INVALID",
          message: "Only @oregonstate.edu emails are allowed.",
        },
        { status: 400 }
      );
    }

    // Requirement: 409 Conflict for username
    // We check the 'users' table and the 'name' column.
    const { data: existingUser } = await supabase
      .from("users")
      .select("name")
      .eq("name", username)
      .single();

    if (existingUser) {
      return NextResponse.json(
        {
          errorCode: "USERNAME_ALREADY_TAKEN",
          message: "This username is already in use. Can you rename it?",
        },
        { status: 409 }
      );
    }

    // Attempt to sign up the user. Check duplicate email, enough long password
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          // Pass the 'username' from the request as 'name' in the metadata. We can use this name when i create table automatically
          name: username,
        },
      },
    });

    // Requirement: 409 Conflict for email (handled by Supabase)
    if (error) {
      // Check if a email is not duplicate email
      if (error.message.includes("User already registered")) {
        return NextResponse.json(
          {
            errorCode: "EMAIL_ALREADY_REGISTERED",
            message: "This email is already registered.",
          },
          { status: 409 }
        );
      }

      // Check if a passward is long enough, which means it's more than 6 characters
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
          message: error.message, // Rerurn original messgage from Supabase
        },
        { status: 400 }
      );
    }
    const u = data.user;
    // Requirement: 200 Sign-up successful
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
    // Handle unexpected server errors
    console.error(e);
    return NextResponse.json(
      { message: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
