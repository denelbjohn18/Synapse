'use client';

import { create } from 'zustand';
import type { Project } from '@/types/db';

type State = {
  projects: Project[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
};

type Actions = {
  setProjects: (projects: Project[]) => void;
  upsertProject: (project: Project) => void;
  patchProject: (id: string, patch: Partial<Project>) => void;
  removeProject: (id: string) => void;
  setLoaded: (loaded: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
};

export const useProjectsStore = create<State & Actions>((set) => ({
  projects: [],
  loaded: false,
  loading: false,
  error: null,
  setProjects: (projects) => set({ projects, loaded: true }),
  upsertProject: (project) =>
    set((s) => {
      const idx = s.projects.findIndex((p) => p.id === project.id);
      if (idx === -1) return { projects: [...s.projects, project] };
      const next = s.projects.slice();
      next[idx] = project;
      return { projects: next };
    }),
  patchProject: (id, patch) =>
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),
  removeProject: (id) =>
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),
  setLoaded: (loaded) => set({ loaded }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clear: () => set({ projects: [], loaded: false, loading: false, error: null }),
}));
