'use client';

import { useEffect, useState } from 'react';

type Props = {
  index: number;
  createdAt: number;
  prompt: string;
};

function splitForAccent(prompt: string): { head: string; tail: string; punct: string } {
  const trimmed = prompt.trim();
  const m = trimmed.match(/^(.*?\S)(\s+\S+)([.!?]*)$/);
  if (!m) return { head: trimmed, tail: '', punct: '' };
  const [, head, tail, punct] = m;
  return { head, tail, punct };
}

export function ClusterHeader({ index, createdAt, prompt }: Props) {
  const { head, tail, punct } = splitForAccent(prompt);
  const [timeLabel, setTimeLabel] = useState('');

  // Render time on client only to avoid SSR hydration mismatch
  useEffect(() => {
    setTimeLabel(
      new Date(createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    );
  }, [createdAt]);

  return (
    <header className="cluster-header">
      <div className="cluster-meta">
        Cluster <span className="cluster-index">{String(index).padStart(2, '0')}</span>
        {' · '}
        <time className="cluster-time">{timeLabel}</time>
      </div>
      <h2 className="cluster-topic">
        {head}
        {tail && <span className="accent">{tail}</span>}
        {punct}
      </h2>
    </header>
  );
}
