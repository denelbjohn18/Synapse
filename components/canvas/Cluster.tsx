'use client';

import { forwardRef } from 'react';
import { useCanvasStore, type ClusterVM } from '@/stores/useCanvasStore';
import { ClusterHeader } from './ClusterHeader';
import { ExplainCard } from './cards/ExplainCard';
import { Eli5Card } from './cards/Eli5Card';
import { FactCard } from './cards/FactCard';
import { ImagesCard } from './cards/ImagesCard';
import { VideosCard } from './cards/VideosCard';
import { ArtifactCard, ArtifactResults } from './cards/ArtifactCard';

type Props = {
  cluster: ClusterVM;
  index: number;
  topic: string;
  focused: boolean;
};

export const Cluster = forwardRef<HTMLElement, Props>(function Cluster(
  { cluster, index, topic, focused },
  ref,
) {
  const patchCluster = useCanvasStore((s) => s.patchCluster);

  return (
    <section
      ref={ref}
      className={`cluster${focused ? ' is-focused' : ''}`}
      id={cluster.id}
    >
      <ClusterHeader index={index} createdAt={cluster.createdAt} prompt={cluster.prompt} />

      <ExplainCard
        text={cluster.explain}
        loading={cluster.loadingExplain}
        onDelete={() => patchCluster(cluster.id, { explain: null })}
      />

      <Eli5Card
        text={cluster.eli5}
        loading={cluster.loadingEli5}
        onDelete={() => patchCluster(cluster.id, { eli5: null })}
      />

      <ImagesCard images={cluster.images} loading={cluster.loadingImages} />

      <VideosCard videos={cluster.videos} loading={cluster.loadingVideos} />

      <ArtifactCard clusterId={cluster.id} topic={topic} />

      <FactCard
        text={cluster.fact}
        loading={cluster.loadingFact}
        onDelete={() => patchCluster(cluster.id, { fact: null })}
      />

      <ArtifactResults clusterId={cluster.id} results={cluster.artifactResults} />
    </section>
  );
});
