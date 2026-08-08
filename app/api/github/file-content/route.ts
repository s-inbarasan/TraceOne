import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStoredGitHubToken } from "@/lib/services/github";
import { Octokit } from "@octokit/rest";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");
    const path = searchParams.get("path");

    if (!projectId || !path) {
      return NextResponse.json({ error: "Missing project_id or path" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: repoRecord, error: repoError } = await supabase
      .from("repositories")
      .select("full_name, default_branch")
      .eq("project_id", projectId)
      .maybeSingle();

    if (repoError || !repoRecord) {
      return NextResponse.json({ error: "No repository found for this project" }, { status: 404 });
    }

    const token = await getStoredGitHubToken(user.id, supabase);
    if (!token) {
      return NextResponse.json({ error: "GitHub account not connected" }, { status: 403 });
    }

    const [owner, repo] = repoRecord.full_name.split("/");
    const branch = repoRecord.default_branch || "main";

    const octokit = new Octokit({ auth: token });

    // Fetch the specific file content from GitHub
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    if (Array.isArray(data)) {
      return NextResponse.json({ error: "Path is a directory, not a file" }, { status: 400 });
    }

    if (data.type !== "file") {
      return NextResponse.json({ error: "Not a standard file" }, { status: 400 });
    }

    // If size is too large (e.g. > 1.5MB), skip/handle safely
    if (data.size && data.size > 1500000) {
      return NextResponse.json({ error: "File too large to display" }, { status: 400 });
    }

    // Decode base64 content
    const content = Buffer.from(data.content, "base64").toString("utf-8");

    return NextResponse.json({ success: true, content });
  } catch (error: any) {
    console.error("Error fetching file content from GitHub:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch file content" }, { status: 500 });
  }
}
