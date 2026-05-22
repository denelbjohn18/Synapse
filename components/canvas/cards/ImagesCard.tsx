'use client';

import { useState } from 'react';
import { CardMenu } from '@/components/canvas/CardMenu';
import { Skel } from './Skeleton';

type Props = {
  images: string[] | null;
  loading: boolean;
};

export function ImagesCard({ images, loading }: Props) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  if (loading || images === null) {
    return (
      <div className="card-images">
        {[0, 1, 2].map((i) => (
          <article key={i} className="card card-image">
            <Skel height={0} width="100%" />
            <div style={{ aspectRatio: '4 / 3' }}>
              <Skel height="100%" width="100%" />
            </div>
          </article>
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="card-images">
        <article className="card card-image">
          <div className="card-title" style={{ color: 'var(--ink-2)' }}>Images</div>
          <div className="card-body" style={{ color: 'var(--ink-3)' }}>No matches found.</div>
        </article>
      </div>
    );
  }

  return (
    <div className="card-images">
      {images.slice(0, 3).map((url) => {
        if (removed.has(url) || hidden.has(url)) return null;
        return (
          <article key={url} className="card card-image">
            <img
              loading="lazy"
              referrerPolicy="no-referrer"
              src={url}
              alt="image"
              onError={() => setHidden((s) => new Set(s).add(url))}
            />
            <CardMenu
              copyLabel="Copy image URL"
              onCopy={async () => {
                await navigator.clipboard.writeText(url);
                return 'Image URL copied';
              }}
              onDelete={() => setRemoved((s) => new Set(s).add(url))}
            />
          </article>
        );
      })}
    </div>
  );
}
