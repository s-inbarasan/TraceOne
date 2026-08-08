import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseClient, saveStoredGitHubToken, verifyGitHubToken } from "@/lib/services/github";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    let supabase: any;

    if (authHeader) {
      supabase = getSupabaseClient(authHeader);
    } else {
      supabase = await createClient();
    }

    if (!supabase) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const providerToken = body.provider_token;

    if (!providerToken) {
      return NextResponse.json({ error: "Missing provider_token" }, { status: 400 });
    }

    const verification = await verifyGitHubToken(providerToken);
    if (!verification.valid) {
      return NextResponse.json({ error: verification.error || "Invalid GitHub token" }, { status: 400 });
    }

    const saved = await saveStoredGitHubToken(user.id, providerToken, supabase);
    if (!saved) {
      return NextResponse.json({ error: "Failed to persist GitHub token in database" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: verification.user
    });
  } catch (error: any) {
    console.error("Error connecting GitHub token:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
