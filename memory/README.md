# Synapse — Project Knowledge & Plan

> Onboarding doc for any session. Read this + `PROGRESS.md` to understand what Synapse is, where it stands, and what to build next.

---

## What It Is

Synapse (branded "StudyBoard") is a browser-based personal learning canvas. One prompt generates a full **"learning cluster"** — a detailed explanation, ELI5, a surprising fact, images, and videos — all laid out spatially on an infinite scrollable board.

**Why it exists:** replaces the 5-tab study loop (LLM + Google Images + YouTube + ELI5 + losing everything on tab close). One question, one complete answer, no tab switching.

**Who it's for:** self-directed individual learners who want all study tools in one place.

---

## How It Works (current canvas)

**Per-prompt flow** — 4 parallel GPT-4o calls (explain, ELI5, fact, search terms). Search terms feed Tavily (images) and YouTube Data API v3 (videos). Everything renders as a color-coded cluster of cards on the canvas.

**Interaction modes:**
- **Ask** — generates a new learning cluster on the canvas.
- **Follow-up** — chat about a specific cluster without generating a new one.
- **Quiz** — GPT-4o generates multiple-choice questions from session study data.

**Layout:** left rail (logo + cluster-nav dots) · infinite canvas (clusters + sticky notes) · right sidecar (ASK / QUIZ tabs + composer).

---

## Tech Stack (PRESERVE THIS — no framework migration)

- **Frontend:** plain HTML + CSS + vanilla JS, no framework, no build step.
  - `index.html`, `main.js` (~915 lines), `style.css`.
- **Backend:** `server.js` — a vanilla Node HTTP server that serves static files and proxies 3 endpoints (`/api/ask`, `/api/images`, `/api/youtube`). API keys never reach the browser.
- **AI:** OpenAI GPT-4o. **Images:** Tavily. **Videos:** YouTube Data API v3.
- **Node:** ≥18. Keys live in `.env.local` (gitignored; see `.env.example`).

> NOTE: an earlier React + Next.js migration was attempted and **reverted**. Do not resurrect it. Stay vanilla JS. See `PROGRESS.md`.

### Current frontend internals (reuse these when building)
- Single `state` object: `activeMode`, `followUpMode`, `focusedClusterId`, `askMessages`, `history`, `quizHistory`, `clusters[]`, `pendingImage`.
- Each cluster in memory: `{ id: "c"+Date.now(), el, prompt, followUpHistory[] }`. Image URLs / video ids currently live only in the DOM.
- Key functions: `handleAsk` (~main.js:97), `mountClusterSkeleton` (~main.js:318), `postAsk` (~main.js:637 — the single fetch path for all modes), `buildClusterContext` (~main.js:872), `handleFollowUp` (~main.js:882).
- `/api/ask` is one endpoint dispatched by a `mode` field (eli5 / terms / explain / fact / quiz / followup).

---

## The Plan: Multi-Board Workspace + Auth + Persistence + Deploy

**Vision:** turn the single ephemeral canvas into a deployable, multi-user product. A **dashboard homepage** lists many boards (Home / Starred / Projects, search, create, delete, star, per-board thumbnail). Each board is the existing canvas. Add Clerk auth, Supabase persistence, deploy on Vercel.

### Architecture
- **Two-page vanilla app:**
  - `index.html` + `dashboard.js` + `dashboard.css` — NEW dashboard.
  - `board.html` + `main.js` — the existing canvas (current `index.html` renamed to `board.html`). Opened as `board.html?id=<uuid>`.
- **Backend:** migrate `server.js` logic into **Vercel Functions** (`api/ask.js`, `api/images.js`, `api/youtube.js`) as `(req,res)` handlers, each verifying a Clerk JWT. Add `api/img-proxy.js` (same-origin image proxy, host-allowlisted) for thumbnails. `vercel.json` with `cleanUrls`. Local dev via `vercel dev` (retire `server.js`).
- **Auth:** Clerk vanilla JS SDK (`@clerk/clerk-js` via CDN). Guards both pages; profile avatar opens Clerk.
- **Data:** Supabase (Postgres + Storage). Frontend uses `@supabase/supabase-js` directly with **Row Level Security** keyed to the Clerk user id (`auth.jwt() ->> 'sub'`) via Clerk↔Supabase third-party auth. Clerk publishable key + Supabase URL/anon key are public by design → committed `config.js`. Secrets stay in `.env.local` / Vercel env.

### Data model (Supabase)
```sql
projects (id uuid pk, user_id text, name text, created_at)
boards   (id uuid pk, user_id text, project_id uuid null -> projects,
          name text, starred bool, thumbnail_url text, sticky_topic text,
          created_at, last_opened_at)
clusters (id text pk /* keep "c"+timestamp */, board_id uuid -> boards,
          user_id text, prompt text, explain_text, eli5_text, fact_text,
          image_urls jsonb, video_ids jsonb, follow_up_history jsonb,
          cluster_index int, created_at)
```
- RLS on all three: `using (user_id = auth.jwt()->>'sub')` for every op.
- Storage bucket `thumbnails` (public read), path `{user_id}/{board_id}.png`.
- A board belongs to 0 or 1 project (loose boards = Home). No many-to-many for v1.

### Thumbnails
Screenshot of the board's **first cluster** (confirmed with user). Before capture, swap the cluster's external image `src` to a same-origin `/api/img-proxy?url=...` so it renders (Tavily/YouTube images are cross-origin and would otherwise come out blank). `html2canvas(clusterEl)` → PNG blob → Supabase Storage → save `boards.thumbnail_url`.

### Implementation phases
1. **Backend / Vercel Functions + auth** — recreate `api/*` from `server.js` logic (server.js:104–223), add Clerk `verifyToken`, add `api/img-proxy.js`, add `vercel.json`; retire `server.js`.
2. **Shared libs + schema** — `lib/auth.js` (Clerk guard + `getToken`), `lib/supabase.js` (client bound to Clerk token), `lib/db.js` (CRUD + thumbnail upload), `schema.sql` (tables + RLS + bucket).
3. **Dashboard page (NEW)** — `index.html`/`dashboard.css`/`dashboard.js` matching the reference mockup; render board rows (thumbnail · name · last-opened · ★ · ⋮ menu), Home/Starred/Projects nav, search, Create New → `board.html?id=`, profile → Clerk.
4. **Board page (adapt)** — rename `index.html`→`board.html`; in `main.js` reuse the functions listed above and add: read `?id=`, hydrate clusters from DB, auth header on `postAsk`, `saveCluster`/`updateFollowUp`/`saveStickyTopic`/`touchLastOpened`, first-cluster thumbnail capture.
5. **Deploy** — `vercel.json`, Vercel env vars, Clerk↔Supabase third-party auth, update `.env.example`.

### Env vars
- **Server-side (secret):** `OPENAI_API_KEY`, `YOUTUBE_API_KEY`, `TAVILY_API_KEY`, `CLERK_SECRET_KEY`.
- **Client-side (public, in `config.js`):** Clerk publishable key, Supabase URL, Supabase anon key.
- Do **not** transcribe real key values into any committed doc.

---

## Verification (end-to-end)
`vercel dev` → sign in (Clerk) → dashboard → Create New → ask a question → cluster + board rows appear in Supabase → first-cluster thumbnail in Storage/dashboard → reload board hydrates from DB (no re-generation) → star / project / search / delete work → a second Clerk user sees none of the first user's boards (RLS) → repeat against the deployed Vercel URL.
