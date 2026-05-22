'use client';

import { useRef, useState } from 'react';
import { Dropdown, type DropdownItem } from '@/components/primitives/Dropdown';
import { useUiStore } from '@/stores/useUiStore';

type Props = {
  copyLabel?: string;
  onCopy?: () => void | string | Promise<string | void>;
  onDelete?: () => void;
  extra?: DropdownItem[];
};

/**
 * Card-corner three-dot menu. Used by Explain/ELI5/Fact/Image/Video/Artifact cards.
 *
 * If onCopy returns a string, it's used as the toast message; otherwise the menu
 * shows a generic "Copied" toast. If onCopy returns void (e.g. it called
 * navigator.clipboard.writeText itself), no toast is shown unless explicitly added.
 */
export function CardMenu({ copyLabel = 'Copy', onCopy, onDelete, extra }: Props) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const showToast = useUiStore((s) => s.showToast);

  const items: DropdownItem[] = [];
  if (onCopy) {
    items.push({
      label: copyLabel,
      onClick: async () => {
        const result = await onCopy();
        if (typeof result === 'string') showToast(result);
        else showToast('Copied');
      },
    });
  }
  if (extra) items.push(...extra);
  if (onDelete) items.push({ label: 'Delete', onClick: onDelete, danger: true });

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`card-menu-btn${open ? ' is-active' : ''}`}
        aria-label="Card options"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        ···
      </button>
      <Dropdown
        anchorRef={btnRef}
        open={open}
        onClose={() => setOpen(false)}
        items={items}
      />
    </>
  );
}
