---
name: phase3-progress
description: Phase 3 React migration — what's coded, what manual steps remain before runtime works
metadata:
  type: project
---

# Phase 3 React Migration — Code Complete (2026-05-23)

All Phase 3 code is written and the production build passes (`npx next build` ✓). Two manual external configuration steps are required before runtime can actually talk to Supabase.

**Why:** The user asked to migrate the vanilla `main.js` canvas to React on Next.js 16 + Clerk + Supabase, add a Notion-style boards home page per their wireframe, and introduce a new Project → Board → Cluster → Topic hierarchy.

**How to apply:** Any session continuing Phase 3 should (a) verify the two manual steps below were done, (b) sign in via magic link, (c) test the end-to-end flow listed in [[lets-begin-planning-phase3-bubbly-dewdrop]].

---

## Manual steps still pending (BLOCKING runtime)

1. **Run `supabase/migrations/002_boards.sql`** in the Supabase SQL editor. Adds `boards` table, repoints `clusters.board_id`, rewrites RLS to evaluate `auth.jwt() ->> 'sub'` against Clerk's user id.
2. **Create Clerk JWT template named `supabase`** in Clerk dashboard (default claim set is fine — `sub` ships by default). The Supabase client (`lib/supabase/client.ts`) calls `getToken({ template: 'supabase' })` and passes it as `accessToken` to every Supabase request. Without this template, RLS denies everything.

Without either of these, the app loads but every list/CRUD call 401s silently.

---

## What's coded

### Hierarchy
- `projects` (folders) → `boards` (canvases) → `clusters` → `topics`. `boards.project_id` is nullable (unfiled boards live at `/home` root).
- `boards.starred` / `boards.deleted_at` / `boards.last_opened_at` columns drive /starred /trash and the home-page sort.

### Route structure
```
app/
├── page.tsx                  Landing (signed-in → redirect /home)
├── (app)/                    Shell route group (sidebar + topbar)
│   ├── home/                 BoardListPage filter=all
│   ├── starred/              BoardListPage filter=starred
│   ├── trash/                BoardListPage filter=trash (with restore / permanent-delete)
│   ├── projects/             Folder grid
│   └── projects/[projectId]/ BoardListPage filter=project
└── (canvas)/                 Canvas route group (no shell — full frame)
    └── boards/[boardId]/     StudyCanvas (migrated main.js)
```

### Canvas component map (mirrors main.js architecture)
- `StudyCanvas` — composes ClusterRail + canvas-scroll + Sidecar; owns ref-map for scrollIntoView
- `ClusterRail` — logo + dot per cluster, click → scroll
- `StickiesLayer` + `StickyBoard` — local-only contentEditable; first sticky's text feeds `useCanvasStore.stickyTopic` which is sent as `topic` to every ask
- `Cluster` + `ClusterHeader` + `cards/{Explain,Eli5,Fact,Images,Videos,Artifact}Card`
- `Sidecar` — Tabs (Ask/Quiz) + chat list + composer (textarea autosize, mic, file, send) + FollowUpToggle
- `QuizPanel` — seeds question on mount, MCQ with green/red feedback, "Next question →"
- `CardMenu` — portal-rendered dropdown; copy/delete (slot-aware)
- `CopyToastHost` — single mounted instance fed by `useUiStore.showToast`

### State
- `useBoardsStore` / `useProjectsStore` — list + optimistic CRUD
- `useCanvasStore` — mirrors main.js's `state` (clusters, askMessages, history, focusedClusterId, followUpMode, pendingImage, stickyTopic); `clear()` on board unmount
- `useUiStore` — toast + sidebar search

### Hooks
- `useBoards` — loads ALL of user's boards once; filters in memory client-side
- `useProjects` — loads projects once
- `useBoard(boardId)` — loads board + clusters + topics, hydrates canvas store, bumps `last_opened_at`
- `useCanvas(boardId)` — `handleAsk` (parallel ELI5/terms→imgs+vids/explain/fact + Supabase persistence), `handleFollowUp`, `fetchNextQuiz`
- `useSpeechRecognition` — Web Speech API wrapper with feature gate

### Services
- `lib/services/boards.ts` — listAllBoards / filterBoards (in-memory) / CRUD / star / soft-delete / restore / touchLastOpened / moveBoardToProject
- `lib/services/projects.ts` — CRUD
- `lib/services/clusters.ts` — createCluster / listByBoard (joined with topics)
- `lib/services/topics.ts` — ensureTopicForCluster (one topic row per cluster) + updateTopicSlot (explanation/eli5/fact/images/videos)

### Styling
- `app/globals.css` — entire `style.css` ported verbatim PLUS new `.shell-*`, `.boards-*`, `.dropdown`, `.landing-*` rule sets for the home pages.
- Fonts loaded via `next/font` (`Inter` + `Instrument_Serif`) → CSS vars `--font-inter` / `--font-instrument-serif` → consumed by the palette's `--font-sans` / `--font-serif`.
- Wireframe's blue "+ Create new" button intentionally rendered in `--accent` orange (#E8612A) to match Synapse palette.

---

## Notable decisions

1. **One topic row per cluster** (not one per slot). The ask flow upserts via `ensureTopicForCluster` then `updateTopicSlot` for explain/eli5/fact/images/videos columns. Simpler than the multi-row design memory hinted at; matches what `main.js` actually does (everything lives on one card per slot).
2. **`listAllBoards` + client filtering** instead of per-view queries. Board counts are small (dozens) and this makes optimistic updates trivially correct across views (star a board, navigate to /starred — it's there).
3. **Stickies are local-only** for Phase 3. Persisting them needs a small table and isn't user-facing critical. Carry over in a later phase if needed.
4. **CardMenu portal positioning** uses `useLayoutEffect` + `getBoundingClientRect()` (replaces main.js's ad-hoc document.body append).
5. **Cluster nav dots `is-active`** tracks the last-scrolled-to id (set by `scrollToCluster`), not viewport intersection. Same as main.js — keeps things simple.

---

## What Phase 4 still owes

- Verify Clerk JWT on Vercel Functions (`api/ask.js`, `api/images.js`, `api/youtube.js`) so the backend trusts who's asking.
- Image attachments in `handleAsk` flow through the explain prompt today (data URL in request body) — Vercel limits body to 4.5 MB, may need client resize for phone photos.
- Realtime / multi-tab sync — not started; last-write-wins on `last_opened_at` is acceptable.
