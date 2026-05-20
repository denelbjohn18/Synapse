---
name: project-overview
description: Synapse/StudyBoard — production-ready learning canvas app; deployment-ready state
metadata:
  type: project
---

## Project Status: PRODUCTION-READY (Deploying 2026-05-21)

Synapse (branded "StudyBoard") is a browser-based personal learning canvas. One prompt generates a full "learning cluster" — text explanation, images, videos, ELI5, and a surprising fact — all laid out spatially on an infinite scrollable board. Session-only (no persistence).

**Why:** Replaces the 5-tab study loop (LLM + Google Images + YouTube + ELI5 + losing everything on tab close).

**Who it's for:** Self-directed individual learners who want all study tools in one place.

**Layout:** Two panels — infinite canvas (main area) + sidecar (right panel with ASK/QUIZ tabs).

## Architecture

**Per-prompt flow:**
- 4 parallel GPT-4o calls: explain, ELI5, fact, search terms
- Search terms feed Tavily (images) and YouTube Data API v3 (videos)
- Everything renders as a "cluster" of color-coded cards on the canvas

**Interaction modes:**
- **Ask Mode:** generates new learning clusters on canvas
- **Quiz Mode:** GPT-4o generates multiple-choice questions based on session study data
- **Follow-up Mode:** chat about a specific cluster without generating new clusters

**Tech stack:**
- **Frontend:** plain HTML + CSS + vanilla JS (915 lines, no framework/build step)
- **Backend:** Vercel Functions (3 serverless endpoints)
- **AI:** OpenAI GPT-4o API
- **Data APIs:** Tavily (images), YouTube Data API v3 (videos)
- **Deployment:** Vercel + Vercel Functions (API keys secured, never exposed to browser)
- **Node:** ≥18
- **Codebase size:** ~312KB total, ~2,246 lines of code

## Key Architectural Decisions

- **No persistence:** Session-only canvas by design — focuses user attention, no data storage complexity
- **No framework:** Plain vanilla JS + DOM — minimal dependencies, instant startup
- **Tavily for images:** Replaced original Wikimedia Commons plan for better image quality
- **Inline video playback:** iframes opened on click (not embedded by default) to keep canvas performant
- **Parallel API calls:** 4 concurrent GPT-4o calls for faster cluster generation

## Deployment Checklist

✅ Code cleanup: removed unused `textPrompt.md`, `.vercel/` auto-generated folder
✅ All API endpoints implemented and tested (`/api/ask.js`, `/api/images.js`, `/api/youtube.js`)
✅ Environment variables documented in `.env.example`
✅ Vercel configuration ready (`vercel.json` with cleanUrls enabled)
✅ Single git commit, ready for production deployment

## Notes for Future Maintenance

- Canvas state is ephemeral — no need to add persistence unless explicitly requested
- Keep vanilla JS approach for startup speed and simplicity
- API keys managed via Vercel environment variables (secure, never client-exposed)
- Tavily API provides reliable image search; maintain this provider choice
