// Matches URLs that end with a recognized image extension (before any query string).
const IMG_EXT = /\.(jpe?g|png|webp|gif|svg|avif|bmp|tiff?)(\?|$)/i;
// Hostnames known to serve images without a file extension.
const CDN_HOSTS = ['cloudinary.com', 'cloudfront.net', 'akamaized.net',
  'wikimedia.org', 'wikipedia.org', 'imgur.com', 'twimg.com', 'staticflickr.com'];

function isImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  if (IMG_EXT.test(url)) return true;
  try {
    const h = new URL(url).hostname;
    return h.startsWith("cdn.") || h.startsWith("images.") || CDN_HOSTS.some((d) => h.endsWith(d));
  } catch { return false; }
}

export default async function handler(req, res) {
  if (!process.env.TAVILY_API_KEY) {
    return res.status(500).json({ error: "TAVILY_API_KEY is not set" });
  }

  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) return res.status(400).json({ error: "missing q" });

  try {
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: q,
        include_images: true,
        max_results: 10,
      }),
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: "tavily error", detail: text });
    }

    const data = await r.json();
    const urls = (data.images || [])
      .map((img) => (typeof img === "string" ? img : img.url))
      .filter(isImageUrl)
      .slice(0, 3);

    res.setHeader("Cache-Control", "s-maxage=300");
    return res.json(urls);
  } catch (err) {
    return res.status(500).json({ error: "images request failed", detail: String(err?.message || err) });
  }
}
