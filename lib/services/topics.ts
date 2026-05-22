import type { SupabaseClient } from '@supabase/supabase-js';
import type { Topic } from '@/types/db';

/**
 * Phase 3 stores each cluster's content as a single row in `topics`. The slot
 * fillers from the ask flow (explain/eli5/fact/images/videos) update fields of
 * that single row, so we upsert by cluster_id.
 */
export async function ensureTopicForCluster(
  sb: SupabaseClient,
  clusterId: string,
  title: string,
): Promise<Topic> {
  // Try to fetch existing.
  const existing = await sb
    .from('topics')
    .select('*')
    .eq('cluster_id', clusterId)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data as Topic;

  const { error: insertError } = await sb
    .from('topics')
    .insert({ cluster_id: clusterId, title });
  if (insertError?.message) throw insertError;

  const { data, error: selectError } = await sb
    .from('topics')
    .select('*')
    .eq('cluster_id', clusterId)
    .single();
  if (selectError?.message) throw selectError;
  return data as Topic;
}

type SlotUpdate =
  | { slot: 'explain'; value: string }
  | { slot: 'eli5'; value: string }
  | { slot: 'fact'; value: string }
  | { slot: 'images'; value: string[] }
  | { slot: 'videos'; value: Topic['videos'] }
  | { slot: 'study_notes'; value: string };

export async function updateTopicSlot(
  sb: SupabaseClient,
  clusterId: string,
  update: SlotUpdate,
): Promise<void> {
  const column =
    update.slot === 'explain'
      ? 'explanation'
      : update.slot === 'eli5'
      ? 'eli5'
      : update.slot === 'fact'
      ? 'fact'
      : update.slot === 'images'
      ? 'images'
      : update.slot === 'videos'
      ? 'videos'
      : 'study_notes';

  const { error } = await sb
    .from('topics')
    .update({ [column]: update.value })
    .eq('cluster_id', clusterId);
  if (error) throw error;
}
