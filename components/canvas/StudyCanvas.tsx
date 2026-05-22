'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { ClusterRail } from './ClusterRail';
import { StickiesLayer } from './StickiesLayer';
import { Cluster } from './Cluster';
import { Sidecar } from './Sidecar';

type Props = {
  boardId: string;
};

export function StudyCanvas({ boardId }: Props) {
  const clusters = useCanvasStore((s) => s.clusters);
  const focusedClusterId = useCanvasStore((s) => s.focusedClusterId);
  const activeMode = useCanvasStore((s) => s.activeMode);
  const stickyTopic = useCanvasStore((s) => s.stickyTopic);

  const clusterRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [activeDotId, setActiveDotId] = useState<string | null>(null);

  const registerRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) clusterRefs.current.set(id, el);
    else clusterRefs.current.delete(id);
  }, []);

  const scrollToCluster = useCallback((id: string) => {
    const el = clusterRefs.current.get(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveDotId(id);
    }
  }, []);

  // Auto-scroll when a new cluster is mounted
  const prevCountRef = useRef(0);
  useEffect(() => {
    if (clusters.length > prevCountRef.current && clusters.length > 0) {
      const last = clusters[clusters.length - 1];
      // Defer to let the DOM finalize positions.
      const t = window.setTimeout(() => scrollToCluster(last.id), 60);
      return () => window.clearTimeout(t);
    }
    prevCountRef.current = clusters.length;
  }, [clusters.length, scrollToCluster, clusters]);

  function scrollDown() {
    const last = clusters[clusters.length - 1];
    if (last) scrollToCluster(last.id);
  }

  return (
    <div id="app">
      <ClusterRail onDotClick={scrollToCluster} activeId={activeDotId} />

      <main className={`canvas${activeMode === 'quiz' ? ' is-quiz-active' : ''}`}>
        <button type="button" className="topmenu" aria-label="Menu" title="Menu">⋯</button>
        <div className="canvas-scroll">
          <StickiesLayer />

          {clusters.length === 0 && (
            <div className="canvas-empty">
              Ask anything in the sidecar to drop your first learning cluster here.
            </div>
          )}

          {clusters.map((c, i) => (
            <Cluster
              key={c.id}
              cluster={c}
              index={i + 1}
              topic={stickyTopic}
              focused={c.id === focusedClusterId}
              ref={(el) => registerRef(c.id, el)}
            />
          ))}
        </div>
        {clusters.length > 0 && (
          <button
            type="button"
            className="scroll-down"
            aria-label="Scroll to latest cluster"
            onClick={scrollDown}
          >
            ↓
          </button>
        )}
      </main>

      <Sidecar boardId={boardId} />
    </div>
  );
}
