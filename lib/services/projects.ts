import { createClient } from '@/lib/supabase/server';

export async function getProjects() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
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
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: projectData.name,
        repository: projectData.repository,
        status: 'healthy'
      })
      .select()
      .single();
    if (error) throw error;
    return data;
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
