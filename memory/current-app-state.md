---
name: current-app-state
description: What the app looks like right now — what works, what doesn't, what's missing
metadata:
  type: project
---

# Current App State (End of Phase 1, Before Phase 3)

**As of:** 2026-05-22 (after Supabase setup)  
**What you see:** Placeholder page with auth buttons  
**What works:** Clerk auth, Supabase connection  
**What's missing:** React components, study canvas, data persistence UI

---

## If You Open http://localhost:3001 Right Now

### What You'll See
1. Synapse logo/header (beige background)
2. "Sign Up" button (top right)
3. Simple placeholder text saying "Click the button to sign up"
4. Clerk authentication form (magic link)

### What Happens When You Click "Sign Up"
1. Clerk form opens (email field + "Send Magic Link" button)
2. Enter an email
3. Get magic link in inbox
4. Click link → redirected back to localhost:3001
5. See UserButton (avatar) in top right (replace Sign Up button)

### What You CAN Do
- ✅ Sign up with email
- ✅ Get magic link
- ✅ Auto-login
- ✅ See authenticated state
- ✅ Click UserButton → see user profile / logout

### What You CAN'T Do Yet
- ❌ See a list of projects
- ❌ Create a new project
- ❌ Open a study canvas
- ❌ Ask a question
- ❌ See study clusters/topics
- ❌ Reload and have anything persist (no canvas to persist)

---

## Current File Structure

### Next.js App Files
```
app/
├── layout.tsx ← Root layout with ClerkProvider
├── page.tsx ← Current placeholder (Sign In / Sign Up)
├── globals.css ← Base styles (beige/orange Synapse palette)
└── (no other routes yet)
```

### Configuration Files (Working)
```
proxy.ts ← Clerk middleware (active)
next.config.ts ← Turbopack config
tsconfig.json ← TypeScript (React JSX)
vercel.json ← Vercel deployment config
.env.local ← All keys (Clerk + Supabase + APIs)
```

### Old Files (NOT Served)
```
index.html ← Old entry point (NOT used)
main.js ← Old 915-line canvas logic (reference only)
style.css ← Old styles (reference only)
api/ ← Old Vercel Functions (will integrate in Phase 4)
```

---

## What's Ready Behind the Scenes

### Clerk (Authentication) ✅
- Installed: `@clerk/nextjs` v7.4.0
- Configured: `proxy.ts` middleware
- Working: Magic link auth, UserButton
- Status: **LIVE & TESTED**

### Supabase (Database) ✅
- Connected: `https://qrzhtqaseaijirhgntei.supabase.co`
- Tables: `projects`, `clusters`, `topics` (3 tables)
- RLS: Enabled on all tables (permissive policies for now)
- Status: **LIVE & TESTED** (test script passed all checks)
- Keys: In `.env.local` (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)

### API Services (Backend) ⏳
- `/api/ask.js` — Calls GPT-4o (exists, not updated for Supabase yet)
- `/api/images.js` — Calls Tavily (exists, working)
- `/api/youtube.js` — Calls YouTube API (exists, working)
- Status: **READY FOR PHASE 4 UPDATE** (will add Clerk JWT verification + Supabase persistence)

---

## Data Persistence Right Now

### If You Try to Use the Old Canvas (`main.js`)
- The old `/index.html` is NOT served anymore
- Even if you accessed it somehow, it has NO Supabase integration
- Any study data would be lost on reload (session-only)

### If You Try to Build Canvas Now (before Phase 3)
- No Zustand stores → no state management
- No Supabase services → no data saving
- No HomePage → nowhere to select projects
- Reload → all data lost

### After Phase 3 is Complete
- ✅ You create a project → saved to Supabase
- ✅ You ask a question → cluster + topics saved
- ✅ Reload page → all data persists
- ✅ Next day, login again → same projects still there

---

## Dev Server Status

### Running?
```bash
npm run dev
```
This starts Next.js dev server on http://localhost:3001

### Console Output
You should see:
```
> next dev

  ▲ Next.js 16.2.6
  - Local:        http://localhost:3001
  
 ✓ Ready in 1.2s
```

### If There Are Errors
- **"Cannot find module"** → run `npm install`
- **"env.local not found"** → check `.env.local` exists with keys
- **"Clerk error"** → check `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in `.env.local`
- **"Supabase error"** → check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

---

## What Happens When You Reload (localhost:3001)

### Currently (Before Phase 3)
```
Open localhost:3001
    ↓
