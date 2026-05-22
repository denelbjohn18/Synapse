'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Plus } from 'lucide-react';

import type { BoardFilter } from '@/types/db';
import { useBoards } from '@/lib/hooks/useBoards';
import { useProjects } from '@/lib/hooks/useProjects';
import { useBoardsStore } from '@/stores/useBoardsStore';
import { useUiStore } from '@/stores/useUiStore';
import { useSupabase } from '@/lib/supabase/client';
import { createBoard, filterBoards } from '@/lib/services/boards';
import { BoardRow } from './BoardRow';

type Props = {
  filter: BoardFilter;
  title: string;
};

export function BoardListPage({ filter, title }: Props) {
  const router = useRouter();
  const { userId } = useAuth();
  const sb = useSupabase();
  const { boards, loaded } = useBoards();
  const projects = useProjects();
  const search = useUiStore((s) => s.search);
  const upsertBoard = useBoardsStore((s) => s.upsertBoard);
  const creating = false;

  const visible = useMemo(
    () => filterBoards(boards, filter, search),
    [boards, filter, search],
  );

  function onCreate() {
    if (!userId || creating) return;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const projectId = filter.kind === 'project' ? filter.projectId : null;
    // Optimistic: add to local store + navigate immediately — zero wait
    upsertBoard({
      id,
      user_id: userId,
      project_id: projectId,
      name: 'Untitled board',
      starred: false,
      last_opened_at: now,
      deleted_at: null,
      created_at: now,
      updated_at: now,
    });
    router.push(`/boards/${id}`);
    // Background sync — fire and forget
    void createBoard(sb, { id, userId, projectId });
  }

  const isTrash = filter.kind === 'trash';
  const emptyTitle =
    filter.kind === 'trash'
      ? 'Trash is empty'
      : filter.kind === 'starred'
      ? 'No starred boards'
      : search
      ? 'No matches'
      : 'No boards yet';
  const emptyMsg =
    filter.kind === 'trash'
      ? 'Deleted boards land here.'
      : search
      ? 'Try a different search.'
      : 'Click “+ Create new” to start your first board.';

  return (
    <div>
      <header className="boards-page-header">
        <h1 className="boards-page-title">{title}</h1>
        {!isTrash && (
          <button
            type="button"
            className="boards-create-btn"
            onClick={onCreate}
            disabled={creating}
          >
            <Plus size={14} strokeWidth={3} />
            <span>Create new</span>
          </button>
        )}
      </header>

      <div className="boards-table">
        <div className="boards-table-head">
          <span>Name</span>
          <span>Last opened</span>
          <span />
        </div>

        {!loaded ? (
          <div className="boards-empty">
            <div className="boards-empty-msg">Loading…</div>
          </div>
        ) : visible.length === 0 ? (
          <div className="boards-empty">
            <div className="boards-empty-title">{emptyTitle}</div>
            <div className="boards-empty-msg">{emptyMsg}</div>
          </div>
        ) : (
          visible.map((b) => (
            <BoardRow key={b.id} board={b} projects={projects} isInTrash={isTrash} />
          ))
        )}
      </div>
    </div>
  );
}
