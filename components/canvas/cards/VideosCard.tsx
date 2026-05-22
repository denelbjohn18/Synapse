'use client';

import { useState } from 'react';
import type { YouTubeResult } from '@/lib/api/ask';
import { CardMenu } from '@/components/canvas/CardMenu';
import { Skel } from './Skeleton';

type Props = {
  videos: YouTubeResult[] | null;
  loading: boolean;
};

export function VideosCard({ videos, loading }: Props) {
  if (loading || videos === null) {
    return (
      <div className="card-videos">
        {[0, 1].map((i) => (
          <article key={i} className="card card-video">
            <div style={{ aspectRatio: '16 / 9' }}>
              <Skel height="100%" width="100%" />
            </div>
            <div style={{ padding: '12px 14px' }}>
              <Skel height={12} />
            </div>
          </article>
        ))}
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="card-videos">
        <article className="card card-video">
          <div style={{ padding: 20 }}>
            <div className="card-title" style={{ color: 'var(--accent)' }}>Videos</div>
            <div className="card-body" style={{ color: 'var(--ink-3)' }}>No matches.</div>
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="card-videos">
      {videos.slice(0, 2).map((v) => (
        <VideoTile key={v.videoId} video={v} />
      ))}
    </div>
  );
}

function VideoTile({ video }: { video: YouTubeResult }) {
  const [playing, setPlaying] = useState(false);
  const [removed, setRemoved] = useState(false);
  if (removed) return null;

  return (
    <div
      className={`card card-video${playing ? '' : ' card-video-thumb'}`}
      onClick={() => !playing && setPlaying(true)}
    >
      <div className="video-content">
        {playing ? (
          <iframe
            className="video-embed"
            src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <div className="video-thumb-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" src={video.thumbnail} alt={video.title} />
            <div className="video-play-btn" aria-label="Play video">▶</div>
          </div>
        )}
        <div className="video-title">{video.title}</div>
      </div>
      <CardMenu
        copyLabel="Copy YouTube link"
        onCopy={async () => {
          await navigator.clipboard.writeText(`https://www.youtube.com/watch?v=${video.videoId}`);
          return 'YouTube link copied';
        }}
        onDelete={() => setRemoved(true)}
      />
    </div>
  );
}