Clerk checks session (restores user if logged in)
    ↓
Render placeholder page (Sign In or UserButton)
    ↓
Nothing else happens (no canvas, no data fetch)
```

**Result:** Same placeholder page, but authenticated. Nothing to reload/persist.

### After Phase 3
```
Open localhost:3001
    ↓
Clerk checks session (restores user if logged in)
    ↓
React mounts HomePage
    ↓
useProjects() hook fires:
  - Fetches projects from Supabase
  - useAuth() provides user.id
  - RLS policy: show only projects where user_id = current user
    ↓
Render ProjectGrid with user's projects
    ↓
User clicks project → StudyCanvas opens
    ↓
useProject(projectId) hook fires:
  - Fetches clusters + topics for that project
  - Renders canvas with all clusters
    ↓
USER SEES THEIR PREVIOUS STUDY DATA ✅
```

---

## Color Scheme (Currently Applied)

Already in `app/globals.css`:
```css
--bg-beige: #FFF8F0      /* Light warm background */
--accent-orange: #FF9500 /* Warm accent color */
--text-dark: #2D2D2D     /* Dark text */
```

Canvas, buttons, cards will use these colors in Phase 3.

---

## Environment Variables (All Set)

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase
VITE_SUPABASE_URL=https://qrzhtqaseaijirhgntei.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# AI & Search APIs
OPENAI_API_KEY=sk-proj-...
TAVILY_API_KEY=tvly-dev-...
YOUTUBE_API_KEY=AIza...
```

No changes needed. All keys ready for Phase 3 & 4.

---

## Next Steps (Phase 3)

1. **Show user design** — Bring the home/projects page design you mentioned
2. **Build HomePage** — React component to match design
3. **Build StudyCanvas** — Migrate canvas logic from main.js
4. **Build Zustand stores** — State management
5. **Build Supabase services** — Data fetching/saving
6. **Test locally** — Ensure persistence works
7. **Then Phase 4** — Update Vercel Functions for backend JWT verification
8. **Then Phase 5** — Deploy to production

**Phase 3 estimated time:** 8-10 hours  
**Phase 4 estimated time:** 2 hours  
**Phase 5 estimated time:** 1 hour

---

## Quick Troubleshooting

### "Cannot connect to Supabase"
- Check `.env.local` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Check Supabase project is still active (not paused)
- Run `node test-supabase.js` to verify connection

### "Clerk sign-in not working"
- Check `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in `.env.local`
- Check https://dashboard.clerk.com has `http://localhost:3001` in allowed origins
- Try clearing browser cookies and cache

### "Dev server won't start"
- Check `npm install` completed successfully
- Check Node version >= 18: `node --version`
- Delete `.next` folder and restart: `rm -rf .next && npm run dev`

### "I see the old canvas (main.js)"
- That shouldn't happen; Next.js serves `/index.html` → `/app/page.tsx` not `/main.js`
- Check you're on http://localhost:3001 (not a different port)
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

---

## Summary

| Component | Status | Works? | Notes |
|-----------|--------|--------|-------|
| **Clerk Auth** | ✅ Live | Yes | Sign up/login working, UserButton showing |
| **Next.js App** | ✅ Running | Yes | Serving on localhost:3001 |
| **Placeholder UI** | ✅ Built | Yes | Shows auth buttons, no canvas |
| **Supabase Database** | ✅ Ready | Yes | 3 tables, RLS, tested successfully |
| **Canvas Component** | ❌ Missing | No | Built in Phase 3 |
| **State Management** | ❌ Missing | No | Built in Phase 3 |
| **Data Persistence** | ❌ Missing | No | Works after Phase 3 |
| **Backend JWT** | ❌ Not updated | No | Updated in Phase 4 |

---

## Reminder: What's Next

**Start of Phase 3, you'll:**
1. Create React components (HomePage, StudyCanvas, etc.)
2. Set up Zustand stores
3. Build Supabase service layer
4. Test persistence
5. Then move to Phase 4 (backend) and Phase 5 (deploy)

**You're 50% of the way there!** Backend infrastructure is solid. Now we build the UI. 🚀
