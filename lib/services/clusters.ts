import type { SupabaseClient } from '@supabase/supabase-js';
import type { Cluster, Topic } from '@/types/db';

export async function listClustersByBoard(
  sb: SupabaseClient,
  boardId: string,
): Promise<(Cluster & { topics: Topic[] })[]> {
  const { data, error } = await sb
    .from('clusters')
    .select('*, topics(*)')
    .eq('board_id', boardId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as (Cluster & { topics: Topic[] })[];
}

export async function createCluster(
  sb: SupabaseClient,
  input: { id: string; boardId: string; title: string },
): Promise<void> {
  const { error } = await sb
    .from('clusters')
    .insert({ id: input.id, board_id: input.boardId, title: input.title });
  if (error?.message) throw error;
}

export async function deleteCluster(
  sb: SupabaseClient,
  clusterId: string,
): Promise<void> {
  const { error } = await sb.from('clusters').delete().eq('id', clusterId);
  if (error) throw error;
}
