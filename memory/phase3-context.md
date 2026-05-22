---
name: phase3-context
description: Phase 3 React migration planning — components, state management, Supabase integration, and user design context
metadata:
  type: project
---

# Phase 3: React Migration — Complete Context

**Phase Status:** Not started (ready to begin)  
**Phase 3 Start Date:** 2026-05-22 (ready for next session)  
**Estimated Duration:** 8-10 hours

---

## What Phase 3 Is

Convert the 915-line vanilla JS canvas app into a React component hierarchy with full project management, Supabase integration, and persistent state.

**Key constraint:** User has an existing design for the home/projects page (Option B: full-featured). Implement that design, not a minimal sidebar.

---

## Architecture Context

### What's Already Done
- ✅ Clerk authentication (Magic links, Next.js integration, localhost:3001 running)
- ✅ Supabase PostgreSQL database (3 tables, RLS enabled, tested)
- ✅ API keys in `.env.local` (Clerk, Supabase, OpenAI, Tavily, YouTube)

### What Phase 3 Builds
1. **HomePage** — Project browser + management (implements user design)
2. **StudyCanvas** — Main infinite canvas (migrated from main.js)
3. **State Management** — Zustand stores for projects/clusters/topics/canvas state
4. **Supabase Integration** — Read/write project data
5. **Navigation** — Flow from auth → home → project → canvas

### What Phase 4/5 Will Handle
- JWT verification in Vercel Functions (Phase 4)
- Production deployment (Phase 5)

---

## Component Structure (Proposed)

```
src/
├── app/
│   ├── layout.tsx (root + ClerkProvider)
│   ├── page.tsx (redirect to /home)
│   ├── (auth)/
│   │   ├── layout.tsx (protected routes)
│   │   ├── home/
│   │   │   └── page.tsx (HomePage component)
│   │   └── study/
│   │       └── [projectId]/
│   │           └── page.tsx (StudyCanvas component)
│
├── components/
│   ├── HomePage/
│   │   ├── ProjectGrid.tsx (display projects as folders/cards)
│   │   ├── CreateProjectModal.tsx (new project form)
│   │   ├── ProjectActions.tsx (edit/delete/open)
│   │   └── ProjectBrowser.tsx (main home page layout)
│   │
│   ├── Canvas/
│   │   ├── StudyCanvas.tsx (main canvas component)
│   │   ├── ClusterCard.tsx (individual cluster display)
│   │   ├── TopicCard.tsx (individual topic display)
│   │   ├── CanvasLayout.tsx (positioning/drag-drop)
│   │   └── ScrollHandler.tsx (infinite scroll)
│   │
│   ├── RightPanel/
│   │   ├── AskTab.tsx (question input)
│   │   ├── QuizTab.tsx (quiz mode)
│   │   └── RightPanel.tsx (tab container)
│   │
│   └── Common/
│       ├── Navbar.tsx (header with logo + UserButton)
│       └── LoadingSpinner.tsx
│
├── store/
│   ├── projectStore.ts (Zustand: projects, clusters, topics, actions)
│   ├── canvasStore.ts (Zustand: active project, scroll, ui state)
│   └── uiStore.ts (Zustand: modal open/close, etc.)
│
├── services/
│   ├── supabaseClient.ts (Supabase initialization)
│   ├── projectService.ts (fetch/create/update/delete projects)
│   ├── clusterService.ts (cluster operations)
│   └── topicService.ts (topic operations)
│
├── hooks/
│   ├── useProjects.ts (fetch user's projects on mount)
│   ├── useProject.ts (fetch specific project + clusters)
│   └── useSupabase.ts (generic Supabase interaction)
│
├── styles/
│   ├── globals.css (base + theme)
│   ├── canvas.css (canvas-specific styles)
│   └── home.css (home page styles)
│
└── types/
    └── index.ts (TypeScript interfaces)
```

---

## State Management (Zustand)

