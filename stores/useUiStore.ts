'use client';

import { create } from 'zustand';

type Toast = { id: string; message: string };

type State = {
  toast: Toast | null;
  search: string;
};

type Actions = {
  showToast: (message: string) => void;
  hideToast: () => void;
  setSearch: (q: string) => void;
};

export const useUiStore = create<State & Actions>((set) => ({
  toast: null,
  search: '',
  showToast: (message) =>
    set({ toast: { id: Math.random().toString(36).slice(2), message } }),
  hideToast: () => set({ toast: null }),
  setSearch: (q) => set({ search: q }),
}));
