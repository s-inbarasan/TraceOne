import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export function getSupabaseClient(accessToken?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
  
  if (accessToken) {
    return createClient(url, key, {
      global: { headers: { Authorization: accessToken.startsWith('Bearer ') ? accessToken : `Bearer ${accessToken}` } }
    });
  }
  return null;
}

export async function getGitHubProviderId(supabaseClient: any) {
  try {
    const { data: provider } = await supabaseClient
      .from('providers')
      .select('id')
      .or('name.eq.GitHub,name.eq.github')
      .maybeSingle();

    if (provider?.id) return provider.id;

    const { data: newProvider } = await supabaseClient
      .from('providers')
      .upsert({ name: 'GitHub', base_url: 'https://api.github.com' }, { onConflict: 'name' })
      .select('id')
      .maybeSingle();

    if (newProvider?.id) return newProvider.id;

    // Fallback search
    const { data: fallback } = await supabaseClient
      .from('providers')
      .select('id')
      .ilike('base_url', '%github.com%')
      .maybeSingle();

    return fallback?.id || null;
  } catch (err) {
    console.error('Error in getGitHubProviderId:', err);
    return null;
  }
}

export async function getStoredGitHubToken(userId: string, supabaseClient: any) {
  try {
    if (!userId || !supabaseClient) return null;

    // 1. Try api_keys table
    const providerId = await getGitHubProviderId(supabaseClient);
    if (providerId) {
      const { data: keyRow } = await supabaseClient
        .from('api_keys')
        .select('encrypted_key, access_token')
        .eq('user_id', userId)
        .eq('provider_id', providerId)
        .maybeSingle();

      if (keyRow?.encrypted_key || keyRow?.access_token) {
        return keyRow.encrypted_key || keyRow.access_token;
      }
    }

    // 2. Fallback: try github_connections table if present
    const { data: connRow } = await supabaseClient
      .from('github_connections')
      .select('access_token')
      .eq('user_id', userId)
      .maybeSingle();

    if (connRow?.access_token) {
      return connRow.access_token;
    }

    return null;
  } catch (err) {
    console.error('Error fetching stored GitHub token:', err);
    return null;
  }
}

export async function saveStoredGitHubToken(userId: string, token: string, supabaseClient: any, userEmail?: string) {
  try {
    if (!userId || !token || !supabaseClient) return false;

    // Ensure user row exists in public.users to satisfy foreign key constraint
    const { data: userExists } = await supabaseClient
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!userExists) {
      const emailToUse = userEmail || `${userId}@user.supabase.internal`;
      await supabaseClient.from('users').upsert(
        {
          id: userId,
          email: emailToUse,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    }

    // 1. Upsert into api_keys table
    const providerId = await getGitHubProviderId(supabaseClient);
    if (providerId) {
      const { error } = await supabaseClient
        .from('api_keys')
        .upsert(
          {
            user_id: userId,
            provider_id: providerId,
            encrypted_key: token,
            access_token: token,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id, provider_id' }
        );

      if (error) {
        console.warn('Warning upserting api_keys:', error.message);
      }
    }

    // 2. Also try upsert into github_connections table if present
    try {
      const verification = await verifyGitHubToken(token);
      if (verification.valid && verification.user) {
        await supabaseClient.from('github_connections').upsert(
          {
            user_id: userId,
            github_user_id: verification.user.id,
            github_username: verification.user.login,
            github_email: verification.user.email || userEmail || null,
            access_token: token,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      }
    } catch (gcErr) {
      // Ignore if github_connections table doesn't exist yet
    }

    return true;
  } catch (err) {
    console.error('Error saving GitHub token:', err);
    return false;
  }
}

export async function verifyGitHubToken(token: string) {
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Trace-One-App',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return { valid: false, status: res.status, error: 'Invalid or expired GitHub token' };
    }

    const user = await res.json();
    return {
      valid: true,
      user: {
        login: user.login,
        id: user.id,
        name: user.name || user.login,
        avatar_url: user.avatar_url,
        html_url: user.html_url,
        email: user.email,
        public_repos: user.public_repos,
        total_private_repos: user.total_private_repos,
      },
    };
  } catch (err: any) {
    return { valid: false, status: 500, error: err.message || 'GitHub API error' };
  }
}

export async function fetchGitHubUserRepos(token: string) {
  try {
    const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated&type=all', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Trace-One-App',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`GitHub API error (${res.status}): ${errorText}`);
    }

    const rawRepos = await res.json();
    return rawRepos.map((r: any) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      owner_login: r.owner?.login,
      owner_avatar: r.owner?.avatar_url,
      private: r.private,
      description: r.description || '',
      default_branch: r.default_branch || 'main',
      html_url: r.html_url,
      language: r.language || 'TypeScript',
      updated_at: r.updated_at,
    }));
  } catch (err: any) {
    console.error('Error fetching repos from GitHub:', err);
    throw err;
  }
}

