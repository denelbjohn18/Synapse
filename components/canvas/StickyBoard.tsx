'use client';

import { useEffect, useRef } from 'react';

type Props = {
  initialText: string;
  onTextChange?: (text: string) => void;
  onDelete?: () => void;
};

/**
 * Uncontrolled contentEditable sticky note. The DOM owns the text; React only
 * reads it on blur and pushes it back to the parent.
 */
export function StickyBoard({ initialText, onTextChange, onDelete }: Props) {
  const textRef = useRef<HTMLDivElement | null>(null);

  // Set the initial text once on mount; never re-write from props after that
  // (avoids cursor-jump issues with contentEditable).
  useEffect(() => {
    if (textRef.current && textRef.current.innerText !== initialText) {
      textRef.current.innerText = initialText;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="sticky-board">
      <div className="sticky-tape" />
      <div className="sticky-note">
        <div className="sticky-label">TO-DO</div>
        <div
          ref={textRef}
          className="sticky-text"
          contentEditable
          spellCheck={false}
          suppressContentEditableWarning
          onBlur={() => onTextChange?.(textRef.current?.innerText.trim() ?? '')}
          onInput={() => onTextChange?.(textRef.current?.innerText.trim() ?? '')}
        />
        {onDelete && (
          <button
            type="button"
            className="sticky-delete"
            aria-label="Delete sticky"
            onClick={onDelete}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