### `projectStore.ts`
```typescript
// What it manages:
- projects: Project[]
- activeProject: Project | null
- clusters: Cluster[]
- topics: Topic[]
- loading: boolean
- error: string | null

// Key actions:
- loadProjects(userId): fetch all user projects
- selectProject(projectId): set active project + load clusters
- createProject(name, description)
- deleteProject(projectId)
- createCluster(projectId, title)
- createTopic(clusterId, topicData)
- updateTopic(topicId, updates)
```

### `canvasStore.ts`
```typescript
// What it manages:
- scrollX, scrollY: canvas position
- zoom: zoom level
- selectedClusterId: currently active cluster
- clusterPositions: Map<clusterId, {x, y}> for persistence

// Key actions:
- setScroll(x, y)
- setZoom(level)
- selectCluster(clusterId)
- saveClusterPosition(clusterId, x, y)
```

---

## Supabase Integration

### Services Pattern
Each service file handles a domain:

**`projectService.ts`**
```typescript
export async function getUserProjects(userId: string) {
  return supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId);
}

export async function createProject(userId: string, name: string) {
  return supabase
    .from('projects')
    .insert({ user_id: userId, name })
    .select()
    .single();
}
```

**`clusterService.ts`**
```typescript
export async function getProjectClusters(projectId: string) {
  return supabase
    .from('clusters')
    .select('*, topics(*)')
    .eq('project_id', projectId);
}
```

### Real-time Features (Future)
- Can use `.on('*', callback)` for live cluster updates
- Defer to Phase 2+ if needed

---

## User Design Context

**Important:** User has an existing design for the home/projects page.

**Action items for Phase 3:**
1. Review the design with user at start of session
2. Identify key UI elements:
   - Project cards/folders layout
   - Create project button placement
   - Search/filter (if present)
   - Project metadata display (created date, last modified, etc.)
3. Build components to match design exactly
4. Preserve Synapse color scheme (beige, warm orange accents)

**Don't guess:** Ask user to share design file or screenshot so we can implement Option B correctly.

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────┐
│ User Logs In (Clerk)                           │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ HomePage                                        │
│ ├─ useProjects() hook (fetches from Supabase)  │
│ ├─ Displays ProjectGrid (user design)          │
│ └─ Create/Edit/Delete projects                 │
└──────────────────┬──────────────────────────────┘
                   │
      User clicks project
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ StudyCanvas (project/:projectId)                │
│ ├─ useProject() hook (fetches clusters/topics)  │
│ ├─ Canvas renders ClusterCards + TopicCards    │
│ ├─ AskTab sends question to /api/ask           │
│ └─ Saves response as new Cluster/Topic         │
└──────────────────┬──────────────────────────────┘
                   │
      All data persisted to Supabase
      (clusters/topics tied to projectId)
```

---

## Canvas Migration (Vanilla JS → React)

### Key Elements to Preserve
- Infinite scrollable canvas (absolute positioned clusters)
- Cluster cards with color-coded topics
- Hover effects, animations
- Sticky notes aesthetic
- Right panel (Ask/Quiz tabs)

### Vanilla JS Reference
- `main.js` (915 lines) — source of truth for canvas logic
- Layout system, state updates, event handlers all migrate to React

### Approach
1. Don't rewrite canvas logic — adapt it to React hooks
2. Use Zustand for state (replaces vanilla JS object state)
3. Keep CSS classes/styles mostly the same (copy from `style.css`)
4. Test canvas interactions during development (drag, zoom, scroll)

---

## Supabase Query Patterns

### Fetch User's Projects (on login)
```typescript
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

### Fetch Project with Full Hierarchy
```typescript
const { data } = await supabase
  .from('projects')
  .select('*, clusters(*, topics(*))')
  .eq('id', projectId)
  .single();
```

### Create New Cluster (when user asks question)
```typescript
const { data } = await supabase
  .from('clusters')
  .insert({ project_id: projectId, title: questionTitle })
  .select()
  .single();

// Then create topics under this cluster
const { data: topics } = await supabase
  .from('topics')
  .insert([
    { cluster_id: clusterId, title: 'Explanation', explanation: '...' },
    { cluster_id: clusterId, title: 'ELI5', eli5: '...' },
    // etc.
  ])
  .select();
```

