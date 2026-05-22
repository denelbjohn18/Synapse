'use client';

import { create } from 'zustand';
import type { AskHistoryTurn, YouTubeResult } from '@/lib/api/ask';

export type ArtifactResult = {
  id: string;
  type: 'explain' | 'mnemonic' | 'image' | 'youtube';
  query: string;
  text?: string;
  images?: string[];
  videos?: YouTubeResult[];
};

export type ClusterVM = {
  id: string;
  prompt: string;
  createdAt: number;
  // slot content — null until filled
  explain: string | null;
  eli5: string | null;
  fact: string | null;
  images: string[] | null;
  videos: YouTubeResult[] | null;
  // artifact results, appended in order
  artifactResults: ArtifactResult[];
  // follow-up chat scoped to this cluster
  followUpHistory: AskHistoryTurn[];
  // loading flags drive skeletons in the UI
  loadingExplain: boolean;
  loadingEli5: boolean;
  loadingFact: boolean;
  loadingImages: boolean;
  loadingVideos: boolean;
  // optional error messages per slot
  explainError: string | null;
  eli5Error: string | null;
  factError: string | null;
  imagesError: string | null;
  videosError: string | null;
};

type State = {
  boardId: string | null;
  activeMode: 'ask' | 'quiz';
  followUpMode: boolean;
  focusedClusterId: string | null;
  askMessages: AskHistoryTurn[];
  history: AskHistoryTurn[];
  quizHistory: AskHistoryTurn[];
  clusters: ClusterVM[];
  pendingImage: string | null;
  stickyTopic: string;
  syncPending: number; // count of in-flight Supabase writes
};

type Actions = {
  hydrate: (boardId: string, clusters: ClusterVM[]) => void;
  clear: () => void;
  incSync: () => void;
  decSync: () => void;

  setActiveMode: (mode: 'ask' | 'quiz') => void;
  setFollowUpMode: (on: boolean) => void;
  setFocusedClusterId: (id: string | null) => void;
  setPendingImage: (image: string | null) => void;
  setStickyTopic: (topic: string) => void;

  pushAskMessage: (msg: AskHistoryTurn) => void;
  pushHistoryTurn: (msg: AskHistoryTurn) => void;
  pushQuizTurn: (msg: AskHistoryTurn) => void;
  pushFollowUpTurn: (clusterId: string, msg: AskHistoryTurn) => void;

  addCluster: (cluster: ClusterVM) => void;
  patchCluster: (clusterId: string, patch: Partial<ClusterVM>) => void;
  removeCluster: (clusterId: string) => void;
  appendArtifactResult: (clusterId: string, result: ArtifactResult) => void;
  removeArtifactResult: (clusterId: string, resultId: string) => void;
};

const initial: State = {
  boardId: null,
  activeMode: 'ask',
  followUpMode: false,
  focusedClusterId: null,
  askMessages: [],
  history: [],
  quizHistory: [],
  clusters: [],
  pendingImage: null,
  stickyTopic: 'general study',
  syncPending: 0,
};

export const useCanvasStore = create<State & Actions>((set) => ({
  ...initial,

  hydrate: (boardId, clusters) =>
    set({ ...initial, boardId, clusters }),
  clear: () => set({ ...initial }),
  incSync: () => set((s) => ({ syncPending: s.syncPending + 1 })),
  decSync: () => set((s) => ({ syncPending: Math.max(0, s.syncPending - 1) })),

  setActiveMode: (mode) => set({ activeMode: mode }),
  setFollowUpMode: (on) => set({ followUpMode: on }),
  setFocusedClusterId: (id) => set({ focusedClusterId: id }),
  setPendingImage: (image) => set({ pendingImage: image }),
  setStickyTopic: (topic) => set({ stickyTopic: topic }),

  pushAskMessage: (msg) =>
    set((s) => ({ askMessages: [...s.askMessages, msg] })),
  pushHistoryTurn: (msg) =>
    set((s) => ({ history: [...s.history, msg].slice(-16) })),
  pushQuizTurn: (msg) =>
    set((s) => ({ quizHistory: [...s.quizHistory, msg] })),
  pushFollowUpTurn: (clusterId, msg) =>
    set((s) => ({
      clusters: s.clusters.map((c) =>
        c.id === clusterId
          ? { ...c, followUpHistory: [...c.followUpHistory, msg] }
          : c,
      ),
    })),

  addCluster: (cluster) => set((s) => ({ clusters: [...s.clusters, cluster] })),
  patchCluster: (clusterId, patch) =>
    set((s) => ({
      clusters: s.clusters.map((c) =>
        c.id === clusterId ? { ...c, ...patch } : c,
      ),
    })),
  removeCluster: (clusterId) =>
    set((s) => ({ clusters: s.clusters.filter((c) => c.id !== clusterId) })),
  appendArtifactResult: (clusterId, result) =>
    set((s) => ({
      clusters: s.clusters.map((c) =>
        c.id === clusterId
          ? { ...c, artifactResults: [...c.artifactResults, result] }
          : c,
      ),
    })),
  removeArtifactResult: (clusterId, resultId) =>
    set((s) => ({
      clusters: s.clusters.map((c) =>
        c.id === clusterId
          ? {
              ...c,
              artifactResults: c.artifactResults.filter((r) => r.id !== resultId),
            }
          : c,
      ),
    })),
}));

export function newClusterVM(prompt: string, id: string): ClusterVM {
  return {
    id,
    prompt,
    createdAt: Date.now(),
    explain: null,
    eli5: null,
    fact: null,
    images: null,
    videos: null,
    artifactResults: [],
    followUpHistory: [],
    loadingExplain: true,
    loadingEli5: true,
    loadingFact: true,
    loadingImages: true,
    loadingVideos: true,
    explainError: null,
    eli5Error: null,
    factError: null,
    imagesError: null,
    videosError: null,
  };
}
