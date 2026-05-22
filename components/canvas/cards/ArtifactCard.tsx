'use client';

import { useState } from 'react';
import { askApi, fetchImages, fetchYouTube, type YouTubeResult } from '@/lib/api/ask';
import { useCanvasStore, type ArtifactResult } from '@/stores/useCanvasStore';
import { CardMenu } from '@/components/canvas/CardMenu';
import { Markdown } from '@/components/primitives/Markdown';

type ArtifactType = 'explain' | 'mnemonic' | 'image' | 'youtube';

const placeholders: Record<ArtifactType, string> = {
  explain: 'e.g. explain quantum entanglement',
  mnemonic: 'e.g. give me a mnemonic',
  image: 'e.g. photosynthesis diagram',
  youtube: 'e.g. how mitosis works',
};
const labels: Record<ArtifactType, string> = {
  explain: '＋ Explain',
  mnemonic: '＋ Mnemonic',
  image: '＋ Image',
  youtube: '＋ YouTube',
};

type Props = {
  clusterId: string;
  topic: string;
};

export function ArtifactCard({ clusterId, topic }: Props) {
  const [activeType, setActiveType] = useState<ArtifactType | null>(null);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const appendArtifactResult = useCanvasStore((s) => s.appendArtifactResult);
  const history = useCanvasStore((s) => s.history);

  async function submit() {
    const query = input.trim();
    if (!query || !activeType) return;
    setInput('');
    const type = activeType;
    setSubmitting(true);
    const resultId = `art-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      if (type === 'explain') {
        const r = await askApi.explain({
          prompt: query,
          topic: query,
          history: history.slice(-8),
        });
        appendArtifactResult(clusterId, { id: resultId, type, query, text: r.text });
      } else if (type === 'mnemonic') {
        const r = await askApi.artifact({ prompt: query, topic });
        appendArtifactResult(clusterId, { id: resultId, type, query, text: r.text });
      } else if (type === 'image') {
        const urls = await fetchImages(query);
        appendArtifactResult(clusterId, { id: resultId, type, query, images: urls });
      } else if (type === 'youtube') {
        const vids = await fetchYouTube(query);
        appendArtifactResult(clusterId, { id: resultId, type, query, videos: vids });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('artifact failed:', err);
    } finally {
      setSubmitting(false);
      setActiveType(null);
    }
  }

  return (
    <article className="card card-artifact">
      <div className="card-title">✦ Add artifact</div>
      <div className="artifact-options">
        {(['explain', 'mnemonic', 'image', 'youtube'] as ArtifactType[]).map((type) => (
          <button
            key={type}
            type="button"
            className={`artifact-btn${activeType === type ? ' is-active' : ''}`}
            onClick={() =>
              setActiveType((cur) => (cur === type ? null : type))
            }
          >
            {labels[type]}
          </button>
        ))}
      </div>
      <div className={`artifact-input${activeType ? ' is-open' : ''}`}>
        <input
          type="text"
          value={input}
          placeholder={activeType ? placeholders[activeType] : ''}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void submit();
            }
          }}
          disabled={submitting}
        />
        <button
          className="sendbtn"
          type="button"
          onClick={() => void submit()}
          disabled={submitting || !input.trim()}
        >
          {submitting ? 'Adding…' : 'Add'}
        </button>
      </div>
    </article>
  );
}

export function ArtifactResults({ clusterId, results }: { clusterId: string; results: ArtifactResult[] }) {
  const removeArtifactResult = useCanvasStore((s) => s.removeArtifactResult);
  if (results.length === 0) return null;

  return (
    <div className="artifact-results">
      {results.map((r) => {
        if (r.type === 'explain' || r.type === 'mnemonic') {
          return (
            <article key={r.id} className="card card-artifact-result">
              <div className="card-title">✦ {r.query}</div>
              <div className="card-body">
                <Markdown text={r.text ?? ''} />
              </div>
              <CardMenu
                copyLabel="Copy text"
                onCopy={async () => {
                  await navigator.clipboard.writeText(r.text ?? '');
                  return 'Text copied';
                }}
                onDelete={() => removeArtifactResult(clusterId, r.id)}
              />
            </article>
          );
        }
        if (r.type === 'image') {
          return (
            <div key={r.id} className="card-images card-artifact-result-images">
              {(r.images ?? []).slice(0, 3).map((url) => (
                <article key={url} className="card card-image">
                  <img loading="lazy" referrerPolicy="no-referrer" src={url} alt="artifact" />
                  <CardMenu
                    copyLabel="Copy image URL"
                    onCopy={async () => {
                      await navigator.clipboard.writeText(url);
                      return 'Image URL copied';
                    }}
                    onDelete={() => removeArtifactResult(clusterId, r.id)}
                  />
                </article>
              ))}
            </div>
          );
        }
        // youtube
        return (
          <div key={r.id} className="card-videos card-artifact-result-videos">
            {(r.videos ?? []).slice(0, 2).map((v) => (
              <ArtifactVideo key={v.videoId} video={v} onDelete={() => removeArtifactResult(clusterId, r.id)} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function ArtifactVideo({ video, onDelete }: { video: YouTubeResult; onDelete: () => void }) {
  const [playing, setPlaying] = useState(false);
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
            <img loading="lazy" src={video.thumbnail} alt={video.title} />
            <div className="video-play-btn">▶</div>
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
        onDelete={onDelete}
      />
    </div>
  );
}
