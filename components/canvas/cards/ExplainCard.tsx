'use client';

import { Markdown } from '@/components/primitives/Markdown';
import { CardMenu } from '@/components/canvas/CardMenu';
import { Skel } from './Skeleton';

type Props = {
  text: string | null;
  loading: boolean;
  onDelete?: () => void;
};

export function ExplainCard({ text, loading, onDelete }: Props) {
  return (
    <article className="card card-explain">
      <div className="card-title">Explanation</div>
      <div className="card-body">
        {loading || text === null ? (
          <>
            <Skel height={14} />
            <Skel height={14} width="90%" />
            <Skel height={14} width="75%" />
          </>
        ) : (
          <Markdown text={text} />
        )}
      </div>
      {!loading && text !== null && (
        <CardMenu
          copyLabel="Copy text"
          onCopy={async () => {
            await navigator.clipboard.writeText(text);
            return 'Text copied';
          }}
          onDelete={onDelete}
        />
      )}
    </article>
  );
}
