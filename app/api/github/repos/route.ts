import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchGitHubUserRepos, getStoredGitHubToken, getSupabaseClient, saveStoredGitHubToken, verifyGitHubToken } from "@/lib/services/github";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    let supabase: any;
    let userResponse;

    if (authHeader) {
      supabase = getSupabaseClient(authHeader);
      const token = authHeader.replace("Bearer ", "");
      userResponse = await supabase.auth.getUser(token);
    } else {
      supabase = await createClient();
      userResponse = await supabase.auth.getUser();
    }

    if (!supabase) {
      return NextResponse.json({ connected: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const { data: { user }, error: userError } = userResponse;
    console.log(`[GitHub Repos] userId: ${user?.id || "null"}`);
    
    if (userError || !user) {
      return NextResponse.json({ connected: false, error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    // 1. Try to get token from DB
    let token = await getStoredGitHubToken(user.id, supabase);

    // 2. Fallback: check session for provider_token
    if (!token) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.provider_token) {
        token = session.provider_token;
        await saveStoredGitHubToken(user.id, token, supabase, user.email);
      }
    }

    // 3. Fallback: check x-github-token header if provided
    if (!token) {
      const customGithubToken = req.headers.get("x-github-token");
      if (customGithubToken) {
        token = customGithubToken;
        await saveStoredGitHubToken(user.id, token, supabase, user.email);
      }
    }

    if (!token) {
      return NextResponse.json({
        connected: false,
        error: "GitHub account not connected. Please connect your GitHub account in Settings or sign in with GitHub.",
        code: "NOT_CONNECTED"
      }, { status: 200 });
    }

    // Verify token validity
    const verification = await verifyGitHubToken(token);
    if (!verification.valid) {
      return NextResponse.json({
        connected: false,
        error: "GitHub authorization has expired or is invalid. Please reconnect your GitHub account.",
        code: "EXPIRED_TOKEN"
      }, { status: 200 });
    }

    // Fetch real repositories from GitHub API
    const repos = await fetchGitHubUserRepos(token);

    return NextResponse.json({
      connected: true,
      github_user: verification.user,
      repos
    });
  } catch (error: any) {
    console.error("Error fetching GitHub repos:", error);
    return NextResponse.json({
      connected: false,
      error: error.message || "Failed to fetch repositories from GitHub",
      code: "GITHUB_API_ERROR"
    }, { status: 500 });
  }
}
