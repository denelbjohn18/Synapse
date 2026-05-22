---
name: clerk-supabase-architecture
description: User authentication architecture — why we don't have a Supabase users table, how Clerk + Supabase integration works
metadata:
  type: project
---

# Clerk + Supabase Integration Architecture

**Question:** Do we need a users table in Supabase?  
**Answer:** No. Here's why and how it works.

---

## User Data Split

### Clerk Owns User Identity
- User email
- User name / profile
- Password (if password auth, but we use magic links)
- Session tokens / JWT
- User authentication state

**Where:** Clerk's database (separate from Supabase)  
**When:** Created on first login (magic link email)  
**Access:** `useAuth()` hook in React gives us the user ID + metadata

### Supabase Owns Project/Study Data
- Projects (linked by user_id)
- Clusters (linked to projects)
- Topics (linked to clusters)
- Study notes

**Where:** Supabase PostgreSQL  
**Linked by:** `user_id` (TEXT field, copied from Clerk JWT)  
**Access:** Supabase JS client (with RLS policies)

---

## Why No Supabase Users Table?

**Bad approach:** Create duplicate users table in Supabase
```sql
-- DON'T DO THIS
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT,
  name TEXT,
  created_at TIMESTAMP
);
```

**Why it's bad:**
- Duplicates user data (Clerk already has it)
- Sync nightmare (if user changes email in Clerk, we have to update Supabase too)
- Adds unnecessary complexity
- Creates a source-of-truth problem

**Good approach:** Store only the reference
```sql
-- THIS IS WHAT WE DID
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,  -- Just store the ID, not the whole user
  name TEXT,
  ...
);
```

When we need user info (email, name):
```typescript
// From Clerk (via useAuth())
const { user } = useAuth(); // user.email, user.firstName, etc.

// Query Supabase with user.id
const projects = await supabase
  .from('projects')
  .select('*')
  .eq('user_id', user.id);
```

---

## Data Flow: Login → Data Retrieval

```
┌─────────────────────────────────────────┐
│ User visits http://localhost:3001       │
└────────────────────┬────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ Clerk Auth Check      │
         │ (via ClerkProvider)   │
         └───────────┬───────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
    NOT SIGNED IN            SIGNED IN
        │                         │
        ▼                         ▼
   Show Login Page          Extract user data
   (Magic Link Form)        from Clerk JWT
                                 │
                                 ├─ user.id (string)
                                 ├─ user.email
                                 ├─ user.firstName
                                 └─ user.emailAddresses[0]
                                 │
                                 ▼
                        Query Supabase:
                 "Get projects WHERE user_id = X"
                                 │
                                 ▼
                        Render HomePage
                     (show user's projects)
```

---

## When Data Gets Saved

### User Creates Project
```typescript
// In React (HomePage.tsx)
const { user } = useAuth(); // Get user ID from Clerk

const newProject = await supabase
  .from('projects')
  .insert({
    user_id: user.id,      // ← Clerk's user ID
    name: 'Biology',
    description: '...'
  })
  .select()
  .single();
```

**Result:** 
- ✅ Project saved to Supabase with user_id = "user_12345"
- ✅ RLS policy checks: "Is this user_id the same as the one asking?"
- ✅ Only that user can see/edit this project

### User Asks a Question
```typescript
// In React (StudyCanvas.tsx)
const { user } = useAuth();
const projectId = useParams().projectId;

const newCluster = await supabase
  .from('clusters')
  .insert({
    project_id: projectId,  // ← Links to their project
    title: 'What is DNA?'
  })
  .select()
  .single();

// Create topics under cluster
const topics = await supabase
  .from('topics')
  .insert([
    { cluster_id: newCluster.id, explanation: '...' },
    { cluster_id: newCluster.id, eli5: '...' },
    { cluster_id: newCluster.id, fact: '...' }
  ])
  .select();
```

**Result:**
- ✅ Cluster saved with project_id
- ✅ Topics saved with cluster_id
- ✅ RLS policy checks: "Is this cluster in a project the user owns?"
- ✅ Data chain: user → project → cluster → topics

---

## RLS Policy Enforcement

Remember our RLS policies? They check this chain:

```sql
-- "Can this user see this topic?"
-- Check: topic.cluster_id → cluster.project_id → project.user_id
CREATE POLICY "Users can view topics in their clusters"
  ON topics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clusters
      JOIN projects ON clusters.project_id = projects.id
      WHERE clusters.id = topics.cluster_id
      AND projects.user_id = auth.uid()
    )
  );
```

