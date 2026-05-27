import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse as parseQuery } from "querystring";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
const env = {};
const envFile = fs.readFileSync(".env.local", "utf-8");
envFile.split("\n").forEach((line) => {
  const [key, value] = line.split("=");
  if (key && value) env[key.trim()] = value.trim();
});

const PORT = 8000;

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // Serve static files
  if (req.url === "/" || req.url === "/index.html") {
    res.setHeader("Content-Type", "text/html");
    res.end(fs.readFileSync(path.join(__dirname, "index.html")));
    return;
  }

  if (req.url.endsWith(".css")) {
    res.setHeader("Content-Type", "text/css");
    res.end(fs.readFileSync(path.join(__dirname, req.url)));
    return;
  }

  if (req.url.endsWith(".js")) {
    res.setHeader("Content-Type", "application/javascript");
    res.end(fs.readFileSync(path.join(__dirname, req.url)));
    return;
  }

  // API: /api/ask
  if (req.url === "/api/ask" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body);
        const result = await callOpenAI(payload, env);
        res.setHeader("Content-Type", "application/json");
        res.writeHead(200);
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API: /api/youtube
  if (req.url.startsWith("/api/youtube") && req.method === "GET") {
    const query = new URL(req.url, `http://localhost:${PORT}`).searchParams.get("q");
    try {
      const result = await callYouTube(query, env);
      res.setHeader("Content-Type", "application/json");
      res.writeHead(200);
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API: /api/images
  if (req.url.startsWith("/api/images") && req.method === "GET") {
    const query = new URL(req.url, `http://localhost:${PORT}`).searchParams.get("q");
    try {
      const result = await callTavily(query, env);
      res.setHeader("Content-Type", "application/json");
      res.writeHead(200);
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

async function callOpenAI(payload, env) {
  const { mode, prompt, topic, history, image, boardContext } = payload;

  const systemPrompt = getSystemPrompt(mode, topic);
  const messages = [{ role: "system", content: systemPrompt }];

  if (history && history.length > 0) {
    messages.push(...history);
  }

  messages.push({ role: "user", content: prompt });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI error: ${response.status} ${error}`);
  }

  const data = await response.json();
  const text = data.choices[0].message.content;

  if (mode === "terms") {
    try {
      return JSON.parse(text);
    } catch {
      return { imageTerms: [], videoTerms: [] };
    }
  }

  return { text };
}

function getSystemPrompt(mode, topic) {
  const prompts = {
    eli5: `You are a brilliant teacher explaining a concept to a curious 5-year-old. Reply in EXACTLY 3 short sentences. Avoid jargon. Use everyday analogies. Current study topic: "${topic}".`,
    explain: `You are an educational assistant helping students understand complex topics deeply. Current study topic: "${topic}". Build on prior turns in the conversation.

Write your explanation using EXACTLY this markdown structure:

## What Is It?
One clear sentence. Then explain why it matters in 2-3 sentences.

## How Does It Work?
If it's a process: numbered steps with the "why" behind each step.
If it's a concept: break it into 3-5 main parts. Use **bold** for names.
If it's historical: timeline or cause-and-effect chain.

## Real Examples
2-3 specific, concrete examples showing how this appears in real life or is actually used.

## Why People Get It Wrong
One common misconception and why it's understandable but incorrect.

## Why It Matters
How does this connect to other things? What depends on understanding this?

## Key Points
3-4 bullet points of what to remember.

RULES:
- Write for an intelligent high school student (clear, not simplistic)
- No URLs, links, or citations
- Use markdown: headings, **bold**, bullet points, numbered lists
- Every sentence must earn its place — no fluff
- Use analogies to explain abstract ideas`,
    fact: `Reply with exactly ONE surprising, memorable, true fact related to the user's question about "${topic}". One sentence only. No preamble like "Here is" — just the fact itself.`,
    terms: `You generate search terms for a study tool. Given the user's question about "${topic}", reply with ONLY a JSON object of the form {"imageTerms": ["..."], "videoTerms": ["..."]}. imageTerms: 2-3 noun phrases that match Wikipedia article titles (encyclopedic, noun-form). videoTerms: 2-3 search terms that would find great educational videos on YouTube.`,
    quiz: `You are a quiz question generator. Generate ONE multiple-choice question based on the user's study content. Reply with ONLY valid JSON (no markdown, no explanation) matching this format exactly: {"question": "...", "options": {"A": "...", "B": "...", "C": "...", "D": "..."}, "answer": "A", "explanation": "..."}`,
  };

  return prompts[mode] || prompts.explain;
}

async function callYouTube(query, env) {
  const apiKey = env.YOUTUBE_API_KEY;
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=2&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`YouTube API error: ${response.status}`);

  const data = await response.json();
  return data.items.map((item) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    thumbnail: item.snippet.thumbnails.medium.url,
  }));
}

async function callTavily(query, env) {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: env.TAVILY_API_KEY,
      query: query,
      include_images: true,
      max_results: 3,
    }),
  });

  if (!response.ok) throw new Error(`Tavily API error: ${response.status}`);

  const data = await response.json();
  return (data.images || []).map((img) => ({
    url: img,
    title: "Image",
  }));
}

server.listen(PORT, () => {
  console.log(`\n✨ Synapse running at http://localhost:${PORT}`);
  console.log(`API calls will use credentials from .env.local\n`);
});
