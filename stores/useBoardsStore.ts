'use client';

import { create } from 'zustand';
import type { Board } from '@/types/db';

type State = {
  boards: Board[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
};

type Actions = {
  setBoards: (boards: Board[]) => void;
  upsertBoard: (board: Board) => void;
  patchBoard: (id: string, patch: Partial<Board>) => void;
  removeBoard: (id: string) => void;
  setLoaded: (loaded: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
};

export const useBoardsStore = create<State & Actions>((set) => ({
  boards: [],
  loaded: false,
  loading: false,
  error: null,
  setBoards: (serverBoards) =>
    set((s) => {
      // Preserve any locally-created boards that haven't synced to the server yet.
      // Once synced, the board will appear in the next server response and take over.
      const serverIds = new Set(serverBoards.map((b) => b.id));
      const localOnly = s.boards.filter((b) => !serverIds.has(b.id));
      return { boards: [...serverBoards, ...localOnly], loaded: true };
    }),
  upsertBoard: (board) =>
    set((s) => {
      const idx = s.boards.findIndex((b) => b.id === board.id);
      if (idx === -1) return { boards: [board, ...s.boards] };
      const next = s.boards.slice();
      next[idx] = board;
      return { boards: next };
    }),
  patchBoard: (id, patch) =>
    set((s) => ({
      boards: s.boards.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    })),
  removeBoard: (id) => set((s) => ({ boards: s.boards.filter((b) => b.id !== id) })),
  setLoaded: (loaded) => set({ loaded }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clear: () => set({ boards: [], loaded: false, loading: false, error: null }),
}));
