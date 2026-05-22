'use client';

import { useEffect, useState } from 'react';
import { parseQuizPayload, type AskQuizPayload } from '@/lib/api/ask';
import { useCanvas } from '@/lib/hooks/useCanvas';
import { useCanvasStore } from '@/stores/useCanvasStore';

type Props = { boardId: string };

type Status = 'idle' | 'loading' | 'ready' | 'answered' | 'error';

export function QuizPanel({ boardId }: Props) {
  const { fetchNextQuiz } = useCanvas(boardId);
  const pushQuizTurn = useCanvasStore((s) => s.pushQuizTurn);

  const [status, setStatus] = useState<Status>('idle');
  const [q, setQ] = useState<AskQuizPayload | null>(null);
  const [selected, setSelected] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadNext() {
    setStatus('loading');
    setError(null);
    setSelected(null);
    setQ(null);
    try {
      const text = await fetchNextQuiz();
      const payload = parseQuizPayload(text);
      if (!payload || !payload.question || !payload.options || !payload.answer || !payload.explanation) {
        setStatus('error');
        setError('Could not parse quiz question. Try again.');
        return;
      }
      setQ(payload);
      setStatus('ready');
    } catch (err) {
      setStatus('error');
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.includes('429') ? 'Rate limited — wait a moment and try again.' : msg);
    }
  }

  // Seed quiz on first mount
  useEffect(() => {
    void loadNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onAnswer(key: 'A' | 'B' | 'C' | 'D') {
    if (status !== 'ready' || !q) return;
    setSelected(key);
    setStatus('answered');
    pushQuizTurn({
      role: 'user',
      content: `User chose ${key}. Correct answer: ${q.answer}.`,
    });
  }

  return (
    <div className="chat">
      {status === 'loading' && (
        <div className="chat-msg assistant">Generating question…</div>
      )}

      {status === 'error' && (
        <div className="chat-msg assistant quiz-error-msg">
          <span>{error}</span>
          <button type="button" className="quiz-retry-btn" onClick={loadNext}>
            Try again
          </button>
        </div>
      )}

      {q && (status === 'ready' || status === 'answered') && (
        <div className="quiz-card">
          <div className="quiz-question">{q.question}</div>
          <div className="quiz-options">
            {(['A', 'B', 'C', 'D'] as const).map((key) => {
              let extra = '';
              if (status === 'answered') {
                if (key === q.answer) extra = ' is-correct';
                else if (key === selected) extra = ' is-wrong';
              }
              return (
                <button
                  key={key}
                  type="button"
                  className={`quiz-option${extra}`}
                  disabled={status === 'answered'}
                  onClick={() => onAnswer(key)}
                >
                  <span className="quiz-option-key">{key}</span>
                  <span className="quiz-option-text">{q.options[key]}</span>
                </button>
              );
            })}
          </div>

          {status === 'answered' && selected && (
            <>
              <div
                className={`quiz-feedback ${selected === q.answer ? 'is-correct' : 'is-wrong'}`}
              >
                <span className="quiz-result-icon">
                  {selected === q.answer ? '✓' : '✗'}
                </span>
                <span>
                  {selected === q.answer ? (
                    'Correct! '
                  ) : (
                    <>Incorrect — the answer is <strong>{q.answer}</strong>. </>
                  )}
                  {q.explanation}
                </span>
              </div>
              <div className="quiz-actions">
                <button type="button" className="quiz-next-btn" onClick={loadNext}>
                  Next question →
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
