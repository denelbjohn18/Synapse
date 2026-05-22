import { NextRequest, NextResponse } from 'next/server';

const IMG_EXT = /\.(jpe?g|png|webp|gif|svg|avif|bmp|tiff?)(\?|$)/i;
const CDN_HOSTS = [
  'cloudinary.com', 'cloudfront.net', 'akamaized.net',
  'wikimedia.org', 'wikipedia.org', 'imgur.com', 'twimg.com', 'staticflickr.com',
];

function isImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  if (IMG_EXT.test(url)) return true;
  try {
    const h = new URL(url).hostname;
    return h.startsWith('cdn.') || h.startsWith('images.') || CDN_HOSTS.some((d) => h.endsWith(d));
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!process.env.TAVILY_API_KEY) {
    return NextResponse.json({ error: 'TAVILY_API_KEY is not set' }, { status: 500 });
  }

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (!q) return NextResponse.json({ error: 'missing q' }, { status: 400 });

  try {
    const r = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: q,
        include_images: true,
        max_results: 10,
      }),
    });

    if (!r.ok) {
      const text = await r.text();
      return NextResponse.json({ error: 'tavily error', detail: text }, { status: r.status });
    }

    const data = await r.json();
    const urls = (data.images || [])
      .map((img: string | { url: string }) => (typeof img === 'string' ? img : img.url))
      .filter(isImageUrl)
      .slice(0, 3);

    return NextResponse.json(urls, {
      headers: { 'Cache-Control': 's-maxage=300' },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'images request failed', detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}
