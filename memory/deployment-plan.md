---
name: deployment-plan
description: Complete deployment plan for Synapse — from session-only to multi-project with Clerk auth, React, and Supabase persistence
metadata:
  type: project
---

# Synapse Deployment Plan: Full Architecture & Implementation Roadmap

**Decision Date:** 2026-05-22  
**Status:** Pre-Implementation (Planning Phase)  
**Goal:** Transform Synapse from session-only app to multi-project learning platform with user accounts and persistence

---

## Architecture Decision Summary

### Current State
- Session-only canvas app (no persistence)
- Vanilla JS + HTML/CSS
- Vercel Functions backend (GPT, Tavily, YouTube)
- No user accounts or organization

### Target State
- Individual user accounts with Clerk authentication (magic links)
- Project-based organization (Projects > Clusters > Topics)
- Persistent data storage (projects, clusters, topics, study notes)
- Same beautiful canvas UI and interactions
- Shareable projects (implementation deferred to Phase 2)

### Technology Stack (Final Decision)
| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | React (migrated from vanilla JS) | State management, auth integration, persistent UI |
| **Frontend Deployment** | Vercel | Same as before, auto-deploy on git push |
| **Authentication** | Clerk (magic links) | Beautiful pre-built UI, frictionless setup, free tier generous |
| **Backend Database** | Supabase PostgreSQL | RLS for security, REST API built-in, real-time capable |
| **API Endpoints** | Vercel Functions (keep existing) | Still call GPT-4o, Tavily, YouTube; save results to Supabase |
| **Hosting** | Vercel frontend + Supabase backend | Simple, scalable, free tier covers friends |

---

## Implementation Phases

### **PHASE 1: Supabase Setup & Database Schema**

**Objective:** Set up PostgreSQL database with tables, relationships, and row-level security (RLS)

#### 1.1 Create Supabase Project
- [ ] Go to supabase.com, create new project (free tier)
- [ ] Save connection string and API keys securely
- [ ] Enable row-level security (RLS) on all tables

#### 1.2 Create Database Tables

```sql
-- Users: Managed by Clerk (auth), we just store user_id as reference
-- No need to create users table; Clerk handles this

-- Projects table (organized by user)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Clusters table (each "question" or topic cluster)
CREATE TABLE clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Topics table (sub-topics with content)
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  explanation TEXT,
  eli5 TEXT,
  fact TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  videos JSONB DEFAULT '[]'::jsonb,
  study_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 1.3 Enable Row-Level Security (RLS)

```sql
-- RLS on projects: users can only see their own (user_id from Clerk JWT)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT USING (user_id = current_user_id());
CREATE POLICY "Users can create projects"
  ON projects FOR INSERT WITH CHECK (user_id = current_user_id());
CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE USING (user_id = current_user_id());
CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE USING (user_id = current_user_id());

-- RLS on clusters: users can only access clusters in their projects
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view clusters in their projects"
  ON clusters FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = clusters.project_id
      AND projects.user_id = current_user_id()
    )
  );
CREATE POLICY "Users can create clusters in their projects"
  ON clusters FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_id
      AND projects.user_id = current_user_id()
    )
  );

-- Same pattern for UPDATE/DELETE on clusters

-- RLS on topics: users can only access topics in their clusters/projects
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view topics in their clusters"
  ON topics FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM clusters
      JOIN projects ON clusters.project_id = projects.id
      WHERE clusters.id = topics.cluster_id
      AND projects.user_id = current_user_id()
    )
  );
