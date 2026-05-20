// Vercel Function — proxies YouTube Data API v3 search.list
// Request:  GET /api/youtube?q=...
// Response: [{ title, thumbnail, videoId }]

const YT_URL = "https://www.googleapis.com/youtube/v3/search";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!process.env.YOUTUBE_API_KEY) {
    return res.status(500).json({ error: "YOUTUBE_API_KEY is not set" });
  }

  const q = (req.query?.q || "").toString().trim();
  if (!q) return res.status(400).json({ error: "q is required" });

  const url = YT_URL + "?" + new URLSearchParams({
    key: process.env.YOUTUBE_API_KEY,
    q,
    part: "snippet",
    type: "video",
    maxResults: "2",
    safeSearch: "moderate",
    videoEmbeddable: "true",
  });

  try {
    const r = await fetch(url);
    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).json({ error: `YouTube ${r.status}`, detail: t.slice(0, 500) });
    }
    const data = await r.json();
    const items = (data.items || []).map((it) => ({
      videoId: it.id?.videoId,
      title: it.snippet?.title || "",
      thumbnail: it.snippet?.thumbnails?.medium?.url || it.snippet?.thumbnails?.default?.url || "",
    })).filter((v) => v.videoId);

    return res.status(200).json(items);
  } catch (err) {
    return res.status(500).json({ error: "YouTube request failed", detail: String(err?.message || err) });
  }
}
