import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchRepoBranchAndCommit, getStoredGitHubToken, getSupabaseClient } from "@/lib/services/github";

export async function POST(req: NextRequest) {
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user }, error: userError } = userResponse;
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { project_id, repository_full_name } = body;

    if (!project_id && !repository_full_name) {
      return NextResponse.json({ error: "Missing project_id or repository_full_name" }, { status: 400 });
    }

    // Get stored GitHub token
    const token = await getStoredGitHubToken(user.id, supabase);
    if (!token) {
      return NextResponse.json({ error: "GitHub account not connected", code: "NOT_CONNECTED" }, { status: 400 });
    }

    let repoFullName = repository_full_name;
    let targetProjectId = project_id;

    // If project_id provided without repoFullName, look up linked repository record
    if (project_id && !repoFullName) {
      const { data: repoRecord } = await supabase
        .from("repositories")
        .select("full_name")
        .eq("project_id", project_id)
        .maybeSingle();

      if (repoRecord) {
        repoFullName = repoRecord.full_name;
      }
    }

    if (!repoFullName) {
      return NextResponse.json({ error: "No repository associated with this project" }, { status: 400 });
    }

    // Fetch latest branch & commit details from GitHub API
    const repoInfo = await fetchRepoBranchAndCommit(token, repoFullName);

    // Save/update repository state in Supabase
    if (targetProjectId) {
      const { data: repoRecord, error: repoErr } = await supabase
        .from("repositories")
        .upsert(
          {
            project_id: targetProjectId,
            github_id: repoInfo.github_id,
            full_name: repoInfo.full_name,
            owner_login: repoInfo.owner_login,
            repo_name: repoInfo.repo_name,
            default_branch: repoInfo.default_branch,
            latest_commit_sha: repoInfo.latest_commit_sha,
            latest_commit_message: repoInfo.latest_commit_message,
            last_synced_at: new Date().toISOString(),
            html_url: repoInfo.html_url,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "project_id, github_id" }
        )
        .select()
        .single();

      if (repoErr) {
        console.error("Error upserting repository details:", repoErr);
      }

      // Also ensure project updated_at is updated
      await supabase
        .from("projects")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", targetProjectId);

      return NextResponse.json({
        success: true,
        repository: repoRecord || repoInfo,
      });
    }

    return NextResponse.json({
      success: true,
      repository: repoInfo,
    });
  } catch (error: any) {
    console.error("Error syncing repository with GitHub:", error);
    return NextResponse.json({ error: error.message || "Failed to sync repository" }, { status: 500 });
  }
}