**Translation:** "Show this topic only if it belongs to a cluster in a project owned by the current user."

---

## Persistence on Reload

When user refreshes page:

1. **Clerk checks session**
   - If logged in → restores user ID
   - If not → shows login

2. **React mounts HomePage**
   - Calls `useProjects()` hook
   - Hook queries Supabase with user.id
   - Supabase RLS enforces: only show projects where user_id matches
   - All projects reappear (same ones as before)

3. **User opens a project**
   - Calls `useProject(projectId)` hook
   - Hook queries clusters + topics for that project
   - All study data reappears

**No data lost** because it's in Supabase, and Clerk always knows who we are.

---

## What Happens in Phase 4?

In Phase 4, we'll add JWT verification in Vercel Functions:

```typescript
// api/ask.js (Phase 4)
import { verifyToken } from '@clerk/backend';

export default async function handler(req, res) {
  // 1. Get JWT from request header
  const token = req.headers.authorization.replace('Bearer ', '');
  
  // 2. Verify with Clerk
  const claims = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY,
  });
  
  // 3. Extract user_id
  const userId = claims.sub;
  
  // 4. Call GPT, Tavily, YouTube
  // 5. Save results to Supabase using service role key
  const cluster = await supabase
    .from('clusters')
    .insert({ project_id: req.body.projectId, title: req.body.question })
    .select()
    .single();
  
  // 6. Return results
  res.json({ clusterId: cluster.id, /* results */ });
}
```

**Key point:** Backend verifies JWT, extracts user_id, ensures user owns the project before saving.

---

## Summary Table

| Aspect | Owned By | Stored In | Who Has It |
|--------|----------|-----------|-----------|
| **User email, name, profile** | Clerk | Clerk's database | Clerk + Browser (JWT) |
| **User ID** | Clerk | Clerk JWT | Browser (via useAuth) + Supabase (user_id field) |
| **Projects, clusters, topics** | User | Supabase | Supabase (RLS enforces privacy) |
| **Authentication state** | Clerk | Clerk | Browser (session token) |
| **API keys** | Developer | .env vars | Vercel Functions (server-only) |

---

## Security Chain

```
┌──────────────────────────────────────────────────────────┐
│ User's Browser                                           │
│ ├─ Stores Clerk session token (secure, httpOnly)       │
│ └─ Accesses useAuth() to get user.id                   │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼ (Clerk JWT)
        ┌─────────────────────────────┐
        │ Vercel Functions            │
        │ ├─ Verify JWT with Clerk    │
        │ ├─ Extract user_id          │
        │ └─ Pass user_id to Supabase │
        └────────────┬────────────────┘
                     │
                     ▼
    ┌────────────────────────────────┐
    │ Supabase                       │
    │ ├─ RLS checks user_id         │
    │ ├─ Returns only owned data    │
    │ └─ Blocks unauthorized access │
    └────────────────────────────────┘
```

Each layer verifies the user before passing data down.

---

## Testing (Phase 1 Used This)

When we ran `test-supabase.js`, we used the **service role key** (bypass RLS):

```typescript
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
```

**Service role key = admin access** (for testing, backend only)

In production:
- **Frontend:** uses anon key (respects RLS)
- **Backend:** uses service role key (verifies JWT first, then creates data with user_id)

---

## Why This Architecture?

1. **No data duplication** — Clerk owns identity, Supabase owns projects
2. **Clear separation of concerns** — Auth layer separate from data layer
3. **Scalable** — Can add more databases without affecting user data
4. **Secure** — RLS + JWT verification at multiple layers
5. **Maintainable** — Changes to user profile don't require Supabase migrations

This is the industry standard for Clerk + Supabase projects.

---

## In Phase 3

You won't see any of this complexity in the React code:

```typescript
// Just call useAuth() and query Supabase
// The architecture handles everything else

const { user } = useAuth();
const { data: projects } = await supabase
  .from('projects')
  .select('*')
  .eq('user_id', user.id);

// That's it. RLS + JWT stuff is invisible.
```

---

## Quick Reference: Never Do This

```typescript
// ❌ DON'T: Store user data in Supabase
const { error } = await supabase
  .from('users')
  .insert({
    id: user.id,
    email: user.email,
    name: user.firstName
  });

// ✅ DO: Use Clerk for user data, store only ID + projects
const { error } = await supabase
  .from('projects')
  .insert({
    user_id: user.id,  // ← Just the ID
    name: 'My Project'
  });
```
