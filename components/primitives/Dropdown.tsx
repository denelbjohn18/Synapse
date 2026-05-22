'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

export type DropdownItem = {
  label: string;
  onClick: () => void;
  danger?: boolean;
};

type Props = {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  items: DropdownItem[];
  align?: 'left' | 'right';
};

export function Dropdown({ anchorRef, open, onClose, items, align = 'right' }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setPos(null);
      return;
    }
    const rect = anchorRef.current.getBoundingClientRect();
    const width = 200; // estimate; CSS min-width is 180
    const left = align === 'right' ? rect.right - width : rect.left;
    const top = rect.bottom + 6;
    setPos({ top, left });
  }, [open, anchorRef, align]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!mounted || !open || !pos) return null;

  return createPortal(
    <div
      ref={ref}
      className="dropdown"
      style={{ top: pos.top, left: pos.left }}
      role="menu"
    >
      {items.map((item, i) => (
        <button
          key={i}
          type="button"
          role="menuitem"
          className={clsx('dropdown-item', item.danger && 'dropdown-item--danger')}
          onClick={() => {
            item.onClick();
            onClose();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}
