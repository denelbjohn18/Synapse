'use client';

import { use } from 'react';
import { useBoard } from '@/lib/hooks/useBoard';
import { StudyCanvas } from '@/components/canvas/StudyCanvas';

type Params = { boardId: string };

export default function BoardPage({ params }: { params: Promise<Params> }) {
  const { boardId } = use(params);
  const { loading, error, board } = useBoard(boardId);

  if (error) {
    return (
      <div className="landing">
        <div className="landing-card">
          <h1 className="landing-title">Not found</h1>
          <p className="landing-subtitle">{error}</p>
        </div>
      </div>
    );
  }

  if (loading || !board) {
    return (
      <div id="app">
        <aside className="rail">
          <div className="logo">S</div>
        </aside>
        <main className="canvas">
          <div className="canvas-scroll">
            <div className="canvas-empty">Loading board…</div>
          </div>
        </main>
        <aside className="sidecar" />
      </div>
    );
  }

  return <StudyCanvas boardId={boardId} />;
}
