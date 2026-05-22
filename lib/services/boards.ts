import type { SupabaseClient } from '@supabase/supabase-js';
import type { Board, BoardFilter } from '@/types/db';

const TABLE = 'boards';

/**
 * Fetch ALL of a user's boards (active + trashed). Filtering between
 * /home /starred /trash /projects happens client-side, so we only need one fetch
 * per session.
 */
export async function listAllBoards(
  sb: SupabaseClient,
  userId: string,
): Promise<Board[]> {
  const { data, error } = await sb
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('last_opened_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Board[];
}

export function filterBoards(boards: Board[], filter: BoardFilter, search: string): Board[] {
  const q = search.trim().toLowerCase();
  return boards
    .filter((b) => {
      switch (filter.kind) {
        case 'all':
          return b.deleted_at === null;
        case 'starred':
          return b.deleted_at === null && b.starred;
        case 'trash':
          return b.deleted_at !== null;
        case 'project':
          return b.deleted_at === null && b.project_id === filter.projectId;
      }
    })
    .filter((b) => (q ? b.name.toLowerCase().includes(q) : true));
}

export async function getBoard(
  sb: SupabaseClient,
  boardId: string,
): Promise<Board | null> {
  const { data, error } = await sb.from(TABLE).select('*').eq('id', boardId).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as Board;
}

export async function createBoard(
  sb: SupabaseClient,
  input: { id: string; userId: string; name?: string; projectId?: string | null },
): Promise<void> {
  const { error } = await sb.from(TABLE).insert({
    id: input.id,
    user_id: input.userId,
    name: input.name ?? 'Untitled board',
    project_id: input.projectId ?? null,
  });
  if (error?.message) throw error;
}

export async function renameBoard(
  sb: SupabaseClient,
  boardId: string,
  name: string,
): Promise<void> {
  const { error } = await sb.from(TABLE).update({ name }).eq('id', boardId);
  if (error) throw error;
}

export async function toggleStar(
  sb: SupabaseClient,
  boardId: string,
  starred: boolean,
): Promise<void> {
  const { error } = await sb.from(TABLE).update({ starred }).eq('id', boardId);
  if (error) throw error;
}

export async function moveBoardToProject(
  sb: SupabaseClient,
  boardId: string,
  projectId: string | null,
): Promise<void> {
  const { error } = await sb.from(TABLE).update({ project_id: projectId }).eq('id', boardId);
  if (error) throw error;
}

export async function softDeleteBoard(
  sb: SupabaseClient,
  boardId: string,
): Promise<void> {
  const { error } = await sb
    .from(TABLE)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', boardId);
  if (error) throw error;
}

export async function restoreBoard(
  sb: SupabaseClient,
  boardId: string,
): Promise<void> {
  const { error } = await sb.from(TABLE).update({ deleted_at: null }).eq('id', boardId);
  if (error) throw error;
}

export async function permanentDeleteBoard(
  sb: SupabaseClient,
  boardId: string,
): Promise<void> {
  const { error } = await sb.from(TABLE).delete().eq('id', boardId);
  if (error) throw error;
}

export async function touchLastOpened(
  sb: SupabaseClient,
  boardId: string,
): Promise<void> {
  const { error } = await sb
    .from(TABLE)
    .update({ last_opened_at: new Date().toISOString() })
    .eq('id', boardId);
  if (error) throw error;
}
