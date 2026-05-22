'use client';

import { useState } from 'react';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { StickyBoard } from './StickyBoard';

type StickyState = { id: string; text: string };

/**
 * Phase 3: stickies are local-only (not persisted to Supabase yet). The first
 * sticky's text feeds the canvas store's `stickyTopic`, which the ask flow
 * reads as the topic for API requests.
 */
export function StickiesLayer() {
  const setStickyTopic = useCanvasStore((s) => s.setStickyTopic);
  const [stickies, setStickies] = useState<StickyState[]>([
    { id: 's-init', text: '' },
  ]);

  function handleTextChange(id: string, text: string) {
    setStickies((cur) => {
      const next = cur.map((s) => (s.id === id ? { ...s, text } : s));
      const first = next[0]?.text.trim() || 'general study';
      setStickyTopic(first);
      return next;
    });
  }

  function handleDelete(id: string) {
    setStickies((cur) => {
      const next = cur.filter((s) => s.id !== id);
      const first = next[0]?.text.trim() || 'general study';
      setStickyTopic(first);
      return next;
    });
  }

  function handleAdd() {
    const id = `s-${Date.now()}`;
    setStickies((cur) => [...cur, { id, text: '' }]);
  }

  return (
    <div className="stickies-layer">
      {stickies.map((s) => (
        <StickyBoard
          key={s.id}
          initialText={s.text}
          onTextChange={(text) => handleTextChange(s.id, text)}
          onDelete={() => handleDelete(s.id)}
        />
      ))}
      <button type="button" className="sticky-add" aria-label="Add sticky" onClick={handleAdd}>
        +
      </button>
    </div>
  );
}
