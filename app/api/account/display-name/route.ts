import { NextResponse } from "next/server";
import {
  escapeDisplayNameLike,
  normalizeDisplayName,
} from "@/app/lib/displayName";
import { getAccountAccessErrorResponse } from "@/utils/auth/accountAccessResponse";
import { requireActiveUser } from "@/utils/auth/requireActiveUser";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET() {
  try {
    const session = await requireActiveUser();
    const { data: profile, error } = await createAdminClient()
      .from("users")
      .select("name")
      .eq("id", session.user.id)
      .maybeSingle();

    if (error || !profile?.name?.trim()) {
      throw error ?? new Error("Public user profile was not found.");
    }

    return NextResponse.json({ data: { name: profile.name } }, { status: 200 });
  } catch (error) {
    const accessResponse = getAccountAccessErrorResponse(
      error,
      "You must be logged in to read your display name."
    );
    if (accessResponse) return accessResponse;

    console.error("Failed to read display name.", error);
    return NextResponse.json(
      { message: "Could not read your display name." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireActiveUser();
    const body = (await request.json().catch(() => null)) as {
      name?: unknown;
    } | null;
    const result = normalizeDisplayName(body?.name);

    if ("error" in result) {
      return NextResponse.json(
        { message: "Display names must be between 2 and 32 characters." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: duplicate, error: duplicateError } = await admin
      .from("users")
      .select("id")
      .ilike("name", escapeDisplayNameLike(result.value))
      .neq("id", session.user.id)
      .maybeSingle();

    if (duplicateError) throw duplicateError;
    if (duplicate) {
      return NextResponse.json(
        { message: "That display name is already in use." },
        { status: 409 }
      );
    }

    const { data: updatedProfile, error: profileError } = await admin
      .from("users")
      .update({ name: result.value, updated_at: new Date().toISOString() })
      .eq("id", session.user.id)
      .select("id,name")
      .single();

    if (profileError || !updatedProfile) {
      throw profileError ?? new Error("Public user profile was not found.");
    }

    const { error: authError } = await admin.auth.admin.updateUserById(
      session.user.id,
      {
        user_metadata: { name: result.value, full_name: result.value },
      }
    );
    if (authError) throw authError;

    return NextResponse.json(
      { data: { name: updatedProfile.name } },
      { status: 200 }
    );
  } catch (error) {
    const accessResponse = getAccountAccessErrorResponse(
      error,
      "You must be logged in to update your display name."
    );
    if (accessResponse) return accessResponse;

    console.error("Failed to update display name.", error);
    return NextResponse.json(
      { message: "Could not update your display name." },
      { status: 500 }
    );
  }
}