-- Similar INSERT/UPDATE/DELETE policies
```

#### 1.4 Get API Credentials
- [ ] Copy Supabase URL from project settings
- [ ] Copy Supabase anon key (for frontend)
- [ ] Save these to `.env.local` (frontend) and Vercel env vars (backend)

---

### **PHASE 2: Clerk Setup**

**Objective:** Set up Clerk authentication with magic links

#### 2.1 Create Clerk Account & Project
- [ ] Go to clerk.com, sign up (free)
- [ ] Create new application
- [ ] Select "Email" as authentication method
- [ ] Get Publishable Key and Secret Key from dashboard

#### 2.2 Configure Clerk Redirect URLs
- [ ] In Clerk dashboard → Settings → Allowed origins:
  ```
  http://localhost:5173 (local development)
  https://synapse.vercel.app (production)
  ```
- [ ] Save Clerk keys for later use

#### 2.3 Test Clerk Locally
- [ ] Create test user with your email
- [ ] Verify magic link works
- [ ] Note: Clerk handles all auth logic; you just embed the component

---

### **PHASE 3: Frontend Migration (Vanilla JS → React)**

**Objective:** Migrate the canvas UI to React while maintaining design/UX; integrate Clerk Auth

#### 3.1 Project Setup
- [ ] Create new React app (Vite recommended for speed)
  ```bash
  npm create vite@latest synapse-frontend -- --template react
  cd synapse-frontend
  npm install
  ```
- [ ] Install dependencies:
  ```bash
  npm install @clerk/clerk-react @supabase/supabase-js zustand lucide-react
  ```
  - `@clerk/clerk-react` — Clerk authentication UI + SDK
  - `@supabase/supabase-js` — Supabase client
  - `zustand` — lightweight state management
  - `lucide-react` — icon library (if needed)

#### 3.2 Project Structure
```
src/
├── components/
│   ├── Canvas/
│   │   ├── StudyCanvas.jsx (main canvas)
│   │   ├── ClusterCard.jsx
│   │   └── TopicCard.jsx
│   ├── Sidebar/
│   │   ├── ProjectList.jsx
│   │   └── ProjectSelector.jsx
│   └── RightPanel/
│       ├── AskTab.jsx
│       └── QuizTab.jsx
├── store/
│   ├── projectStore.js (projects/clusters/topics)
│   └── uiStore.js (canvas state, active project)
├── services/
│   ├── supabase.js (Supabase client setup)
│   └── projectService.js
├── styles/
│   └── App.css (keep existing design)
├── App.jsx
├── main.jsx
└── .env.local
```

#### 3.3 Setup Clerk Provider

**main.jsx**
```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App.jsx'

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <App />
    </ClerkProvider>
  </React.StrictMode>,
)
```

#### 3.4 Implement Core Components

**ProjectStore (Zustand)**
```javascript
// store/projectStore.js
import { create } from 'zustand';
import { supabase } from '../services/supabase';

export const useProjectStore = create((set, get) => ({
  projects: [],
  activeProject: null,
  clusters: [],
  topics: [],
  loading: false,

  // Load user's projects
  loadProjects: async (userId) => {
    set({ loading: true });
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId);
    set({ projects: data || [], loading: false });
  },

  // Create new project
  createProject: async (userId, name, description = '') => {
    const { data } = await supabase
      .from('projects')
      .insert([{ user_id: userId, name, description }])
      .select();
    set({ projects: [...get().projects, data[0]] });
    return data[0];
  },

  // Set active project and load its clusters
  selectProject: async (projectId) => {
    const { data: clusters } = await supabase
      .from('clusters')
      .select('*, topics(*)')
      .eq('project_id', projectId);
    set({ activeProject: projectId, clusters });
  },

  // Create cluster (when user asks a question)
  createCluster: async (projectId, title) => {
    const { data } = await supabase
      .from('clusters')
      .insert([{ project_id: projectId, title }])
      .select();
    set({ clusters: [...get().clusters, data[0]] });
    return data[0].id;
  },

  // Create/update topic (save study notes)
  saveTopic: async (clusterId, topicData) => {
    // topicData = { title, explanation, eli5, fact, images, videos, study_notes }
    const { data } = await supabase
      .from('topics')
      .insert([{ cluster_id: clusterId, ...topicData }])
      .select();
    return data[0];
  },

  // Update study notes
  updateStudyNotes: async (topicId, studyNotes) => {
    await supabase
      .from('topics')
      .update({ study_notes: studyNotes })
      .eq('id', topicId);
  },
}));
```

**Main App Component**
```jsx
// App.jsx
import { useEffect } from 'react';
import { useAuth, UserButton } from '@clerk/clerk-react';
import { useProjectStore } from './store/projectStore';
import StudyCanvas from './components/Canvas/StudyCanvas';
import ProjectList from './components/Sidebar/ProjectList';
import RightPanel from './components/RightPanel/RightPanel';
import './styles/App.css';

