import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStoredGitHubToken, verifyGitHubToken, getSupabaseClient } from "@/lib/services/github";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    let supabase: any;
    
    if (authHeader) {
      supabase = getSupabaseClient(authHeader);
    } else {
      supabase = await createClient();
    }

    if (!supabase) {
      return NextResponse.json({ connected: false, reason: "UNAUTHORIZED" }, { status: 401 });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ connected: false, reason: "UNAUTHORIZED" }, { status: 401 });
    }

    let token = await getStoredGitHubToken(user.id, supabase);
    if (!token) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.provider_token) {
        token = session.provider_token;
      }
    }

    if (!token) {
      return NextResponse.json({ connected: false, reason: "NO_TOKEN" });
    }

    const verification = await verifyGitHubToken(token);
    if (!verification.valid) {
      return NextResponse.json({
        connected: false,
        reason: "EXPIRED_TOKEN",
        error: verification.error
      });
    }

    return NextResponse.json({
      connected: true,
      user: verification.user
    });
  } catch (error: any) {
    console.error("Error checking GitHub status:", error);
    return NextResponse.json({
      connected: false,
      reason: "SERVER_ERROR",
      error: error.message
    }, { status: 500 });
  }
}