export async function fetchRepoBranchAndCommit(token: string, fullName: string) {
  try {
    const [owner, repo] = fullName.split('/');
    if (!owner || !repo) throw new Error('Invalid repository full_name format. Expected owner/repo');

    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Trace-One-App',
      },
      cache: 'no-store',
    });

    if (!repoRes.ok) {
      throw new Error(`Failed to fetch repo details from GitHub (${repoRes.status})`);
    }

    const repoData = await repoRes.json();
    const defaultBranch = repoData.default_branch || 'main';

    const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${defaultBranch}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Trace-One-App',
      },
      cache: 'no-store',
    });

    let latestCommitSha = '';
    let latestCommitMessage = '';

    if (commitRes.ok) {
      const commitData = await commitRes.json();
      latestCommitSha = commitData.sha || '';
      latestCommitMessage = commitData.commit?.message || '';
    }

    return {
      github_id: repoData.id,
      full_name: repoData.full_name,
      owner_login: owner,
      repo_name: repo,
      default_branch: defaultBranch,
      latest_commit_sha: latestCommitSha,
      latest_commit_message: latestCommitMessage,
      description: repoData.description || '',
      html_url: repoData.html_url,
      private: repoData.private,
    };
  } catch (err: any) {
    console.error('Error fetching repo branch and commit:', err);
    throw err;
  }
}

import { Octokit } from '@octokit/rest';

export async function createGitHubPullRequest(token: string, owner: string, repo: string, branchName: string, title: string, body: string, files: { path: string; content: string }[], baseBranch: string) {
  const octokit = new Octokit({ auth: token });
  
  // 1. Get the latest commit of the base branch
  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${baseBranch}`,
  });
  const latestCommitSha = refData.object.sha;
  
  // 2. Get the base tree
  const { data: commitData } = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: latestCommitSha,
  });
  const baseTreeSha = commitData.tree.sha;
  
  // 3. Create blobs for the files
  const tree = await Promise.all(
    files.map(async (file) => {
      const { data: blobData } = await octokit.git.createBlob({
        owner,
        repo,
        content: file.content,
        encoding: 'utf-8',
      });
      return {
        path: file.path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: blobData.sha,
      };
    })
  );
  
  // 4. Create a new tree
  const { data: newTree } = await octokit.git.createTree({
    owner,
    repo,
    base_tree: baseTreeSha,
    tree,
  });
  
  // 5. Create a new commit
  const { data: newCommit } = await octokit.git.createCommit({
    owner,
    repo,
    message: title,
    tree: newTree.sha,
    parents: [latestCommitSha],
  });
  
  // 6. Create a new branch (ref)
  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: newCommit.sha,
  });
  
  // 7. Create the pull request
  const { data: prData } = await octokit.pulls.create({
    owner,
    repo,
    title,
    body,
    head: branchName,
    base: baseBranch,
  });
  
  return prData;
}
