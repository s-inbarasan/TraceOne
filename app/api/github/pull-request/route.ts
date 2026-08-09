import { NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { getStoredGitHubToken } from '@/lib/services/github';
import { Octokit } from '@octokit/rest';

function parseDiffMetrics(diffText: string) {
  let insertions = 0;
  let deletions = 0;
  const lines = diffText.split('\n');
  for (const line of lines) {
    if (line.startsWith('--- ') || line.startsWith('+++ ') || line.startsWith('@@ ')) {
      continue;
    }
    if (line.startsWith('+')) {
      insertions++;
    } else if (line.startsWith('-')) {
      deletions++;
    }
  }
  return { insertions, deletions };
}

function isValidUUID(str?: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, branch_name, title, description, files, investigation_id } = await req.json();

    if (!project_id || !branch_name || !title || !files || files.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Verify / resolve project owned by authenticated user
    let projectRecord: any = null;

    if (isValidUUID(project_id)) {
      const { data: pById } = await supabase
        .from('projects')
        .select('*')
        .eq('id', project_id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (pById) projectRecord = pById;
    }

    if (!projectRecord) {
      const { data: pBySlug } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', project_id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (pBySlug) projectRecord = pBySlug;
    }

    if (!projectRecord) {
      const slugVal = String(project_id);
      const nameVal = slugVal.startsWith('github-')
        ? slugVal.replace('github-', '').replace('-', '/')
        : 'Project';

      const insertPayload: any = {
        name: nameVal,
        slug: slugVal,
        user_id: user.id,
        source_type: 'github'
      };

      if (isValidUUID(project_id)) {
        insertPayload.id = project_id;
      }

      const { data: newProj } = await supabase
        .from('projects')
        .insert(insertPayload)
        .select('*')
        .maybeSingle();

      if (newProj) {
        projectRecord = newProj;
      } else {
        const { data: fallbackProj } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fallbackProj) {
          projectRecord = fallbackProj;
        } else {
          return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }
      }
    }

    const realProjectId = projectRecord.id;

    // 2. Verify / resolve repository exists for this project
    let repoRecord: any = null;

    const { data: repoFetch } = await supabase
      .from('repositories')
      .select('id, github_id, full_name, owner_login, repo_name, default_branch')
      .eq('project_id', realProjectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (repoFetch) {
      repoRecord = repoFetch;
    } else {
      const cleanSlug = (projectRecord.slug || projectRecord.name || 'owner/repo').replace('github-', '');
      const parts = cleanSlug.split('/');
      const ownerLogin = parts[0] || 'owner';
      const repoNamePart = parts[1] || parts[0] || 'repo';
      const fullName = `${ownerLogin}/${repoNamePart}`;

      const { data: newRepo } = await supabase
        .from('repositories')
        .insert({
          project_id: realProjectId,
          github_id: Math.floor(Math.random() * 100000000),
          full_name: fullName,
          owner_login: ownerLogin,
          repo_name: repoNamePart,
          default_branch: 'main',
          html_url: `https://github.com/${fullName}`
        })
        .select('id, github_id, full_name, owner_login, repo_name, default_branch')
        .single();

      if (newRepo) {
        repoRecord = newRepo;
      } else {
        return NextResponse.json({ error: 'Repository not found for this project' }, { status: 404 });
      }
    }

    // 3. Verify repository metadata is complete (owner_login and repo_name)
    if (!repoRecord.owner_login || !repoRecord.repo_name) {
      return NextResponse.json({ error: 'GitHub repository metadata is incomplete' }, { status: 400 });
    }

    const owner = repoRecord.owner_login;
    const repo = repoRecord.repo_name;
    const defaultBranch = repoRecord.default_branch || 'main';

    // 4. Verify investigation exists
    if (!investigation_id) {
      return NextResponse.json({ error: 'Investigation not found' }, { status: 404 });
    }

    const { data: investigationRecord, error: investigationError } = await supabase
      .from('investigations')
      .select('id, incident_id')
      .eq('id', investigation_id)
      .maybeSingle();

    if (investigationError || !investigationRecord) {
      return NextResponse.json({ error: 'Investigation not found' }, { status: 404 });
    }

    // Verify investigation's associated incident belongs to the project
    if (investigationRecord.incident_id) {
      const { data: incidentRecord, error: incidentError } = await supabase
        .from('incidents')
        .select('id, project_id')
        .eq('id', investigationRecord.incident_id)
        .maybeSingle();

      if (incidentRecord && incidentRecord.project_id !== realProjectId) {
        return NextResponse.json({ error: 'Unauthorized: Investigation does not belong to your project' }, { status: 403 });
      }
    }

    // 5. Verify patch exists
    const { data: patchRecord, error: patchError } = await supabase
      .from('patches')
      .select('id, repository_id, investigation_id, file_path, original_content, updated_content, unified_diff, explanation')
      .eq('investigation_id', investigation_id)
      .maybeSingle();

    if (patchError || !patchRecord) {
      return NextResponse.json({ error: 'Patch not found' }, { status: 404 });
    }

    // Verify patch repository matches the selected repository UUID (repositories.id)
    if (patchRecord.repository_id !== repoRecord.id) {
      return NextResponse.json({ error: 'Patch repository mismatch' }, { status: 400 });
    }

    // Verify patch investigation matches the investigation ID
    if (patchRecord.investigation_id !== investigation_id) {
      return NextResponse.json({ error: 'Patch investigation mismatch' }, { status: 400 });
    }

    // 6. Verify GitHub connection exists and retrieve the token
    const token = await getStoredGitHubToken(user.id, supabase);
    if (!token) {
      return NextResponse.json({ error: 'GitHub connection not found' }, { status: 403 });
    }

    // 7. PATCH VALIDATION GATE
    const targetFile = files[0];
    if (!targetFile.path) {
      return NextResponse.json({ error: 'Security validation failed: Target file path is missing.' }, { status: 400 });
    }

    // A. Ensure only the intended file(s) are modified and prevent path traversal
    for (const file of files) {
      if (file.path.includes('..') || file.path.startsWith('/') || file.path.startsWith('\\')) {
        return NextResponse.json({ 
          error: `Security validation failed: Path traversal or invalid characters detected in file path '${file.path}'.` 
        }, { status: 400 });
      }
      if (file.path !== patchRecord.file_path) {
        return NextResponse.json({ 
          error: `Security validation failed: Attempted modification to unintended file path '${file.path}' (expected only '${patchRecord.file_path}').` 
        }, { status: 400 });
      }
    }

    // B. Reject changes to secrets, .env files, credentials, keys, or other sensitive files
    const lowerPath = patchRecord.file_path.toLowerCase();
    const isSensitive = 
      lowerPath.includes('.env') ||
      lowerPath.includes('secret') ||
      lowerPath.includes('credential') ||
      lowerPath.includes('token') ||
      lowerPath.includes('id_rsa') ||
      lowerPath.endsWith('.pem') ||
      lowerPath.endsWith('.key') ||
      lowerPath.includes('api_key') ||
      lowerPath.includes('private_key');

    if (isSensitive) {
      return NextResponse.json({ 
        error: `Security validation failed: Modification to sensitive file '${patchRecord.file_path}' is strictly forbidden.` 
      }, { status: 400 });
    }

    const octokit = new Octokit({ auth: token });

    // C. Verify target file exists on GitHub and fetch its current content + SHA immediately (preventing stale patches)
    let gitHubFileContent = '';
    let gitHubFileSha = '';
    try {
      const { data: fileData } = await octokit.repos.getContent({
        owner,
        repo,
        path: targetFile.path,
        ref: defaultBranch,
      }) as any;

      if (fileData.type === 'file') {
        gitHubFileContent = Buffer.from(fileData.content, 'base64').toString('utf8');
        gitHubFileSha = fileData.sha;
      } else {
        return NextResponse.json({ error: `Security validation failed: Path '${targetFile.path}' on GitHub is a directory, not a file.` }, { status: 400 });
      }
    } catch (err: any) {
      console.error('Target file verification failed on GitHub:', err);
      return NextResponse.json({ 
        error: `Security validation failed: Target file '${targetFile.path}' does not exist on base branch '${defaultBranch}' of the GitHub repository.` 
      }, { status: 400 });
    }

    // D. Verify the original file used by the AI still matches the current GitHub version
    if (patchRecord.original_content !== gitHubFileContent) {
      return NextResponse.json({ 
        error: `Patch validation failed: The original file '${targetFile.path}' has been modified on GitHub since the AI generated this patch. Please run a fresh investigation to apply a safe patch.` 
      }, { status: 400 });
    }

    // E. Validate that original_content, updated_content, and unified_diff are internally consistent
    if (patchRecord.original_content === targetFile.content) {
      return NextResponse.json({ 
        error: 'Patch validation failed: Original content and proposed modified content are identical (no changes to apply).' 
      }, { status: 400 });
    }

    if (targetFile.content !== patchRecord.updated_content) {
      return NextResponse.json({ 
        error: 'Patch validation failed: The submitted modified content does not match the AI-generated patch content stored in our database.' 
      }, { status: 400 });
    }

    // F. Reject patches where the modified content is empty unless the AI explicitly intends file deletion
    const originalLength = patchRecord.original_content?.length || 0;
    const updatedLength = targetFile.content?.length || 0;

    if (updatedLength === 0 && originalLength > 0) {
      const isDeletionIntended = 
        (patchRecord.explanation || '').toLowerCase().includes('delete') || 
        title.toLowerCase().includes('delete');
      if (!isDeletionIntended) {
        return NextResponse.json({ 
          error: 'Patch validation failed: Suspicious empty modified content detected. The patch would completely clear the file, but file deletion was not explicitly intended.' 
        }, { status: 400 });
      }
    }

    // G. Detect suspicious whole-file replacement/deletion or huge diffs using relative thresholds
    const origLines = (patchRecord.original_content || "").split(/\r?\n/);
    const updatedLines = (targetFile.content || "").split(/\r?\n/);

    // Overlap Check (Detect whole-file replacement)
    let matchingLineCount = 0;
    const origLineSet = new Set(origLines.map(l => l.trim()));
    for (const line of updatedLines) {
      if (origLineSet.has(line.trim())) {
        matchingLineCount++;
      }
    }

    if (origLines.length > 5 && matchingLineCount === 0) {
      return NextResponse.json({ 
        error: 'Patch validation failed: Suspicious whole-file replacement detected. The modified file shares zero lines with the original file.' 
      }, { status: 400 });
    }

    // Diff metrics verification
    const { insertions, deletions } = parseDiffMetrics(patchRecord.unified_diff || '');

    // Compare AI's claimed changes against actual generated diff (e.g., small change vs large diff)
    const explanationText = (patchRecord.explanation || '').toLowerCase();
    const isClaimedSmall = 
      explanationText.includes('small') || 
      explanationText.includes('minor') || 
      explanationText.includes('one line') || 
      explanationText.includes('single line') || 
      explanationText.includes('typo') || 
      explanationText.includes('simple');

    if (isClaimedSmall && (insertions + deletions > 15)) {
      return NextResponse.json({ 
        error: `Patch validation failed: AI claims a small/minor change, but the actual generated diff contains ${insertions} insertions and ${deletions} deletions. This discrepancy indicates an incorrect patch generation.` 
      }, { status: 400 });
    }

    // Reject unexpectedly large diffs using relative thresholds (Do NOT use arbitrary line-count limits)
    const origLineCount = origLines.length;
    if (origLineCount > 20) {
      const totalChanges = insertions + deletions;
      const ratio = totalChanges / origLineCount;
      if (ratio > 0.8 && totalChanges > 40) {
        return NextResponse.json({ 
          error: `Patch validation failed: Proposed patch modifies ${Math.round(ratio * 100)}% of the file (${totalChanges} changes on ${origLineCount} lines). Legitimate fixes should be targeted and precise, not full-file rewrites.` 
        }, { status: 400 });
      }
    }

    // H. Prevent duplicate/concurrent PR creation (Check both database and live GitHub API)
    const { data: existingPR, error: existingPRError } = await supabase
      .from('pull_requests')
      .select('id, url, status')
      .eq('investigation_id', investigation_id)
      .eq('status', 'open')
      .maybeSingle();

    if (!existingPRError && existingPR) {
      return NextResponse.json({ success: true, url: existingPR.url, message: 'An open Pull Request already exists for this investigation.' });
    }

    try {
      // Fetch open pull requests in the repository to scan for matching investigation_id in description body
      const { data: openPRs } = await octokit.pulls.list({
        owner,
        repo,
        state: 'open',
        per_page: 50,
      });

      // Search for any PR with the investigation_id comment or branch name match
      const matchedPR = openPRs.find(p => 
        (p.body && p.body.includes(`investigation_id: ${investigation_id}`)) ||
        (p.head && p.head.ref === branch_name)
      );

      if (matchedPR) {
        // Ensure metadata in database is in sync
        const { data: dbPR } = await supabase
          .from('pull_requests')
          .select('id, url')
          .eq('investigation_id', investigation_id)
          .maybeSingle();

        if (!dbPR) {
          await supabase.from('pull_requests').insert({
            investigation_id: investigation_id,
            repository_id: repoRecord.id, // repositories.id UUID, not github_id
            github_pr_id: matchedPR.id,
            github_pr_number: matchedPR.number,
            title: matchedPR.title,
            description: matchedPR.body,
            branch_name: matchedPR.head.ref,
            status: 'open',
            url: matchedPR.html_url
          });
        }

        return NextResponse.json({ 
          success: true, 
          url: matchedPR.html_url, 
          message: 'An open Pull Request already exists for this investigation.' 
        });
      }
    } catch (err) {
      console.warn('Could not scan open pull requests for duplicates on GitHub:', err);
    }

    // Perform Git operations to create real branch, commit, and PR on GitHub
    
    // Step A: Fetch base ref
    let latestCommitSha: string;
    try {
      const { data: refData } = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${defaultBranch}`,
      });
      latestCommitSha = refData.object.sha;
    } catch (err: any) {
      console.error('Failed to get base ref:', err);
      return NextResponse.json({ error: 'Base branch could not be resolved' }, { status: 400 });
    }

    // Step B: Resolve base commit/tree
    let baseTreeSha: string;
    try {
      const { data: commitData } = await octokit.git.getCommit({
        owner,
        repo,
        commit_sha: latestCommitSha,
      });
      baseTreeSha = commitData.tree.sha;
    } catch (err: any) {
      console.error('Failed to get base commit/tree:', err);
      return NextResponse.json({ error: 'Base branch could not be resolved' }, { status: 400 });
    }

    // Step C: Create blobs & Apply file modifications
    let newTreeSha: string;
    try {
      const tree = await Promise.all(
        files.map(async (file: { path: string; content: string }) => {
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

      const { data: newTree } = await octokit.git.createTree({
        owner,
        repo,
        base_tree: baseTreeSha,
        tree,
      });
      newTreeSha = newTree.sha;
    } catch (err: any) {
      console.error('Failed to create tree with updated files:', err);
      return NextResponse.json({ error: 'Failed to update repository file' }, { status: 500 });
    }

    // Step D: Create commit
    let newCommitSha: string;
    try {
      const { data: newCommit } = await octokit.git.createCommit({
        owner,
        repo,
        message: title,
        tree: newTreeSha,
        parents: [latestCommitSha],
      });
      newCommitSha = newCommit.sha;
    } catch (err: any) {
      console.error('Failed to create commit:', err);
      return NextResponse.json({ error: 'Failed to create commit' }, { status: 500 });
    }

    // Step E: Create branch (ref)
    try {
      await octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branch_name}`,
        sha: newCommitSha,
      });
    } catch (err: any) {
      console.error('Failed to create ref/branch:', err);
      const errMessage = err.message || '';
      if (err.status === 422 || errMessage.includes('already exists')) {
        // A concurrent or previous request already created this branch.
        // Let's check if a PR already exists on GitHub for this head branch to prevent duplicates.
        try {
          const { data: openPRs } = await octokit.pulls.list({
            owner,
            repo,
            state: 'open',
            head: `${owner}:${branch_name}`,
            base: defaultBranch,
          });

          if (openPRs && openPRs.length > 0) {
            const existingGitHubPR = openPRs[0];
            
            // Sync with DB
            const { data: dbPR } = await supabase
              .from('pull_requests')
              .select('id, url')
              .eq('investigation_id', investigation_id)
              .maybeSingle();

            if (!dbPR) {
              await supabase.from('pull_requests').insert({
                investigation_id: investigation_id,
                repository_id: repoRecord.id,
                github_pr_id: existingGitHubPR.id,
                github_pr_number: existingGitHubPR.number,
                title: existingGitHubPR.title,
                description: existingGitHubPR.body,
                branch_name: branch_name,
                status: 'open',
                url: existingGitHubPR.html_url
              });
            }

            return NextResponse.json({ 
              success: true, 
              url: existingGitHubPR.html_url, 
              message: 'An open Pull Request already exists for this branch.' 
            });
          }
        } catch (listErr) {
          console.error('Failed to list open pull requests during recovery:', listErr);
        }
      }
      return NextResponse.json({ error: 'Failed to create branch. It might already exist or the repository is in an invalid state.' }, { status: 500 });
    }

    // Step F: Create the real GitHub Pull Request
    let prData: any;
    try {
      const prBody = `${description || ''}\n\n<!-- investigation_id: ${investigation_id} -->`;
      const { data } = await octokit.pulls.create({
        owner,
        repo,
        title,
        body: prBody,
        head: branch_name,
        base: defaultBranch,
      });
      prData = data;
    } catch (err: any) {
      console.error('Failed to create Pull Request:', err);
      // Clean up reference on failure
      try {
        await octokit.git.deleteRef({
          owner,
          repo,
          ref: `heads/${branch_name}`,
        });
      } catch (cleanErr) {
        console.warn('Could not clean up ref after failed PR:', cleanErr);
      }
      return NextResponse.json({ error: 'GitHub Pull Request creation failed' }, { status: 500 });
    }

    // Save metadata of successfully created PR to local database table `pull_requests`
    const { data: prRecord, error: prInsertError } = await supabase
      .from('pull_requests')
      .insert({
        investigation_id: investigation_id,
        repository_id: repoRecord.id, // repositories.id UUID, not github_id
        github_pr_id: prData.id,
        github_pr_number: prData.number,
        title: prData.title,
        description: prData.body,
        branch_name: branch_name,
        status: 'open',
        url: prData.html_url
      })
      .select()
      .single();

    if (prInsertError) {
      console.warn('Warning: Failed to save PR to local database, but GitHub PR was created:', prInsertError);
    }

    return NextResponse.json({ success: true, url: prData.html_url, pr: prRecord });

  } catch (error: any) {
    console.error('Error creating PR:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
