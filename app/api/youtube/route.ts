import { NextRequest, NextResponse } from 'next/server';

const YT_URL = 'https://www.googleapis.com/youtube/v3/search';

export async function GET(req: NextRequest) {
  if (!process.env.YOUTUBE_API_KEY) {
    return NextResponse.json({ error: 'YOUTUBE_API_KEY is not set' }, { status: 500 });
  }

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (!q) return NextResponse.json({ error: 'q is required' }, { status: 400 });

  const url =
    YT_URL +
    '?' +
    new URLSearchParams({
      key: process.env.YOUTUBE_API_KEY,
      q,
      part: 'snippet',
      type: 'video',
      maxResults: '2',
      safeSearch: 'moderate',
      videoEmbeddable: 'true',
    });

  try {
    const r = await fetch(url);
    if (!r.ok) {
      const t = await r.text();
      return NextResponse.json({ error: `YouTube ${r.status}`, detail: t.slice(0, 500) }, { status: r.status });
    }

    const data = await r.json();
    const items = (data.items || [])
      .map((it: any) => ({
        videoId: it.id?.videoId,
        title: it.snippet?.title || '',
        thumbnail:
          it.snippet?.thumbnails?.medium?.url || it.snippet?.thumbnails?.default?.url || '',
      }))
      .filter((v: any) => v.videoId);

    return NextResponse.json(items);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'YouTube request failed', detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}
