import { createClient } from '@/lib/supabase/server';
import { fetchRepoBranchAndCommit, getStoredGitHubToken } from '@/lib/services/github';

export async function getProjects() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    let query = supabase
      .from('projects')
      .select('*, repositories(*), incidents(count)')
      .order('created_at', { ascending: false });

    if (user?.id) {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching projects:', err);
    return [];
  }
}

export async function createProject(projectData: { name: string; repository: string }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('You must be logged in to create a project');
    }

    const repositoryFullName = projectData.repository.trim();

    // 1. Check if user already has a project linked to this repository in repositories table
    const { data: existingRepo } = await supabase
      .from('repositories')
      .select('id, project_id, full_name, projects!inner(id, name, user_id)')
      .eq('full_name', repositoryFullName)
      .eq('projects.user_id', user.id)
      .maybeSingle();

    if (existingRepo && (existingRepo as any).projects) {
      const projName = (existingRepo as any).projects.name;
      throw new Error(`This repository (${repositoryFullName}) is already linked to project "${projName}".`);
    }

    // 2. Generate clean unique slug
    const cleanRepoSlug = repositoryFullName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const slug = `github-${cleanRepoSlug}-${Date.now().toString(36)}`;

    // 3. Insert project record with ONLY valid projects columns: user_id, name, slug
    const { data: project, error: projError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: projectData.name,
        slug,
      })
      .select()
      .single();

    if (projError || !project) {
      throw new Error(projError?.message || 'Failed to create project in database');
    }

    // 4. Fetch repo branch and commit details if token is available
    let repoInfo: any = null;
    try {
      const token = await getStoredGitHubToken(user.id, supabase);
      if (token) {
        repoInfo = await fetchRepoBranchAndCommit(token, repositoryFullName);
      }
    } catch (syncErr) {
      console.warn('Non-blocking error during initial repo sync:', syncErr);
    }

    const parts = repositoryFullName.split('/');
    const ownerLogin = repoInfo?.owner_login || parts[0] || 'unknown';
    const repoNamePart = repoInfo?.repo_name || parts[1] || repositoryFullName;
    const githubId = repoInfo?.github_id || Math.floor(Math.random() * 100000000);

    // 5. Create linked repository record
    const { data: repoRecord, error: repoInsertErr } = await supabase
      .from('repositories')
      .insert({
        project_id: project.id,
        github_id: githubId,
        full_name: repoInfo?.full_name || repositoryFullName,
        owner_login: ownerLogin,
        repo_name: repoNamePart,
        default_branch: repoInfo?.default_branch || 'main',
        latest_commit_sha: repoInfo?.latest_commit_sha || null,
        latest_commit_message: repoInfo?.latest_commit_message || null,
        last_synced_at: repoInfo ? new Date().toISOString() : null,
        html_url: repoInfo?.html_url || `https://github.com/${repositoryFullName}`,
      })
      .select()
      .single();

    if (repoInsertErr) {
      console.error('Error inserting repository record:', repoInsertErr);
    }

    return {
      ...project,
      repositories: repoRecord ? [repoRecord] : [],
    };
  } catch (err) {
    console.error('Error creating project:', err);
    throw err;
  }
}

export async function updateProject(id: string, updates: { name?: string }) {
  try {
    const supabase = await createClient();
    const allowedUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.name) allowedUpdates.name = updates.name;

    const { data, error } = await supabase
      .from('projects')
      .update(allowedUpdates)
      .eq('id', id)
      .select('*, repositories(*)')
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error(`Error updating project ${id}:`, err);
    throw err;
  }
}

export async function deleteProject(id: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error(`Error deleting project ${id}:`, err);
    throw err;
  }
}
