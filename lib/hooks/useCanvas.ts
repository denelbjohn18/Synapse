'use client';

import { useCallback } from 'react';
import { useSupabase } from '@/lib/supabase/client';
import { askApi, fetchImages, fetchYouTube, type AskHistoryTurn } from '@/lib/api/ask';
import {
  useCanvasStore,
  newClusterVM,
  type ClusterVM,
} from '@/stores/useCanvasStore';
import { createCluster } from '@/lib/services/clusters';
import { ensureTopicForCluster, updateTopicSlot } from '@/lib/services/topics';

const HISTORY_TURNS = 4;

function buildClusterContext(c: ClusterVM) {
  return {
    prompt: c.prompt,
    explain: c.explain ?? '',
    eli5: c.eli5 ?? '',
    fact: c.fact ?? '',
  };
}

// Fire-and-forget Supabase write — increments/decrements the sync counter so
// the save indicator knows something is in-flight.
function syncWrite(
  incSync: () => void,
  decSync: () => void,
  fn: () => Promise<void>,
) {
  incSync();
  fn()
    .catch(() => {})
    .finally(decSync);
}

export function useCanvas(boardId: string) {
  const sb = useSupabase();

  const addCluster = useCanvasStore((s) => s.addCluster);
  const patchCluster = useCanvasStore((s) => s.patchCluster);
  const pushAskMessage = useCanvasStore((s) => s.pushAskMessage);
  const pushHistoryTurn = useCanvasStore((s) => s.pushHistoryTurn);
  const pushFollowUpTurn = useCanvasStore((s) => s.pushFollowUpTurn);
  const pushQuizTurn = useCanvasStore((s) => s.pushQuizTurn);
  const setPendingImage = useCanvasStore((s) => s.setPendingImage);
  const incSync = useCanvasStore((s) => s.incSync);
  const decSync = useCanvasStore((s) => s.decSync);

  const handleAsk = useCallback(
    async (prompt: string) => {
      const state = useCanvasStore.getState();
      const topic = state.stickyTopic || 'general study';
      const history = state.history.slice(-HISTORY_TURNS * 2);
      const attachedImage = state.pendingImage;

      // 1. Generate UUID client-side so local ID === server ID — no swap needed
      const clusterId = crypto.randomUUID();
      addCluster(newClusterVM(prompt, clusterId));
      pushAskMessage({ role: 'user', content: prompt });
      setPendingImage(null);

      // 2. Background: persist cluster + topic shell to Supabase (no await)
      syncWrite(incSync, decSync, async () => {
        await createCluster(sb, { boardId, title: prompt, id: clusterId });
        await ensureTopicForCluster(sb, clusterId, prompt);
      });

      // 3. ELI5
      const eli5Promise = askApi
        .eli5({ prompt, topic })
        .then((r) => {
          patchCluster(clusterId, { eli5: r.text, loadingEli5: false });
          syncWrite(incSync, decSync, () =>
            updateTopicSlot(sb, clusterId, { slot: 'eli5', value: r.text }),
          );
        })
        .catch((err) => {
          patchCluster(clusterId, { loadingEli5: false, eli5Error: String(err) });
        });

      // 4. Terms → images + videos
      const termsPromise = askApi
        .terms({ prompt, topic })
        .then(async (r) => {
          const imgsQ = (r.imageTerms ?? []).slice(0, 3).join(' ');
          const vidsQ = (r.videoTerms ?? []).join(' ') || prompt;

          const imgsP = fetchImages(imgsQ)
            .then((imgs) => {
              patchCluster(clusterId, { images: imgs, loadingImages: false });
              syncWrite(incSync, decSync, () =>
                updateTopicSlot(sb, clusterId, { slot: 'images', value: imgs }),
              );
            })
            .catch((err) => {
              patchCluster(clusterId, { images: [], loadingImages: false, imagesError: String(err) });
            });

          const vidsP = fetchYouTube(vidsQ)
            .then((vids) => {
              patchCluster(clusterId, { videos: vids, loadingVideos: false });
              syncWrite(incSync, decSync, () =>
                updateTopicSlot(sb, clusterId, { slot: 'videos', value: vids }),
              );
            })
            .catch((err) => {
              patchCluster(clusterId, { videos: [], loadingVideos: false, videosError: String(err) });
            });

          await Promise.allSettled([imgsP, vidsP]);
        })
        .catch(() => {
          patchCluster(clusterId, {
            images: [],
            videos: [],
            loadingImages: false,
            loadingVideos: false,
          });
        });

      // 5. Long-form explanation
      const explainPromise = askApi
        .explain({ prompt, topic, history, image: attachedImage ?? undefined })
        .then((r) => {
          patchCluster(clusterId, { explain: r.text, loadingExplain: false });
          pushHistoryTurn({ role: 'user', content: prompt });
          pushHistoryTurn({ role: 'assistant', content: r.text });
          pushAskMessage({ role: 'assistant', content: '→ cluster added below' });
          syncWrite(incSync, decSync, () =>
            updateTopicSlot(sb, clusterId, { slot: 'explain', value: r.text }),
          );
        })
        .catch((err) => {
          patchCluster(clusterId, {
            loadingExplain: false,
            explainError: String(err),
            explain: `(Explanation unavailable — ${err instanceof Error ? err.message : String(err)})`,
          });
        });

      // 6. Surprising fact
      const factPromise = askApi
        .fact({ prompt, topic })
        .then((r) => {
          patchCluster(clusterId, { fact: r.text, loadingFact: false });
          syncWrite(incSync, decSync, () =>
            updateTopicSlot(sb, clusterId, { slot: 'fact', value: r.text }),
          );
        })
        .catch((err) => {
          patchCluster(clusterId, { loadingFact: false, factError: String(err) });
        });

      await Promise.allSettled([eli5Promise, termsPromise, explainPromise, factPromise]);
    },
    [sb, boardId, addCluster, patchCluster, pushAskMessage, pushHistoryTurn, setPendingImage, incSync, decSync],
  );

  const handleFollowUp = useCallback(
    async (prompt: string) => {
      const state = useCanvasStore.getState();
      const cluster = state.clusters.find((c) => c.id === state.focusedClusterId);
      if (!cluster) {
        await handleAsk(prompt);
        return;
      }
      const topic = state.stickyTopic || 'general study';
      const history: AskHistoryTurn[] = cluster.followUpHistory.slice(-HISTORY_TURNS * 2);
      pushFollowUpTurn(cluster.id, { role: 'user', content: prompt });
      try {
        const r = await askApi.followup({
          prompt,
          topic,
          history,
          clusterContext: buildClusterContext(cluster),
        });
        pushFollowUpTurn(cluster.id, { role: 'assistant', content: r.text });
      } catch (err) {
        pushFollowUpTurn(cluster.id, {
          role: 'assistant',
          content: `(Follow-up unavailable — ${err instanceof Error ? err.message : String(err)})`,
        });
      }
    },
    [handleAsk, pushFollowUpTurn],
  );

  const fetchNextQuiz = useCallback(async () => {
    const state = useCanvasStore.getState();
    const topic = state.stickyTopic || 'general study';
    const recentContext = state.quizHistory.slice(-HISTORY_TURNS * 2);
    const boardContext = state.clusters.map(buildClusterContext);
    const r = await askApi.quiz({
      prompt: 'Give me a new multiple-choice question.',
      topic,
      history: recentContext,
      boardContext,
    });
    pushQuizTurn({ role: 'assistant', content: r.text });
    return r.text;
  }, [pushQuizTurn]);

  return { handleAsk, handleFollowUp, fetchNextQuiz };
}
