# Synapse — StudyBoard

Ask a question. Get a complete study package with explanations, images, videos, and facts. All on one page.

---

## What Is It?

Synapse is a learning tool that answers any question with:
- A clear explanation
- 3 relevant images
- 2 relevant videos
- A simple 3-sentence explanation for kids
- One interesting fact

Everything appears on a single canvas you can scroll through. When you close the browser, it's gone. That's by design—it keeps you focused on what matters today.

---

## Why It Exists

Most students flip between tabs:
- Google for research
- YouTube for videos
- Images for visuals
- Reddit for simple explanations

You gather pieces, take notes in different places, and lose everything when you close the browser.

Synapse puts it all in one place. One question. One complete answer. No switching tabs.

---

## How It Works

### Three Ways to Learn

**Ask Mode** — Type a question, get a complete study card with everything above.

**Follow-Up Mode** — Ask a follow-up question about something you just learned. It builds on what you already know, but doesn't create a new card.

**Quiz Mode** — The app generates multiple-choice questions based on what you've studied. Get instant feedback on right and wrong answers.

### What Happens When You Ask

The app asks an AI to generate:
1. A simple explanation (while other things load)
2. Search terms for images and videos
3. A full detailed explanation
4. An interesting fact

All four happen at the same time, so you see answers as soon as they're ready. The explanation uses a clear format: what it is, how it works, real examples, common mistakes, and key takeaways.

### On The Page

**Left side:** A small bar with the Synapse logo and dots showing which clusters you've created. Click a dot to jump to any cluster.

**Middle:** Your canvas. This is where all your learning clusters appear. Scroll down to see them all.

**Right side:** Two tabs. The ASK tab is where you type questions. The QUIZ tab is where you test yourself.

At the top of the canvas, there's a yellow sticky note. Use it to jot down reminders or things you want to remember.

---

## How It Looks & Feels

### The Design

Clean, warm colors. Beige background, light canvas, orange accents. Everything has breathing room. Cards gently lift when you hover over them. Nothing feels cluttered.

### The Animations

When a new cluster appears, it slides up from below and fades in smoothly. Cards lift slightly when you hover, inviting you to click. Sticky notes have actual tape on top. The little cluster dots in the left bar light up when they're active. Everything feels natural and calm.

---

## Synapse vs. Other Tools

**ChatGPT:** Gives text, no images or videos. Just a chat window.

**Google:** Finds pages, but you have to read and find the images and videos yourself.

**Perplexity:** Similar to Synapse but keeps everything in a chat thread. Synapse is visual—cards on a canvas instead of chat bubbles.

Synapse is for people who:
- Learn better with pictures, text, and video together
- Want one place to study, not a bunch of tabs
- Like quizzing themselves as they learn
- Don't need their study notes saved

---

## Under The Hood

The app uses:
- **OpenAI's AI** to write explanations
- **Tavily Search** to find images
- **YouTube** to find videos
- **Simple JavaScript** for the interface

When you send a question, it goes to a server (Vercel) which talks to these services and sends back the answer. Your browser displays it.

No database. No signup. No tracking. The app lives in your browser only for that session.

---

## Before You Deploy

You'll need API keys for:
- OpenAI (for explanations)
- YouTube (for videos)
- Tavily (for images)

Get these from each service and add them to your server. Once they're in place, the app is ready to use.

---

## The Philosophy

Study shouldn't be scattered. You shouldn't need five tabs. You shouldn't lose everything on a tab close. This tool answers one question completely and moves on. Clean. Focused. Simple.

---

**Built for people who want to learn.**
