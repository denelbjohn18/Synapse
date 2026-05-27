# Synapse — Progress Journal

> Where the project stands. Pair with `README.md` (what it is + the full plan). Update this file as work lands.

**Last updated:** 2026-05-27

---

## Done / working now

- **Vanilla-JS canvas app works locally.** `server.js` serves the static frontend (`index.html`, `main.js`, `style.css`) and proxies three endpoints — `/api/ask` (GPT-4o, dispatched by `mode`), `/api/images` (Tavily), `/api/youtube` (YouTube Data API v3). Run it on `http://localhost:8000`; keys read from `.env.local`.
- **All three interaction modes function:** Ask (new cluster), Follow-up (per-cluster chat), Quiz (MCQ from session data).
- **README rewritten** (root `README.md`) describing the vanilla app.
- Current app is **single-canvas, ephemeral, session-only** — nothing persists across reloads; no auth.

## Abandoned / reverted (do not revive)

- An earlier session attempted a **React + Next.js 16 + Clerk + Supabase migration** and the old `memory/` files claimed it was "Phase 3 code complete (2026-05-23)." **That code is NOT in the repo** — `package.json` has no React/Next/Clerk/Supabase, and there are only 2 commits. The migration was reverted to vanilla JS.
- `node_modules/` still contains leftover `next`, `@clerk/*`, `react`, `sharp` from that attempt — stale, safe to ignore or clean.
- **Decision this session: stay vanilla JS.** Do not resurrect the React branch. The new plan adds Clerk/Supabase/Vercel *on top of* the vanilla app, not via a framework rewrite.

## Decided this session (2026-05-27)

- **Two-page structure:** `index.html` = dashboard, `board.html?id=` = canvas.
- **Thumbnail = screenshot of the first cluster** via `html2canvas`, with the cluster's image routed through a same-origin `/api/img-proxy` so it isn't blank (CORS).
- Stack additions: **Clerk** (auth), **Supabase** (Postgres + Storage, RLS by Clerk `sub`), **Vercel** (deploy via Functions; `vercel dev` locally, retiring `server.js`).
- Memory consolidated to two files: `README.md` + this journal.

## Remaining — the build (none started in code)

Phases from `README.md`:
1. Backend → Vercel Functions (`api/ask|images|youtube`) + Clerk JWT verify + `api/img-proxy` + `vercel.json`.
2. Shared libs (`lib/auth.js`, `lib/supabase.js`, `lib/db.js`) + `schema.sql`.
3. NEW dashboard page (`index.html` / `dashboard.js` / `dashboard.css`).
4. Adapt board page (rename `index.html`→`board.html`; hydrate + persist + thumbnail in `main.js`).
5. Deploy (env vars, Clerk↔Supabase third-party auth, `.env.example`).

## External setup pending (owner action, not code)

- Create a **Clerk** app → publishable + secret keys.
- Create a **Supabase** project → run `schema.sql`, enable Clerk as third-party auth provider, create `thumbnails` Storage bucket.
- Set **Vercel** env vars: `OPENAI_API_KEY`, `YOUTUBE_API_KEY`, `TAVILY_API_KEY`, `CLERK_SECRET_KEY`.
- A prior `.env.local` may already hold Supabase/Clerk/API keys from the reverted attempt — **verify validity before reusing** (the old Supabase project/tables used a different `topics` schema and may be stale).
