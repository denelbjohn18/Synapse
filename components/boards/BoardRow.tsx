'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { FileText, Star, MoreHorizontal } from 'lucide-react';

import type { Board, Project } from '@/types/db';
import { Dropdown, type DropdownItem } from '@/components/primitives/Dropdown';
import { useBoardsStore } from '@/stores/useBoardsStore';
import { useSupabase } from '@/lib/supabase/client';
import {
  renameBoard,
  toggleStar,
  softDeleteBoard,
  restoreBoard,
  permanentDeleteBoard,
  moveBoardToProject,
} from '@/lib/services/boards';
import { relativeDate } from '@/lib/relativeDate';

type Props = {
  board: Board;
  projects: Project[];
  isInTrash?: boolean;
};

export function BoardRow({ board, projects, isInTrash }: Props) {
  const sb = useSupabase();
  const patchBoard = useBoardsStore((s) => s.patchBoard);
  const removeBoard = useBoardsStore((s) => s.removeBoard);

  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(board.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement | null>(null);
  const [dateLabel, setDateLabel] = useState<string>('');

  // Compute relative date on the client to avoid SSR hydration mismatches.
  useEffect(() => {
    setDateLabel(relativeDate(board.last_opened_at));
  }, [board.last_opened_at]);

  function commitRename() {
    const next = draftName.trim();
    setRenaming(false);
    if (!next || next === board.name) {
      setDraftName(board.name);
      return;
    }
    patchBoard(board.id, { name: next });
    void renameBoard(sb, board.id, next).catch(() => {
      patchBoard(board.id, { name: board.name });
    });
  }

  function onStar() {
    const next = !board.starred;
    patchBoard(board.id, { starred: next });
    void toggleStar(sb, board.id, next).catch(() => {
      patchBoard(board.id, { starred: board.starred });
    });
  }

  function onMoveToProject(projectId: string | null) {
    const prev = board.project_id;
    patchBoard(board.id, { project_id: projectId });
    void moveBoardToProject(sb, board.id, projectId).catch(() => {
      patchBoard(board.id, { project_id: prev });
    });
  }

  function onDelete() {
    const now = new Date().toISOString();
    patchBoard(board.id, { deleted_at: now });
    void softDeleteBoard(sb, board.id).catch(() => {
      patchBoard(board.id, { deleted_at: null });
    });
  }

  function onRestore() {
    patchBoard(board.id, { deleted_at: null });
    void restoreBoard(sb, board.id).catch(() => {
      patchBoard(board.id, { deleted_at: board.deleted_at });
    });
  }

  function onPermanentDelete() {
    removeBoard(board.id);
    void permanentDeleteBoard(sb, board.id).catch(() => {
      // If it fails we'd need to refetch; not critical for v1.
    });
  }

  const items: DropdownItem[] = isInTrash
    ? [
        { label: 'Restore', onClick: onRestore },
        { label: 'Delete forever', onClick: onPermanentDelete, danger: true },
      ]
    : [
        { label: 'Rename', onClick: () => setRenaming(true) },
        { label: board.starred ? 'Unstar' : 'Star', onClick: onStar },
        ...projects.map<DropdownItem>((p) => ({
          label: board.project_id === p.id ? `✓ ${p.name}` : `Move to ${p.name}`,
          onClick: () => onMoveToProject(p.id),
        })),
        ...(board.project_id
          ? [
              {
                label: 'Remove from project',
                onClick: () => onMoveToProject(null),
              } as DropdownItem,
            ]
          : []),
        { label: 'Delete', onClick: onDelete, danger: true },
      ];

  return (
    <div className="boards-row">
      <div className="boards-row-name">
        <FileText size={18} className="board-icon" />
        {renaming ? (
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') {
                setDraftName(board.name);
                setRenaming(false);
              }
            }}
          />
        ) : isInTrash ? (
          <span>{board.name}</span>
        ) : (
          <Link
            href={`/boards/${board.id}`}
            onDoubleClick={(e) => {
              e.preventDefault();
              setRenaming(true);
            }}
          >
            {board.name}
          </Link>
        )}
      </div>

      <div className="boards-row-date">{dateLabel}</div>

      <div className={`boards-row-actions${menuOpen ? ' is-pinned' : ''}`}>
        {!isInTrash && (
          <button
            type="button"
            className={`boards-row-star${board.starred ? ' is-on' : ''}`}
            onClick={onStar}
            aria-label={board.starred ? 'Unstar' : 'Star'}
          >
            <Star size={16} />
          </button>
        )}
        <button
          ref={menuBtnRef}
          type="button"
          className="boards-row-menu"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="More actions"
        >
          <MoreHorizontal size={16} />
        </button>
        <Dropdown
          anchorRef={menuBtnRef}
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          items={items}
        />
      </div>
    </div>
  );
}
