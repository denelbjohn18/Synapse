'use client';

import { useMemo } from 'react';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}

/**
 * Verbatim port of renderMarkdown() in main.js. Trusted output from our own
 * OpenAI proxy, so innerHTML injection is acceptable here.
 */
function renderMarkdown(text: string): string {
  const lines = text.split('\n');
  let html = '';
  let listType: 'ul' | 'ol' | null = null;

  const inline = (s: string): string =>
    escapeHtml(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');

  const closeList = () => {
    if (listType) {
      html += `</${listType}>`;
      listType = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    const olMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (line.startsWith('## ')) {
      closeList();
      html += `<h2>${inline(line.slice(3))}</h2>`;
    } else if (line.startsWith('### ')) {
      closeList();
      html += `<h3>${inline(line.slice(4))}</h3>`;
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (listType !== 'ul') {
        closeList();
        html += '<ul>';
        listType = 'ul';
      }
      html += `<li>${inline(line.slice(2))}</li>`;
    } else if (olMatch) {
      if (listType !== 'ol') {
        closeList();
        html += '<ol>';
        listType = 'ol';
      }
      html += `<li>${inline(olMatch[2])}</li>`;
    } else if (line === '') {
      closeList();
    } else {
      closeList();
      html += `<p>${inline(line)}</p>`;
    }
  }
  closeList();
  return html;
}

export function Markdown({ text }: { text: string }) {
  const html = useMemo(() => renderMarkdown(text), [text]);
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
