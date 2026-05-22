import type { SupabaseClient } from '@supabase/supabase-js';
import type { Project } from '@/types/db';

const TABLE = 'projects';

export async function listProjects(
  sb: SupabaseClient,
  userId: string,
): Promise<Project[]> {
  const { data, error } = await sb
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Project[];
}

export async function createProject(
  sb: SupabaseClient,
  input: { userId: string; name: string; description?: string },
): Promise<Project> {
  const { error: insertError } = await sb.from(TABLE).insert({
    user_id: input.userId,
    name: input.name,
    description: input.description ?? null,
  });
  if (insertError?.message) throw insertError;

  const { data, error: selectError } = await sb
    .from(TABLE)
    .select('*')
    .eq('user_id', input.userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (selectError?.message) throw selectError;
  return data as Project;
}

export async function renameProject(
  sb: SupabaseClient,
  projectId: string,
  name: string,
): Promise<void> {
  const { error } = await sb.from(TABLE).update({ name }).eq('id', projectId);
  if (error) throw error;
}

export async function deleteProject(
  sb: SupabaseClient,
  projectId: string,
): Promise<void> {
  // Boards in this project have ON DELETE SET NULL → they become unfiled, not deleted.
  const { error } = await sb.from(TABLE).delete().eq('id', projectId);
  if (error) throw error;
}
