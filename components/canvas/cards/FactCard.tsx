'use client';

import { CardMenu } from '@/components/canvas/CardMenu';
import { Skel } from './Skeleton';

type Props = {
  text: string | null;
  loading: boolean;
  onDelete?: () => void;
};

export function FactCard({ text, loading, onDelete }: Props) {
  return (
    <article className="card card-fact">
      <span className="card-title">💡 Fact</span>
      <span className="card-body">
        {loading || text === null ? (
          <Skel height={12} width={240} />
        ) : (
          text
        )}
      </span>
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
