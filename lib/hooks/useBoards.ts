'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { useSupabase } from '@/lib/supabase/client';
import { listAllBoards } from '@/lib/services/boards';
import { useBoardsStore } from '@/stores/useBoardsStore';

/**
 * Loads ALL of the signed-in user's boards once and caches them in the store.
 * Subsequent views (home, starred, trash, projects) filter in memory.
 */
export function useBoards() {
  const { userId, isLoaded, isSignedIn } = useAuth();
  const sb = useSupabase();
  const boards = useBoardsStore((s) => s.boards);
  const loaded = useBoardsStore((s) => s.loaded);
  const setBoards = useBoardsStore((s) => s.setBoards);
  const setLoading = useBoardsStore((s) => s.setLoading);
  const setError = useBoardsStore((s) => s.setError);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId || loaded) return;
    let cancelled = false;
    setLoading(true);
    listAllBoards(sb, userId)
      .then((data) => {
        if (!cancelled) setBoards(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, userId, loaded, sb, setBoards, setLoading, setError]);

  return { boards, loaded };
}
