import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStoredGitHubToken } from "@/lib/services/github";
import { Octokit } from "@octokit/rest";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");
    if (!projectId) {
      return NextResponse.json({ error: "Missing project_id" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Load project & repository details
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

    // Fetch the repository git tree recursively
    const { data: treeData } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: branch,
      recursive: "true",
    });

    if (!treeData || !treeData.tree) {
      return NextResponse.json({ error: "Failed to load repository file tree" }, { status: 500 });
    }

    // Filter file types (blobs) and exclude irrelevant patterns
    const excludePatterns = [
      /^(node_modules|\.git|\.next|\.vercel|dist|build|coverage|\.vscode|\.idea|out|bin|obj)/i,
      /\.(png|jpe?g|gif|svg|ico|webp|mp4|webm|zip|tar\.gz|gz|rar|exe|dll|so|dylib|wasm|pdf|woff2?|ttf|otf|eot|mp3|wav|flac|ogg)$/i,
      /package-lock\.json$/,
      /yarn\.lock$/,
      /pnpm-lock\.yaml$/,
    ];

    const supportedExtensions = [
      /\.(js|ts|jsx|tsx|json|css|html|py|java|cpp|c|h|go|rs|yaml|yml|md|txt|xml|ini|conf|config|properties|sh|bash)$/i
    ];

    const filePaths = treeData.tree
      .filter((node: any) => node.type === "blob")
      .map((node: any) => node.path)
      .filter((path: string) => {
        // Exclude irrelevant folders and file types
        if (excludePatterns.some((pattern) => pattern.test(path) || path.includes('/node_modules/') || path.includes('/.git/') || path.includes('/.next/') || path.includes('/dist/') || path.includes('/build/'))) {
          return false;
        }
        // Include common text/code extensions
        return supportedExtensions.some((ext) => ext.test(path)) || !path.includes(".");
      });

    return NextResponse.json({ success: true, files: filePaths });
  } catch (error: any) {
    console.error("Error loading GitHub files list:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch files from GitHub" }, { status: 500 });
  }
}