---

## Testing Checklist for Phase 3

Before marking complete:

- [ ] User can navigate from login → HomePage
- [ ] HomePage displays their projects (or empty state if none)
- [ ] User can create a new project (form + Supabase save)
- [ ] Clicking project opens StudyCanvas
- [ ] Canvas displays clusters/topics for that project
- [ ] Ask a question → creates cluster + topics in Supabase
- [ ] Reload page → data persists (different project still there)
- [ ] Can switch between projects (breadcrumb/back button)
- [ ] Quiz mode works (generates questions from stored topics)
- [ ] RightPanel (Ask/Quiz) renders correctly
- [ ] No TypeScript errors
- [ ] No console errors

---

## Known Constraints & Decisions

1. **Authorization:** Still app-level (Clerk JWT verification happens in Phase 4). Phase 3 focuses on UI/UX.
2. **Real-time sync:** Not included; can add in Phase 2+ if needed.
3. **Offline mode:** Not included; assumed always online.
4. **Mobile responsive:** Nice-to-have; focus on desktop first.
5. **Animations:** Preserve existing animations from vanilla JS.
6. **Accessibility:** Basic a11y (semantic HTML, ARIA labels where needed).

---

## Phase 3 Success Criteria

User can:
1. ✅ Log in → see HomePage with their projects
2. ✅ Create new project with name + description
3. ✅ Click project → opens StudyCanvas
4. ✅ Ask "What is photosynthesis?" → creates cluster + topics
5. ✅ See cluster cards on canvas with all content
6. ✅ Close browser, reopen → projects still there
7. ✅ Switch between multiple projects
8. ✅ Quit app, restart → login again → same projects persist

---

## Files Ready for Phase 3

**In repo:**
- `.env.local` — all keys ready
- `app/layout.tsx`, `proxy.ts` — Clerk setup ready
- `package.json` — React, Zustand deps ready (may need minor additions)
- `style.css` — reference for canvas styling

**In Supabase:**
- 3 tables ready (projects, clusters, topics)
- RLS enabled
- Test data cleared

**Not yet created:**
- React components (to be built in Phase 3)
- Zustand stores (to be built in Phase 3)
- Services (to be built in Phase 3)

---

## Action Items for Next Session

1. **Review design:** User shares home/projects page design (image/file)
2. **Extract design requirements:** Colors, layout, components
3. **Install dependencies:** Any missing React/Zustand libs
4. **Create project structure:** Folder layout from proposed structure above
5. **Build in order:**
   1. HomePage components (implements user design)
   2. Zustand stores (state management)
   3. Supabase services (data layer)
   4. Canvas components (migrate from vanilla JS)
   5. Integration (wire everything together)

---

## Quick Reference: API Endpoints Used in Phase 3

- **Supabase REST API** (via `@supabase/supabase-js`):
  - POST `/rest/v1/projects` — create project
  - GET `/rest/v1/projects` — list projects
  - GET `/rest/v1/clusters` — list clusters for project
  - POST `/rest/v1/clusters` — create cluster
  - POST `/rest/v1/topics` — create topic
  - PATCH `/rest/v1/topics/:id` — update topic (study notes)

- **Vercel Functions** (call from React):
  - POST `/api/ask` — ask question (returns explanation, eli5, fact)
  - GET `/api/images?query=X` — search images (Tavily)
  - GET `/api/youtube?query=X` — search videos (YouTube API)

Phase 4 will update `/api/ask` to verify Clerk JWT and save to Supabase.

---

## Environment Variables Ready

```env
# In .env.local (already populated)
VITE_SUPABASE_URL=https://qrzhtqaseaijirhgntei.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

OPENAI_API_KEY=sk-proj-...
TAVILY_API_KEY=tvly-dev-...
YOUTUBE_API_KEY=AIza...
```

No changes needed for Phase 3 (all keys ready).
