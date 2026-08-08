import { createClient } from '@/lib/supabase/server';

export interface IncidentFilter {
  status?: string;
  severity?: string;
  projectId?: string;
}

export async function getIncidents(filter?: IncidentFilter) {
  try {
    const supabase = await createClient();
    let query = supabase.from('incidents').select('*').order('created_at', { ascending: false });

    if (filter?.status) {
      query = query.eq('status', filter.status);
    }
    if (filter?.severity) {
      query = query.eq('severity', filter.severity);
    }
    if (filter?.projectId) {
      query = query.eq('project_id', filter.projectId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching incidents:', err);
    return [];
  }
}

export async function getIncidentById(id: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('incidents').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error(`Error fetching incident ${id}:`, err);
    return null;
  }
}

export async function updateIncident(id: string, updates: Record<string, any>) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('incidents').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error(`Error updating incident ${id}:`, err);
    throw err;
  }
}
