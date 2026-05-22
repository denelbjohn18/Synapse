/**
 * Compact, Notion-style relative date label.
 * Always renders consistently on client (callers should gate with useEffect/useState
 * if absolute date strings would cause SSR hydration mismatches).
 */
export function relativeDate(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  const diffHr = Math.round(diffMs / 3_600_000);
  const diffDay = Math.round(diffMs / 86_400_000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  const month = d.toLocaleString('en-US', { month: 'short' });
  const day = d.getDate();
  const sameYear = d.getFullYear() === now.getFullYear();
  return sameYear ? `${month} ${day}` : `${month} ${day}, ${d.getFullYear()}`;
}
