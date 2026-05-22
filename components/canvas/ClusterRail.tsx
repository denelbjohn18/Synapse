'use client';

import { useCanvasStore } from '@/stores/useCanvasStore';

type Props = {
  onDotClick: (clusterId: string) => void;
  activeId: string | null;
};

export function ClusterRail({ onDotClick, activeId }: Props) {
  const clusters = useCanvasStore((s) => s.clusters);
  return (
    <aside className="rail">
      <div className="logo">
        S
      </div>
      <div className="cluster-nav">
        {clusters.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`cluster-dot${activeId === c.id ? ' is-active' : ''}`}
            title={c.prompt}
            onClick={() => onDotClick(c.id)}
          />
        ))}
      </div>
    </aside>
  );
}
