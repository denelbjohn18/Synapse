/**
 * Typed wrappers around the existing Vercel Functions in /api.
 * These match the shapes /api/ask.js, /api/images.js, /api/youtube.js produce today.
 */

export type AskHistoryTurn = { role: 'user' | 'assistant'; content: string };

export type AskBaseBody = {
  prompt: string;
  topic?: string;
  history?: AskHistoryTurn[];
  image?: string | null;
};

export type ClusterContext = {
  prompt: string;
  explain: string;
  eli5: string;
  fact: string;
};

export type BoardContextEntry = ClusterContext;

export type AskTextResponse = { text: string };
export type AskTermsResponse = { imageTerms: string[]; videoTerms: string[] };
export type AskQuizPayload = {
  question: string;
  options: { A: string; B: string; C: string; D: string };
  answer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
};

export type YouTubeResult = { videoId: string; title: string; thumbnail: string };

async function postAsk<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/ask', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`ask failed (${res.status}): ${detail}`);
  }
  return (await res.json()) as T;
}

export const askApi = {
  eli5: (body: AskBaseBody) => postAsk<AskTextResponse>({ mode: 'eli5', ...body }),
  terms: (body: AskBaseBody) => postAsk<AskTermsResponse>({ mode: 'terms', ...body }),
  explain: (body: AskBaseBody) => postAsk<AskTextResponse>({ mode: 'explain', ...body }),
  fact: (body: AskBaseBody) => postAsk<AskTextResponse>({ mode: 'fact', ...body }),
  artifact: (body: AskBaseBody & { type?: string }) =>
    postAsk<AskTextResponse>({ mode: 'artifact', ...body }),
  quiz: (body: AskBaseBody & { boardContext: BoardContextEntry[] }) =>
    postAsk<AskTextResponse>({ mode: 'quiz', ...body }),
  followup: (body: AskBaseBody & { clusterContext: ClusterContext }) =>
    postAsk<AskTextResponse>({ mode: 'followup', ...body }),
};

export async function fetchImages(query: string): Promise<string[]> {
  const res = await fetch(`/api/images?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`images failed (${res.status})`);
  return (await res.json()) as string[];
}

export async function fetchYouTube(query: string): Promise<YouTubeResult[]> {
  const res = await fetch(`/api/youtube?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`youtube failed (${res.status})`);
  return (await res.json()) as YouTubeResult[];
}

export function parseQuizPayload(text: string): AskQuizPayload | null {
  try {
    return JSON.parse(text) as AskQuizPayload;
  } catch {
    return null;
  }
}
