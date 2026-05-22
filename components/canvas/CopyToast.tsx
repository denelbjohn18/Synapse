'use client';

import { useEffect, useState } from 'react';
import { useUiStore } from '@/stores/useUiStore';

export function CopyToastHost() {
  const toast = useUiStore((s) => s.toast);
  const hideToast = useUiStore((s) => s.hideToast);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const t = window.setTimeout(() => {
      setVisible(false);
      window.setTimeout(hideToast, 250);
    }, 1800);
    return () => window.clearTimeout(t);
  }, [toast, hideToast]);

  if (!toast) return null;
  return <div className={`copy-toast${visible ? ' is-visible' : ''}`}>{toast.message}</div>;
}
