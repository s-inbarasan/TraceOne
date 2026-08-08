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

export async function createProject(projectData: { name: string; repository: string; description?: string }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('You must be logged in to create a project');
    }

    const { data: existingProjects } = await supabase
      .from('projects')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('repository', projectData.repository);

    if (existingProjects && existingProjects.length > 0) {
      throw new Error(`This repository (${projectData.repository}) is already linked to project "${existingProjects[0].name}".`);
    }

    const slug = `github-${projectData.repository.replace('/', '-').toLowerCase()}`;

    const { data: project, error: projError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: projectData.name,
        slug,
        repository: projectData.repository,
        source_type: 'github',
        status: 'healthy',
        description: projectData.description || '',
      })
      .select()
      .single();

    if (projError || !project) {
      throw new Error(projError?.message || 'Failed to create project in database');
    }

    try {
      const token = await getStoredGitHubToken(user.id, supabase);
      if (token) {
        const repoInfo = await fetchRepoBranchAndCommit(token, projectData.repository);
        if (repoInfo) {
          await supabase.from('repositories').upsert(
            {
              project_id: project.id,
              github_id: repoInfo.github_id,
              full_name: repoInfo.full_name,
              owner_login: repoInfo.owner_login,
              repo_name: repoInfo.repo_name,
              default_branch: repoInfo.default_branch,
              latest_commit_sha: repoInfo.latest_commit_sha,
              latest_commit_message: repoInfo.latest_commit_message,
              last_synced_at: new Date().toISOString(),
              html_url: repoInfo.html_url,
            },
            { onConflict: 'project_id, github_id' }
          );
        }
      }
    } catch (syncErr) {
      console.warn('Non-blocking error during initial repo sync:', syncErr);
    }

    return project;
  } catch (err) {
    console.error('Error creating project:', err);
    throw err;
  }
}

export async function updateProject(id: string, updates: Record<string, any>) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('projects').update(updates).eq('id', id).select().single();
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
