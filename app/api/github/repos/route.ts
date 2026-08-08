import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
    
    // We need to bypass RLS to read api_keys if we only have anon key, but we have the user's access token!
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get GitHub provider ID
    const { data: providers } = await supabase.from('providers').select('id').eq('name', 'GitHub').single();
    if (!providers) {
      return NextResponse.json({ error: "GitHub provider not found" }, { status: 500 });
    }

    // Get user's GitHub API key
    const { data: apiKey } = await supabase.from('api_keys').select('encrypted_key').eq('user_id', user.id).eq('provider_id', providers.id).single();
    
    if (!apiKey?.encrypted_key) {
      return NextResponse.json({ error: "GitHub not connected" }, { status: 400 });
    }

    const token = apiKey.encrypted_key;

    // Fetch repos from GitHub API
    const res = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("GitHub API error:", errorText);
      return NextResponse.json({ error: "Failed to fetch repositories from GitHub" }, { status: res.status });
    }

    const repos = await res.json();
    return NextResponse.json({ repos });
  } catch (error: any) {
    console.error("Error fetching GitHub repos:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
