'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, Paperclip } from 'lucide-react';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { useCanvas } from '@/lib/hooks/useCanvas';
import { useSpeechRecognition } from '@/lib/hooks/useSpeechRecognition';
import { QuizPanel } from './QuizPanel';

type Props = { boardId: string };

export function Sidecar({ boardId }: Props) {
  const activeMode = useCanvasStore((s) => s.activeMode);
  const setActiveMode = useCanvasStore((s) => s.setActiveMode);
  const followUpMode = useCanvasStore((s) => s.followUpMode);
  const setFollowUpMode = useCanvasStore((s) => s.setFollowUpMode);
  const setFocusedClusterId = useCanvasStore((s) => s.setFocusedClusterId);
  const clusters = useCanvasStore((s) => s.clusters);
  const askMessages = useCanvasStore((s) => s.askMessages);
  const focusedClusterId = useCanvasStore((s) => s.focusedClusterId);
  const pendingImage = useCanvasStore((s) => s.pendingImage);
  const setPendingImage = useCanvasStore((s) => s.setPendingImage);

  const { handleAsk, handleFollowUp } = useCanvas(boardId);

  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);

  // Whichever data source feeds the visible chat
  const focusedCluster = clusters.find((c) => c.id === focusedClusterId) ?? null;
  const messages = useMemo(
    () => (followUpMode ? focusedCluster?.followUpHistory ?? [] : askMessages),
    [followUpMode, focusedCluster, askMessages],
  );

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages.length]);

  // Textarea autosize
  function autosize() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(160, ta.scrollHeight) + 'px';
  }
  useEffect(autosize, [draft]);

  // Web Speech mic
  const mic = useSpeechRecognition({ onTranscript: (text) => setDraft(text) });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || submitting) return;
    setDraft('');
    setSubmitting(true);
    try {
      if (followUpMode) await handleFollowUp(text);
      else await handleAsk(text);
    } finally {
      setSubmitting(false);
    }
  }

  function toggleFollowUp() {
    if (clusters.length === 0) return;
    if (followUpMode) {
      setFollowUpMode(false);
      setFocusedClusterId(null);
    } else {
      const last = clusters[clusters.length - 1];
      setFocusedClusterId(last.id);
      setFollowUpMode(true);
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPendingImage(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);
  }

  const placeholder = followUpMode ? 'Follow up on this cluster…' : 'Ask something to study…';

  return (
    <aside className="sidecar">
      <div className="tabs">
        <button
          type="button"
          className={`tab${activeMode === 'ask' ? ' is-active' : ''}`}
          onClick={() => setActiveMode('ask')}
        >
          ASK
        </button>
        <button
          type="button"
          className={`tab${activeMode === 'quiz' ? ' is-active' : ''}`}
          onClick={() => setActiveMode('quiz')}
        >
          QUIZ
        </button>
      </div>

      {activeMode === 'ask' ? (
        <div ref={chatRef} className="chat">
          {messages.map((m, i) => (
            <div key={i} className={`chat-msg ${m.role}`}>
              {m.content}
            </div>
          ))}
        </div>
      ) : (
        <QuizPanel boardId={boardId} />
      )}

      {activeMode === 'ask' && (
        <form className="composer" onSubmit={onSubmit}>
          <button
            type="button"
            className={`followup-toggle${followUpMode ? ' is-on' : ''}`}
            disabled={clusters.length === 0}
            onClick={toggleFollowUp}
            title={
              followUpMode
                ? 'Click to turn off follow-up'
                : 'Chat about the most recent cluster'
            }
          >
            <span className="followup-icon">↳</span>
            <span className="followup-label">
              {followUpMode && focusedCluster
                ? `Following up on: "${focusedCluster.prompt}"`
                : 'Follow-up'}
            </span>
          </button>

          <textarea
            ref={taRef}
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e);
              }
            }}
          />

          <div className="composer-row">
            <button
              type="button"
              className="iconbtn"
              aria-label="Attach image"
              title={pendingImage ? 'Image attached' : 'Attach image'}
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip size={16} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={onFileChange}
            />

            <button
              type="button"
              className={`iconbtn${mic.recording ? ' is-recording' : ''}`}
              disabled={!mic.supported}
              aria-label={mic.recording ? 'Stop' : 'Voice input'}
              title={mic.supported ? 'Voice input' : 'Not supported'}
              onClick={mic.toggle}
            >
              <Mic size={16} />
            </button>

            <button
              type="submit"
              className="sendbtn"
              disabled={submitting || !draft.trim()}
            >
              {submitting ? 'Sending…' : 'Send'}
            </button>
          </div>
        </form>
      )}
    </aside>
  );
}
