'use client';

import { CardMenu } from '@/components/canvas/CardMenu';
import { Skel } from './Skeleton';

type Props = {
  text: string | null;
  loading: boolean;
  onDelete?: () => void;
};

export function Eli5Card({ text, loading, onDelete }: Props) {
  return (
    <article className="card card-eli5">
      <div className="card-title">Explain like a kid</div>
      <div className="card-body">
        {loading || text === null ? (
          <>
            <Skel height={14} />
            <Skel height={14} width="85%" />
          </>
        ) : (
          text
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
