import { NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { getStoredGitHubToken, createGitHubPullRequest } from '@/lib/services/github';

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, branch_name, title, description, files } = await req.json();

    if (!project_id || !branch_name || !title || !files || files.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Load project & linked repo
    const { data: repoRecord, error: repoError } = await supabase
      .from('repositories')
      .select('id, full_name, owner_login, repo_name, default_branch, projects!inner(user_id)')
      .eq('project_id', project_id)
      .single();

    if (repoError || !repoRecord || (repoRecord as any).projects.user_id !== user.id) {
      return NextResponse.json({ error: 'Repository not found or unauthorized' }, { status: 404 });
    }

    const token = await getStoredGitHubToken(user.id, supabase);
    if (!token) {
      return NextResponse.json({ error: 'GitHub not connected' }, { status: 403 });
    }

    const owner = repoRecord.owner_login!;
    const repo = repoRecord.repo_name!;
    const defaultBranch = repoRecord.default_branch || 'main';

    // Call GitHub API to create PR
    const prData = await createGitHubPullRequest(token, owner, repo, branch_name, title, description || '', files, defaultBranch);

    // Save PR info to database
    // Assume an investigation exists, or if not we create one?
    // Wait, the schema requires investigation_id. We should pass it from client, or find the latest.
    // For now, let's just find the latest investigation for this project, or incident.
    const { data: incident } = await supabase.from('incidents').select('id').eq('project_id', project_id).order('created_at', { ascending: false }).limit(1).single();
    let investigationId = null;
    if (incident) {
       const { data: inv } = await supabase.from('investigations').select('id').eq('incident_id', incident.id).order('created_at', { ascending: false }).limit(1).single();
       if (inv) investigationId = inv.id;
    }
    
    // If we still don't have one, we can't save to pull_requests because investigation_id is NOT NULL.
    // Let's create a dummy one if missing (though the flow usually creates it).
    if (!investigationId) {
       let incidentId = incident?.id;
       if (!incidentId) {
          const { data: newInc } = await supabase.from('incidents').insert({ project_id: project_id, title: 'GitHub PR Fix', error_type: 'Manual PR' }).select('id').single();
          incidentId = newInc!.id;
       }
       const { data: newInv } = await supabase.from('investigations').insert({ incident_id: incidentId }).select('id').single();
       investigationId = newInv!.id;
    }

    const { data: prRecord, error: prInsertError } = await supabase.from('pull_requests').insert({
      investigation_id: investigationId,
      repository_id: repoRecord.id,
      github_pr_id: prData.id,
      github_pr_number: prData.number,
      title: prData.title,
      description: prData.body,
      branch_name: branch_name,
      status: 'open',
      url: prData.html_url
    }).select().single();

    if (prInsertError) {
      console.warn("Failed to save PR to database, but GitHub PR was created:", prInsertError);
    }

    return NextResponse.json({ success: true, url: prData.html_url, pr: prRecord });

  } catch (error: any) {
    console.error("Error creating PR:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
