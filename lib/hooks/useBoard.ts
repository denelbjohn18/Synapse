'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useSupabase } from '@/lib/supabase/client';
import { getBoard, touchLastOpened } from '@/lib/services/boards';
import { listClustersByBoard } from '@/lib/services/clusters';
import { useCanvasStore, type ClusterVM } from '@/stores/useCanvasStore';
import { useBoardsStore } from '@/stores/useBoardsStore';
import type { Board } from '@/types/db';

export function useBoard(boardId: string) {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const sb = useSupabase();
  const hydrate = useCanvasStore((s) => s.hydrate);
  const clear = useCanvasStore((s) => s.clear);
  const patchBoardInList = useBoardsStore((s) => s.patchBoard);

  // Check local store first — if board was just created optimistically, use it immediately
  const localBoard = useBoardsStore((s) => s.boards.find((b) => b.id === boardId) ?? null);

  const [board, setBoard] = useState<Board | null>(localBoard);
  const [loading, setLoading] = useState(localBoard === null);
  const [error, setError] = useState<string | null>(null);

  // If local board appears (async store hydration), unblock loading
  useEffect(() => {
    if (localBoard && !board) {
      setBoard(localBoard);
      setLoading(false);
    }
  }, [localBoard, board]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return;
    let cancelled = false;

    (async () => {
      try {
        // Load clusters from Supabase (they may exist from a previous session)
        const clustersWithTopics = await listClustersByBoard(sb, boardId);
        if (cancelled) return;

        if (clustersWithTopics.length > 0) {
          const clusters: ClusterVM[] = clustersWithTopics.map((c) => {
            const topic = c.topics?.[0];
            return {
              id: c.id,
              prompt: c.title,
              createdAt: new Date(c.created_at).getTime(),
              explain: topic?.explanation ?? null,
              eli5: topic?.eli5 ?? null,
              fact: topic?.fact ?? null,
              images: topic?.images ?? null,
              videos: topic?.videos ?? null,
              artifactResults: [],
              followUpHistory: [],
              loadingExplain: false,
              loadingEli5: false,
              loadingFact: false,
              loadingImages: false,
              loadingVideos: false,
              explainError: null,
              eli5Error: null,
              factError: null,
              imagesError: null,
              videosError: null,
            };
          });
          hydrate(boardId, clusters);
        } else {
          // New board — just set boardId with empty clusters
          hydrate(boardId, []);
        }

        // If not in local store yet, fetch from Supabase
        if (!localBoard) {
          const b = await getBoard(sb, boardId);
          if (cancelled) return;
          if (!b) {
            setError('Board not found');
            setLoading(false);
            return;
          }
          setBoard(b);
          patchBoardInList(boardId, b);
        }

        setLoading(false);

        // Bump last_opened_at (fire-and-forget)
        const now = new Date().toISOString();
        patchBoardInList(boardId, { last_opened_at: now });
        void touchLastOpened(sb, boardId).catch(() => {});
      } catch (err) {
        if (cancelled) return;
        // If board is local-only (not yet synced), don't error — just show empty canvas
        if (localBoard) {
          hydrate(boardId, []);
          setLoading(false);
        } else {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      clear();
    };
  }, [boardId, isLoaded, isSignedIn, userId, sb, hydrate, clear, patchBoardInList]);

  return { board: board ?? localBoard, loading, error };
}
