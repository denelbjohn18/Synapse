'use client';

import { useEffect, useState } from 'react';
import { useCanvasStore } from '@/stores/useCanvasStore';

export function SaveIndicator() {
  const syncPending = useCanvasStore((s) => s.syncPending);
  const [showSaved, setShowSaved] = useState(false);
  const [prevPending, setPrevPending] = useState(0);

  useEffect(() => {
    if (prevPending > 0 && syncPending === 0) {
      // Just finished — flash "Saved" briefly
      setShowSaved(true);
      const t = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(t);
    }
    setPrevPending(syncPending);
  }, [syncPending, prevPending]);

  if (syncPending === 0 && !showSaved) return null;

  return (
    <div className="save-indicator">
      {syncPending > 0 ? (
        <>
          <span className="save-spinner" />
          <span>Saving</span>
        </>
      ) : (
        <>
          <span className="save-check">✓</span>
          <span>Saved</span>
        </>
      )}
    </div>
  );
}
