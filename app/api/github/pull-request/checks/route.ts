import { NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { getStoredGitHubToken } from '@/lib/services/github';
import { Octokit } from '@octokit/rest';

export async function GET(req: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch open or failed pull requests for the user
    const { data: prs, error: prsError } = await supabase
      .from('pull_requests')
      .select('*, repositories(id, owner_login, repo_name, project_id)')
      .in('status', ['open', 'failed', 'requires_attention']);

    if (prsError || !prs) {
      return NextResponse.json({ success: true, prs: [] });
    }

    // Fetch user's projects to verify ownership explicitly (defense-in-depth against RLS bypass/misconfiguration)
    const { data: userProjects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', user.id);

    if (projectsError || !userProjects) {
      return NextResponse.json({ error: 'Failed to verify project ownership' }, { status: 500 });
    }

    const ownedProjectIds = new Set(userProjects.map(p => p.id));
    const ownedPrs = prs.filter(pr => {
      const repo = pr.repositories as any;
      return repo && ownedProjectIds.has(repo.project_id);
    });

    const token = await getStoredGitHubToken(user.id, supabase);
    if (!token) {
      return NextResponse.json({ error: 'GitHub token not found' }, { status: 403 });
    }

    const octokit = new Octokit({ auth: token });
    const updatedPrs = [];

    for (const pr of ownedPrs) {
      const repo = pr.repositories as any;
      if (!repo || !repo.owner_login || !repo.repo_name) continue;

      try {
        // 1. Fetch the pull request from GitHub to get head commit SHA and latest state
        const { data: githubPR } = await octokit.pulls.get({
          owner: repo.owner_login,
          repo: repo.repo_name,
          pull_number: pr.github_pr_number,
        });

        const headSha = githubPR.head.sha;
        const currentPrState = githubPR.state; // 'open', 'closed'

        // 2. Fetch combined statuses (e.g. commit status API like CircleCI / older systems)
        const { data: combinedStatus } = await octokit.repos.getCombinedStatusForRef({
          owner: repo.owner_login,
          repo: repo.repo_name,
          ref: headSha,
        });

        // 3. Fetch check runs (e.g. GitHub Actions, Vercel)
        const { data: checkRunsData } = await octokit.checks.listForRef({
          owner: repo.owner_login,
          repo: repo.repo_name,
          ref: headSha,
        });

        // Determine combined check status
        let checkStatus = 'unknown';
        const allStatuses = [
          ...combinedStatus.statuses.map((s: any) => s.state), // 'success', 'failure', 'pending', 'error'
          ...checkRunsData.check_runs.map((c: any) => {
            if (c.status !== 'completed') return 'pending';
            return c.conclusion === 'success' || c.conclusion === 'neutral' || c.conclusion === 'skipped' ? 'success' : 'failure';
          })
        ];

        if (allStatuses.length > 0) {
          if (allStatuses.includes('failure') || allStatuses.includes('error')) {
            checkStatus = 'failed';
          } else if (allStatuses.includes('pending')) {
            checkStatus = 'pending';
          } else if (allStatuses.every((s: any) => s === 'success')) {
            checkStatus = 'success';
          }
        }

        // Determine the overall local PR status (strictly 'open', 'merged', or 'closed' to comply with check constraint)
        let dbStatus = pr.status;
        if (currentPrState === 'closed') {
          dbStatus = githubPR.merged ? 'merged' : 'closed';
        } else {
          dbStatus = 'open';
        }

        // Save check results back to the database if they changed
        if (pr.status !== dbStatus) {
          await supabase
            .from('pull_requests')
            .update({
              status: dbStatus
            })
            .eq('id', pr.id);
          
          pr.status = dbStatus;
        }

        updatedPrs.push({
          id: pr.id,
          title: pr.title,
          github_pr_number: pr.github_pr_number,
          status: dbStatus,
          check_status: checkStatus,
          url: pr.url,
          created_at: pr.created_at,
          repository: repo.owner_login + '/' + repo.repo_name,
          incident_id: pr.investigation_id,
        });

      } catch (err) {
        console.error(`Failed to fetch status for PR #${pr.github_pr_number}:`, err);
        updatedPrs.push({
          id: pr.id,
          title: pr.title,
          github_pr_number: pr.github_pr_number,
          status: pr.status,
          check_status: 'unknown',
          url: pr.url,
          created_at: pr.created_at,
          repository: repo.owner_login + '/' + repo.repo_name,
          incident_id: pr.investigation_id,
        });
      }
    }

    return NextResponse.json({ success: true, prs: updatedPrs });
  } catch (error: any) {
    console.error('Error fetching PR check status:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
