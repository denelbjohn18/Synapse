---
name: project-overview
description: Synapse/StudyBoard — what it is, who it's for, full tech stack, and key architectural decisions
metadata:
  type: project
---

Synapse (branded "StudyBoard") is a browser-based personal learning canvas. One prompt generates a full "learning cluster" — text explanation, images, videos, ELI5, and a surprising fact — all laid out spatially on an infinite scrollable board. Session-only (no persistence).

**Why:** Replaces the 5-tab study loop (LLM + Google Images + YouTube + ELI5 + losing everything on tab close).

**Who it's for:** Self-directed individual learners who want all study tools in one place.

**Layout:** Two panels — infinite canvas (main area) + sidecar (right panel with ASK/QUIZ tabs).

**Per-prompt flow:**
- 4 parallel GPT-4o calls: explain, ELI5, fact, search terms
- Search terms feed Tavily (images) and YouTube Data API v3 (videos)
- Everything renders as a "cluster" of color-coded cards on the canvas

**Modes:**
- Ask Mode: generates new clusters on canvas
- Quiz Mode: GPT-4o generates multiple-choice questions based on what's been studied this session
- Follow-up Mode: chat about a specific cluster without generating a new cluster

**Tech stack:**
- Frontend: plain HTML + CSS + vanilla JS (no framework, no build step)
- AI: OpenAI GPT-4o (via `/api/ask.js` Vercel Function)
- Images: Tavily API (via `/api/images.js`) — NOTE: docs say Wikimedia Commons but actual code uses Tavily
- Videos: YouTube Data API v3 (via `/api/youtube.js`)
- Deployment: Vercel + Vercel Functions (API keys never exposed to browser)

**Key architectural choices:**
- No localStorage — canvas is session-only by design, keeps it focused
- No React/bundler — just a scrollable div with appended DOM nodes
- Wikimedia was the original image plan but was replaced with Tavily for better quality
- Videos open inline as iframes on click (not embedded by default, keeps canvas light)

**How:** Why: keeps tool lightweight and sessions focused. How to apply: don't add persistence unless explicitly requested.