export default function App() {
  const { userId, isSignedIn, isLoaded } = useAuth();
  const { projects, loadProjects } = useProjectStore();

  useEffect(() => {
    if (isSignedIn && userId) {
      loadProjects(userId);
    }
  }, [isSignedIn, userId]);

  if (!isLoaded) return <div>Loading...</div>;

  if (!isSignedIn) {
    return (
      <div className="login-container">
        <h1>Synapse StudyBoard</h1>
        <p>Click the button in the top right to sign up</p>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <div className="user-header">
        <h1>Synapse</h1>
        <UserButton />
      </div>

      <aside className="left-sidebar">
        <ProjectList projects={projects} />
      </aside>
      
      <main className="canvas-area">
        <StudyCanvas />
      </main>
      
      <aside className="right-panel">
        <RightPanel />
      </aside>
    </div>
  );
}
```

#### 3.5 Environment Variables (.env.local)
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxx...
```

#### 3.6 Keep Existing Canvas Design
- [ ] Migrate HTML/CSS from vanilla JS to React components
- [ ] Keep color scheme (beige, warm, orange accents)
- [ ] Keep animations (cluster slide-in, hover effects)
- [ ] Keep sticky notes, cluster dots, scrollable canvas
- **Key:** Only the state management changes; visual design stays identical

---

### **PHASE 4: Backend Updates (Vercel Functions)**

**Objective:** Modify existing API endpoints to save results to Supabase; validate Clerk JWTs; ensure API keys are never exposed

#### 4.1 Update Environment Variables
- [ ] Add to `.env.local` (local dev) and Vercel project settings:
  ```
  VITE_SUPABASE_URL=https://xxx.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJxx...
  OPENAI_API_KEY=xxx (server-only)
  TAVILY_API_KEY=xxx (server-only)
  YOUTUBE_API_KEY=xxx (server-only)
  CLERK_SECRET_KEY=sk_xxx (server-only, for JWT verification)
  ```

#### 4.2 Create JWT Verification Middleware

**api/middleware/verifyClerkToken.js**
```javascript
import { verifyToken } from '@clerk/backend';

export async function verifyClerkAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new Error('Missing authorization header');

  const token = authHeader.replace('Bearer ', '');
  const claims = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  return claims.sub; // Returns Clerk user ID
}
```

#### 4.3 Update Existing Endpoints

**`/api/ask.js`** (already exists, add Supabase save)
```javascript
// api/ask.js
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import { verifyClerkAuth } from './middleware/verifyClerkToken';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const userId = await verifyClerkAuth(req);
    const { question, projectId, clusterId } = req.body;

    // Generate explanation, ELI5, fact (same as before)
    const responses = await Promise.all([
      openai.chat.completions.create({ /* explanation prompt */ }),
      openai.chat.completions.create({ /* ELI5 prompt */ }),
      openai.chat.completions.create({ /* fact prompt */ }),
    ]);

    const explanation = responses[0].choices[0].message.content;
    const eli5 = responses[1].choices[0].message.content;
    const fact = responses[2].choices[0].message.content;

    // Return to frontend (frontend will pass images/videos separately)
    res.status(200).json({ explanation, eli5, fact });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
```

**`/api/images.js`** (already exists, no changes needed)
- Tavily API call returns image URLs
- Frontend saves these when user submits

**`/api/youtube.js`** (already exists, no changes needed)
- YouTube API call returns video URLs
- Frontend saves these when user submits

#### 4.4 New Endpoint: Save Complete Topic
```javascript
// api/saveTopic.js
import { createClient } from '@supabase/supabase-js';
import { verifyClerkAuth } from './middleware/verifyClerkToken';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const userId = await verifyClerkAuth(req);
    const { clusterId, topicData } = req.body;
    // topicData = { title, explanation, eli5, fact, images, videos, study_notes }

    const { data } = await supabase
      .from('topics')
      .insert([{ cluster_id: clusterId, ...topicData }])
      .select();
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
```

---

### **PHASE 5: Deployment to Production**

**Objective:** Deploy React frontend to Vercel; configure all API keys and Clerk settings; test end-to-end

#### 5.1 Prepare GitHub Repository
- [ ] Create new GitHub repo (or use existing)
- [ ] Push React frontend code
- [ ] Structure:
  ```
  synapse/
  ├── frontend/ (React app)
  ├── api/ (Vercel Functions)
  └── README.md
  ```

#### 5.2 Deploy Frontend to Vercel
- [ ] Connect GitHub repo to Vercel
- [ ] Configure environment variables in Vercel project settings:
  ```
  VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
  VITE_SUPABASE_URL=https://xxx.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJxx...
  OPENAI_API_KEY=xxx
  TAVILY_API_KEY=xxx
  YOUTUBE_API_KEY=xxx
  CLERK_SECRET_KEY=sk_xxx
  ```
- [ ] Deploy on every push to `main` branch
- [ ] Get Vercel URL (e.g., `synapse.vercel.app`)

#### 5.3 Configure Clerk Production URLs
- [ ] Go to Clerk dashboard → Settings → Allowed origins:
  ```
  https://synapse.vercel.app
  ```
- [ ] Make sure Clerk keys are updated for production environment

#### 5.4 Test End-to-End
- [ ] [ ] Open `synapse.vercel.app`
- [ ] [ ] Click "Sign in" → see Clerk magic link form
- [ ] [ ] Enter email, receive magic link
- [ ] [ ] Click link, auto-login
- [ ] [ ] Create a project
- [ ] [ ] Ask a question (triggers GPT + Tavily + YouTube)
- [ ] [ ] Verify data appears in Supabase (check `projects`, `clusters`, `topics` tables)
- [ ] [ ] Close and reopen browser; verify projects persist
- [ ] [ ] Click "Sign out" and sign in with different email; verify projects are separate
- [ ] [ ] Test quiz mode generates questions from saved topics

#### 5.5 Share with Friends
- [ ] [ ] Give friends the `synapse.vercel.app` link
- [ ] [ ] They click "Sign up" in Clerk form
- [ ] [ ] They enter email, get magic link, click it
- [ ] [ ] Each friend creates own projects
- [ ] [ ] Each person's data is private (RLS enforces this)

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Browser                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  React App (Vercel)                                    │ │
│  │  - Clerk login/signup (magic links)                    │ │
│  │  - Project selector                                    │ │
│  │  - Canvas with clusters/topics                         │ │
│  │  - AskTab: form for questions                         │ │
│  │  - QuizTab: generated questions                       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
          │                              │
    ┌─────────────────────┐       ┌──────────────────────────┐
    │ Clerk              │       │ Vercel Functions         │
    │ - Magic link auth  │       │ ┌────────────────────┐   │
    │ - User session     │       │ │ /api/ask.js        │   │
    │ - JWT tokens       │       │ │ /api/images.js     │   │
    └─────────────────────┘       │ │ /api/youtube.js    │   │
          ↓                       │ │ /api/saveTopic.js  │   │
    (send JWT token)             │ └────────────────────┘   │
          │                       │          │               │
          └─────────────────────→│    Calls:                │
                                 │    - OpenAI (GPT-4o)     │
                                 │    - Tavily (images)     │
                                 │    - YouTube (videos)    │
                                 └──────────────────────────┘
                                      │
                                      │ (verify JWT + pass user_id)
                                      ↓
                                 ┌─────────────────┐
                                 │ Supabase        │
                                 │ ┌─────────────┐ │
                                 │ │ PostgreSQL  │ │
                                 │ │ - projects  │ │
                                 │ │ - clusters  │ │
                                 │ │ - topics    │ │
                                 │ └─────────────┘ │
                                 │ ┌─────────────┐ │
                                 │ │ RLS         │ │
                                 │ │ (security)  │ │
                                 │ └─────────────┘ │
                                 └─────────────────┘
```

---

## What Gets Saved vs. Not Saved

### ✅ **SAVED to Supabase**
- Projects (user-created collections)
- Clusters (each question/topic group)
- Topics (individual learning items)
  - Title
  - Explanation (from GPT-4o)
  - ELI5 (from GPT-4o)
  - Fact (from GPT-4o)
  - Images (URLs from Tavily)
  - Videos (URLs from YouTube)
  - Study notes (user's own annotations)

### ❌ **NOT SAVED**
- Quiz results (for now; can add later)
- LLM conversation history
- Session state (active project, etc.)

---

## Key Differences: Clerk vs Supabase Auth

| Aspect | Supabase Auth | Clerk (What We Use) |
|--------|---------------|-------------------|
| **UI** | Bare-bones, needs styling | Beautiful pre-built |
| **Setup** | 30 min | 5 min |
| **Magic links** | Works | Perfect + elegant |
| **Database integration** | `auth.uid()` in RLS | Pass user_id from JWT |
| **Free tier** | Good | Generous |
| **Vendor lock-in** | Medium | Medium |

**How Clerk works with RLS:**
- Clerk issues JWT token on login
- Frontend sends JWT with every Supabase request
- Vercel Functions verify JWT, extract user_id, pass to Supabase
- RLS policies check `user_id` field to enforce isolation

---

## Future Features (Phase 2+)

These are discussed but **not** in this implementation:

- [ ] Share projects with friends
- [ ] Collaborative editing on projects
- [ ] Quiz result tracking & progress
- [ ] Search across all topics
- [ ] Export/import projects
- [ ] Tags and filtering
- [ ] Offline mode (with sync)

---

## Key Security Considerations

1. **RLS Policies:** Every table has row-level security. Users can ONLY see/edit their own data.
2. **JWT Verification:** Vercel Functions verify Clerk JWT before accessing Supabase.
3. **API Keys:** Never expose `OPENAI_API_KEY`, `TAVILY_API_KEY`, `YOUTUBE_API_KEY`, `CLERK_SECRET_KEY` to browser. Only in Vercel Functions or env vars.
4. **Auth:** Clerk handles all authentication. Frontend never sees passwords or raw tokens.
5. **CORS:** Configure Clerk allowed origins to prevent unauthorized use.

---

## Testing Checklist

Before marking complete:

- [ ] User can open app and see Clerk login form
- [ ] User can enter email and receive magic link
- [ ] Clicking magic link auto-logs user into app
- [ ] User can create a new project
- [ ] Projects appear in sidebar
- [ ] User can select a project
- [ ] Asking a question creates a cluster + topic
- [ ] Data persists after closing browser and logging back in
- [ ] Different users see only their own projects
- [ ] Quiz mode still works (generates questions from saved topics)
- [ ] Logout works; login takes you back to your projects
- [ ] Friend can sign up independently and see only their projects
- [ ] Study notes can be added and persist
- [ ] Cluster deletion cascades properly (deletes topics)

---

## File Locations & References

### To Create/Modify
- **Frontend:** `frontend/src/` (new React app)
- **Stores:** `frontend/src/store/` (projectStore.js, uiStore.js)
- **Components:** `frontend/src/components/` (Canvas, Sidebar, RightPanel)
- **Services:** `frontend/src/services/` (supabase.js)
- **Backend:** `api/` (update existing + add saveTopic.js, middleware)
- **Config:** `vercel.json`, `.env.example`, `.env.local`

### Current Codebase (Keep/Adapt)
- `api/ask.js` — Update to verify Clerk JWT
- `api/images.js` — No changes needed
- `api/youtube.js` — No changes needed
- Canvas design → Adapt to React components

---

## Success Metrics

When complete, friends should be able to:

1. ✅ Open `synapse.vercel.app`
2. ✅ Click "Sign in" → see Clerk magic link form
3. ✅ Enter email, click link in inbox
4. ✅ Land in app (auto-logged in)
5. ✅ Create "Cardiovascular Systems" project
6. ✅ Ask "What is the heart?"
7. ✅ See cluster with explanation, images, videos, ELI5, fact
8. ✅ Add study notes
9. ✅ Create new project "Photography"
10. ✅ Close browser and come back → all projects still there
11. ✅ Other friend signs up separately → only sees their projects
12. ✅ Logout → can sign in as different person

---

## Implementation Order

1. **Phase 1:** Supabase (database + RLS)
2. **Phase 2:** Clerk (authentication setup)
3. **Phase 3:** React migration (frontend)
4. **Phase 4:** Backend updates (API + JWT verification)
5. **Phase 5:** Deployment (Vercel + production test)

---

## Quick Reference: API Keys Needed

| Service | Key Type | Where to Get | Where to Use |
|---------|----------|-------------|------------|
| Clerk | Publishable Key + Secret Key | clerk.com dashboard | Frontend (publishable) + Vercel (secret) |
| Supabase | URL + Anon Key | supabase.com project settings | Frontend (anon key) + Vercel (URL + anon key) |
| OpenAI | API Key | platform.openai.com | Vercel Functions only |
| Tavily | API Key | tavily.com | Vercel Functions only |
| YouTube | Data API Key | console.cloud.google.com | Vercel Functions only |

