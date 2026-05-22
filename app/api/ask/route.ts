import { NextRequest, NextResponse } from 'next/server';

const MODEL = 'gpt-4o';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

type Turn = { role: 'user' | 'assistant'; content: string };
type ClusterCtx = { prompt?: string; explain?: string; eli5?: string; fact?: string };

const SYSTEM: Record<string, (...args: any[]) => string> = {
  eli5: (topic: string) =>
    `You are a brilliant teacher explaining a concept to a curious 5-year-old. ` +
    `Reply in EXACTLY 3 short sentences. Avoid jargon. Use everyday analogies. ` +
    `Current study topic: "${topic}".`,

  explain: (topic: string) =>
    `You are an educational assistant helping students understand complex topics deeply. ` +
    `Current study topic: "${topic}". Build on prior turns in the conversation.\n\n` +
    `Write your explanation using EXACTLY this markdown structure:\n\n` +
    `## What Is It?\n` +
    `One clear sentence. Then explain why it matters in 2-3 sentences.\n\n` +
    `## How Does It Work?\n` +
    `If it's a process: numbered steps with the "why" behind each step.\n` +
    `If it's a concept: break it into 3-5 main parts. Use **bold** for names.\n` +
    `If it's historical: timeline or cause-and-effect chain.\n\n` +
    `## Real Examples\n` +
    `2-3 specific, concrete examples showing how this appears in real life or is actually used.\n\n` +
    `## Why People Get It Wrong\n` +
    `One common misconception and why it's understandable but incorrect.\n\n` +
    `## Why It Matters\n` +
    `How does this connect to other things? What depends on understanding this?\n\n` +
    `## Key Points\n` +
    `3-4 bullet points of what to remember.\n\n` +
    `RULES:\n` +
    `- Write for an intelligent high school student (clear, not simplistic)\n` +
    `- No URLs, links, or citations\n` +
    `- Use markdown: headings, **bold**, bullet points, numbered lists\n` +
    `- Every sentence must earn its place — no fluff\n` +
    `- Use analogies to explain abstract ideas`,

  fact: (topic: string) =>
    `Reply with exactly ONE surprising, memorable, true fact related to the user's question ` +
    `about "${topic}". One sentence only. No preamble like "Here is" — just the fact itself.`,

  terms: (topic: string) =>
    `You generate search terms for a study tool. ` +
    `Given the user's question about "${topic}", reply with ONLY a JSON object of the form ` +
    `{"imageTerms": ["..."], "videoTerms": ["..."]}. ` +
    `imageTerms: 2-3 noun phrases that match Wikipedia article titles (encyclopedic, noun-form). ` +
    `videoTerms: ONE string, 3–6 words, suitable for a YouTube search. ` +
    `No prose, no markdown — JSON only.`,

  artifact: (topic: string) =>
    `Create the requested study aid (mnemonic, analogy, timeline, concept map, etc.) for "${topic}". ` +
    `Be concise, vivid, and memorable. No preamble.`,

  quiz: (topic: string, clusters: ClusterCtx[] = []) => {
    const boardSection =
      clusters.length > 0
        ? '\n\nTHE USER HAS STUDIED THE FOLLOWING MATERIAL THIS SESSION — quiz them ONLY on this content:\n\n' +
          clusters
            .map(
              (c, i) =>
                `[Topic ${i + 1}] "${c.prompt}"\n` +
                `Explanation: ${(c.explain || '').slice(0, 600)}\n` +
                `ELI5: ${(c.eli5 || '').slice(0, 200)}\n` +
                `Fact: ${(c.fact || '').slice(0, 200)}`,
            )
            .join('\n\n')
        : `\n\nNo study material has been added yet — ask a general question about "${topic}".`;
    return (
      `You are an active-recall quiz coach.${boardSection}\n\n` +
      `Generate ONE multiple-choice question with exactly 4 options labeled A, B, C, D. ` +
      `Base the question specifically on the studied material above, not general knowledge. ` +
      `Return ONLY a JSON object — no prose, no markdown wrapper:\n` +
      `{"question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A","explanation":"one sentence why the answer is correct"}. ` +
      `Do not repeat questions from conversation history. Vary difficulty across turns.`
    );
  },

  followup: (topic: string, ctx: ClusterCtx = {}) =>
    `You are a study companion. The user just generated a learning cluster about "${topic}" ` +
    `and is now asking a follow-up question about it.\n\n` +
    `THE CLUSTER THEY ARE ASKING ABOUT:\n` +
    `Original question: ${ctx.prompt || '(unknown)'}\n` +
    `Main explanation: ${ctx.explain || '(not yet generated)'}\n` +
    `ELI5: ${ctx.eli5 || '(not yet generated)'}\n` +
    `Fact: ${ctx.fact || '(not yet generated)'}\n\n` +
    `Answer their follow-up conversationally and concisely (under 150 words). ` +
    `Build on the cluster content above — don't restate it, deepen it. ` +
    `If they ask something tangential, gently bring it back.`,
};

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY is not set' }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const { mode, prompt, topic = 'general study', history = [], image, clusterContext, boardContext } = body || {};

  if (!mode || !prompt) {
    return NextResponse.json({ error: 'mode and prompt are required' }, { status: 400 });
  }
  if (!SYSTEM[mode]) {
    return NextResponse.json({ error: `unknown mode: ${mode}` }, { status: 400 });
  }

  const systemContent =
    mode === 'followup'
      ? SYSTEM.followup(topic, clusterContext || {})
      : mode === 'quiz'
        ? SYSTEM.quiz(topic, Array.isArray(boardContext) ? boardContext : [])
        : SYSTEM[mode](topic);

  const messages: any[] = [{ role: 'system', content: systemContent }];

  if (mode === 'explain' || mode === 'quiz' || mode === 'followup') {
    for (const turn of (history as Turn[]).slice(-8)) {
      if (turn?.role && turn?.content) {
        messages.push({ role: turn.role, content: String(turn.content) });
      }
    }
  }

  if (mode === 'explain' && image && typeof image === 'string' && image.startsWith('data:')) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: image } },
      ],
    });
  } else {
    messages.push({ role: 'user', content: prompt });
  }

  const payload: any = {
    model: MODEL,
    messages,
    temperature: mode === 'fact' ? 0.9 : 0.7,
  };
  if (mode === 'terms' || mode === 'quiz') payload.response_format = { type: 'json_object' };
  if (mode === 'eli5') payload.max_tokens = 200;
  if (mode === 'fact') payload.max_tokens = 100;
  if (mode === 'followup') payload.max_tokens = 300;

  try {
    const r = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const t = await r.text();
      return NextResponse.json({ error: `OpenAI ${r.status}`, detail: t.slice(0, 500) }, { status: r.status });
    }

    const data = await r.json();
    const text: string = data?.choices?.[0]?.message?.content || '';

    if (mode === 'terms') {
      try {
        const parsed = JSON.parse(text);
        return NextResponse.json({
          imageTerms: Array.isArray(parsed.imageTerms) ? parsed.imageTerms.slice(0, 3) : [],
          videoTerms: Array.isArray(parsed.videoTerms)
            ? parsed.videoTerms.slice(0, 3)
            : typeof parsed.videoTerms === 'string'
              ? [parsed.videoTerms]
              : [],
        });
      } catch {
        return NextResponse.json({ imageTerms: [prompt], videoTerms: [prompt] });
      }
    }

    return NextResponse.json({ text: text.trim() });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'OpenAI request failed', detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}
