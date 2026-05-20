// Synapse / StudyBoard — main.js
// Owns: state, sidecar tabs, prompt submit, cluster orchestration, sticky note,
// mic (Web Speech), file upload (image), Wikimedia direct fetch, cluster nav.

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const HISTORY_TURNS = 4;

const state = {
  activeMode: "ask",            // "ask" | "quiz"
  followUpMode: false,          // true → chat about focused cluster, no new cluster
  focusedClusterId: null,       // cluster currently being followed up on
  askMessages: [],              // [{role, content}] — what's rendered in #chat-ask globally
  history: [],                  // [{role, content}] — OpenAI context for explain
  quizHistory: [],
  clusters: [],                 // [{id, el, prompt, followUpHistory: []}]
  pendingImage: null,           // base64 data url for next ask
};

// ─────────────── DOM refs ───────────────
const els = {
  stickiesLayer: $("#stickies-layer"),
  stickyAdd:     $("#sticky-add"),
  canvas:        $("#canvas"),
  canvasEmpty:   $("#canvas-empty"),
  clusterNav:    $("#cluster-nav"),
  scrollDown:    $("#scroll-down"),
  topMenu:       $("#topmenu-btn"),

  tabAsk:      $("#tab-ask"),
  tabQuiz:     $("#tab-quiz"),
  chatAsk:     $("#chat-ask"),
  chatQuiz:    $("#chat-quiz"),

  composer:    $("#composer"),
  prompt:      $("#prompt"),
  sendBtn:     $("#send-btn"),
  micBtn:      $("#mic-btn"),
  addFileBtn:  $("#addfile-btn"),
  fileInput:   $("#file-input"),

  followUpToggle: $("#followup-toggle"),
  followUpLabel:  $("#followup-label"),
};

// ─────────────── Sidecar tabs ───────────────
function setMode(mode) {
  state.activeMode = mode;
  els.tabAsk.classList.toggle("is-active", mode === "ask");
  els.tabQuiz.classList.toggle("is-active", mode === "quiz");
  els.chatAsk.classList.toggle("is-hidden", mode !== "ask");
  els.chatQuiz.classList.toggle("is-hidden", mode !== "quiz");
  els.followUpToggle.classList.toggle("is-hidden", mode !== "ask");
  els.composer.classList.toggle("is-hidden", mode === "quiz");
  document.querySelector("main.canvas").classList.toggle("is-quiz-active", mode === "quiz");
  if (mode === "ask") {
    els.prompt.placeholder = state.followUpMode
      ? "Follow up on this cluster…"
      : "Ask something to study…";
    renderAskChat();
  }
}
els.tabAsk.addEventListener("click", () => setMode("ask"));
els.tabQuiz.addEventListener("click", () => {
  setMode("quiz");
  if (state.quizHistory.length === 0) seedQuiz();
});

// ─────────────── Composer ───────────────
els.prompt.addEventListener("input", () => {
  els.prompt.style.height = "auto";
  els.prompt.style.height = Math.min(160, els.prompt.scrollHeight) + "px";
});
els.prompt.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    els.composer.requestSubmit();
  }
});

els.composer.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = els.prompt.value.trim();
  if (!text) return;

  els.prompt.value = "";
  els.prompt.style.height = "auto";

  if (state.activeMode === "ask") {
    if (state.followUpMode) handleFollowUp(text);
    else handleAsk(text);
  }
});

// ─────────────── ASK flow ───────────────
async function handleAsk(prompt) {
  pushAskMessage("user", prompt);
  const topic = stickyTopic();
  const cluster = mountClusterSkeleton(prompt);
  state.clusters.push(cluster);
  addClusterNavDot(cluster);
  enableFollowUpToggle();
  els.canvasEmpty?.remove();

  const history = state.history.slice(-HISTORY_TURNS * 2);
  const attachedImage = state.pendingImage;
  state.pendingImage = null;

  // 1) ELI5 first — small, fast, instant gist
  const eli5Promise = postAsk({ mode: "eli5", prompt, topic })
    .then((r) => fillEli5(cluster, r.text))
    .catch((err) => fillEli5(cluster, fallback("ELI5", err)));

  // 2) Search terms first (small) so Wiki + YouTube can start
  const termsPromise = postAsk({ mode: "terms", prompt, topic })
    .then(async (r) => {
      const imageTerms = r.imageTerms || [];
      const videoTerms = r.videoTerms || [];
      const wiki = fetchImages(imageTerms)
        .then((imgs) => fillImages(cluster, imgs))
        .catch((err) => { console.warn("images failed", err); fillImages(cluster, []); });
      const yt = fetchYouTube(videoTerms.join(" ") || prompt)
        .then((vids) => fillVideos(cluster, vids))
        .catch((err) => { console.warn("youtube failed", err); fillVideos(cluster, []); });
      await Promise.allSettled([wiki, yt]);
    })
    .catch((err) => {
      fillImages(cluster, []);
      fillVideos(cluster, []);
      console.warn("terms failed", err);
    });

  // 3) Main explanation with full history context
  const explainPromise = postAsk({ mode: "explain", prompt, topic, history, image: attachedImage })
    .then((r) => {
      fillExplain(cluster, r.text);
      state.history.push({ role: "user", content: prompt });
      state.history.push({ role: "assistant", content: r.text });
      pushAskMessage("assistant", "→ cluster added below");
    })
    .catch((err) => fillExplain(cluster, fallback("Explanation", err)));

  // 4) Interesting fact
  const factPromise = postAsk({ mode: "fact", prompt, topic })
    .then((r) => fillFact(cluster, r.text))
    .catch((err) => fillFact(cluster, fallback("Fact", err)));

  await Promise.allSettled([eli5Promise, termsPromise, explainPromise, factPromise]);
}

function fallback(label, err) {
  console.warn(label, err);
  return `(${label} unavailable — ${err?.message || "error"})`;
}

// ─────────────── QUIZ flow ───────────────
function seedQuiz() {
  fetchNextQuestion();
}

function getBoardContext() {
  return state.clusters.map((c) => buildClusterContext(c));
}

async function fetchNextQuestion() {
  const topic = stickyTopic();
  const recentContext = state.quizHistory.slice(-HISTORY_TURNS * 2);
  const boardContext  = getBoardContext();

  els.chatQuiz.innerHTML = "";

  const loadingEl = document.createElement("div");
  loadingEl.className = "chat-msg assistant";
  loadingEl.textContent = "Generating question…";
  els.chatQuiz.appendChild(loadingEl);

  try {
    const r = await postAsk({ mode: "quiz", prompt: "Give me a new multiple-choice question.", topic, history: recentContext, boardContext });
    loadingEl.remove();

    let q;
    try { q = JSON.parse(r.text); } catch { q = null; }

    if (!q || !q.question || !q.options || !q.answer || !q.explanation) {
      appendChat("quiz", "assistant", "Could not load question — please try again.");
      return;
    }

    state.quizHistory.push({ role: "assistant", content: r.text });
    renderQuizQuestion(q);
  } catch (err) {
    loadingEl.remove();
    const errDiv = document.createElement("div");
    errDiv.className = "chat-msg assistant quiz-error-msg";
    const isRateLimit = err?.message?.includes("429");
    errDiv.innerHTML =
      `<span>${isRateLimit ? "Rate limited — wait a moment and try again." : `Error: ${err?.message || "unknown"}`}</span> ` +
      `<button class="quiz-retry-btn">Try again</button>`;
    els.chatQuiz.appendChild(errDiv);
    els.chatQuiz.scrollTop = els.chatQuiz.scrollHeight;
    errDiv.querySelector(".quiz-retry-btn").addEventListener("click", () => {
      errDiv.remove();
      fetchNextQuestion();
    });
  }
}

function renderQuizQuestion(q) {
  const div = document.createElement("div");
  div.className = "quiz-card";
  div.innerHTML = `
    <div class="quiz-question">${escapeHtml(q.question)}</div>
    <div class="quiz-options">
      ${Object.entries(q.options).map(([key, val]) => `
        <button class="quiz-option" data-key="${key}">
          <span class="quiz-option-key">${key}</span>
          <span class="quiz-option-text">${escapeHtml(val)}</span>
        </button>
      `).join("")}
    </div>
    <div class="quiz-feedback" hidden></div>
    <div class="quiz-actions" hidden>
      <button class="quiz-next-btn">Next question →</button>
    </div>
  `;

  els.chatQuiz.appendChild(div);

  const feedbackEl = div.querySelector(".quiz-feedback");
  const actionsEl  = div.querySelector(".quiz-actions");

  div.querySelectorAll(".quiz-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (div.dataset.answered) return;
      div.dataset.answered = "1";

      const selected = btn.dataset.key;
      const correct  = selected === q.answer;

      div.querySelectorAll(".quiz-option").forEach((b) => {
        b.disabled = true;
        if (b.dataset.key === q.answer) b.classList.add("is-correct");
        else if (b.dataset.key === selected && !correct) b.classList.add("is-wrong");
      });

      feedbackEl.className = `quiz-feedback ${correct ? "is-correct" : "is-wrong"}`;
      feedbackEl.innerHTML =
        `<span class="quiz-result-icon">${correct ? "✓" : "✗"}</span>` +
        `<span>${correct ? "Correct!" : `Incorrect — the answer is <strong>${q.answer}</strong>.`} ${escapeHtml(q.explanation)}</span>`;
      feedbackEl.hidden = false;
      actionsEl.hidden = false;

      state.quizHistory.push({ role: "user", content: `User chose ${selected}. Correct answer: ${q.answer}.` });
    });
  });

  div.querySelector(".quiz-next-btn").addEventListener("click", fetchNextQuestion);
}

// ─────────────── Cluster DOM ───────────────
function renderClusterTopic(prompt) {
  const trimmed = prompt.trim();
  const m = trimmed.match(/^(.*?\S)(\s+\S+)([.!?]*)$/);
  if (!m) return escapeHtml(trimmed);
  const [, head, tail, punct] = m;
  return `${escapeHtml(head)}<span class="accent">${escapeHtml(tail)}</span>${escapeHtml(punct)}`;
}

function mountClusterSkeleton(prompt) {
  const id = "c" + Date.now();
  const el = document.createElement("section");
  el.className = "cluster";
  el.id = id;
  const clusterIndex = String(state.clusters.length + 1).padStart(2, "0");
  const clusterTime = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  el.innerHTML = `
    <header class="cluster-header">
      <div class="cluster-meta">Cluster <span class="cluster-index">${clusterIndex}</span> · <time class="cluster-time">${escapeHtml(clusterTime)}</time></div>
      <h2 class="cluster-topic">${renderClusterTopic(prompt)}</h2>
    </header>
    <article class="card card-explain" data-slot="explain">
      <div class="card-title">Explanation</div>
      <div class="card-body"><div class="skel" style="height:14px"></div><div class="skel" style="height:14px;width:90%"></div><div class="skel" style="height:14px;width:75%"></div></div>
    </article>
    <div class="card-images" data-slot="images">
      ${[0,1,2].map(() => `<article class="card card-image"><div class="skel" style="aspect-ratio:4/3"></div></article>`).join("")}
    </div>
    <div class="card-videos" data-slot="videos">
      ${[0,1].map(() => `<article class="card card-video"><div class="skel" style="aspect-ratio:16/9"></div><div class="skel" style="height:12px;margin-top:8px"></div></article>`).join("")}
    </div>
    <article class="card card-eli5" data-slot="eli5">
      <div class="card-title">Explain like a kid</div>
      <div class="card-body"><div class="skel" style="height:14px"></div><div class="skel" style="height:14px;width:85%"></div></div>
    </article>
    <article class="card card-artifact" data-slot="artifact">
      <div class="card-title">✦ Add artifact</div>
      <div class="artifact-options">
        <button class="artifact-btn" data-type="explain" type="button">＋ Explain</button>
        <button class="artifact-btn" data-type="mnemonic" type="button">＋ Mnemonic</button>
        <button class="artifact-btn" data-type="image" type="button">＋ Image</button>
        <button class="artifact-btn" data-type="youtube" type="button">＋ YouTube</button>
      </div>
      <div class="artifact-input">
        <input type="text" />
        <button class="sendbtn" type="button" style="width:auto;padding:0 12px">Add</button>
      </div>
    </article>
    <article class="card card-fact" data-slot="fact">
      <span class="card-title">💡 Fact</span>
      <span class="card-body"><span class="skel" style="display:inline-block;width:240px;height:12px;vertical-align:middle"></span></span>
    </article>
    <div class="artifact-results" data-slot="artifact-results"></div>
  `;
  els.canvas.appendChild(el);
  wireArtifact(el);
  setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  return { id, el, prompt, followUpHistory: [] };
}

function fillExplain(cluster, text) {
  const card = cluster.el.querySelector('[data-slot="explain"]');
  card.querySelector('.card-body').innerHTML = renderMarkdown(text);
  makeCardMenu(card, {
    copyLabel: "Copy text",
    onCopy: () => navigator.clipboard.writeText(text).then(() => showCopyToast("Text copied")),
    onDelete: () => card.remove(),
  });
}
function fillEli5(cluster, text) {
  const card = cluster.el.querySelector('[data-slot="eli5"]');
  card.querySelector('.card-body').textContent = text;
  makeCardMenu(card, {
    copyLabel: "Copy text",
    onCopy: () => navigator.clipboard.writeText(text).then(() => showCopyToast("Text copied")),
    onDelete: () => card.remove(),
  });
}
function fillFact(cluster, text) {
  const card = cluster.el.querySelector('[data-slot="fact"]');
  card.querySelector('.card-body').textContent = text;
  makeCardMenu(card, {
    copyLabel: "Copy text",
    onCopy: () => navigator.clipboard.writeText(text).then(() => showCopyToast("Text copied")),
    onDelete: () => card.remove(),
  });
}
function fillImages(cluster, imgs) {
  const wrap = cluster.el.querySelector('[data-slot="images"]');
  if (!imgs.length) {
    wrap.innerHTML = `<article class="card card-image"><div class="card-title" style="color:var(--c-image)">Images</div><div class="card-body" style="color:var(--muted)">No matches found.</div></article>`;
    return;
  }
  wrap.innerHTML = "";
  imgs.slice(0, 3).forEach((url) => {
    const article = document.createElement("article");
    article.className = "card card-image";
    article.innerHTML = `<img loading="lazy" referrerpolicy="no-referrer" src="${escapeHtml(url)}" alt="image" onerror="this.closest('article').style.display='none'" />`;
    makeCardMenu(article, {
      copyLabel: "Copy image URL",
      onCopy: () => navigator.clipboard.writeText(url).then(() => showCopyToast("Image URL copied")),
      onDelete: () => article.remove(),
    });
    wrap.appendChild(article);
  });
}
function fillVideos(cluster, vids) {
  const wrap = cluster.el.querySelector('[data-slot="videos"]');
  if (!vids.length) {
    wrap.innerHTML = `<article class="card card-video"><div class="card-title" style="color:var(--c-video)">Videos</div><div class="card-body" style="color:var(--muted)">No matches.</div></article>`;
    return;
  }
  wrap.innerHTML = vids.slice(0, 2).map((v) => `
    <div class="card card-video card-video-thumb" data-videoid="${escapeHtml(v.videoId)}">
      <div class="video-content">
        <div class="video-thumb-wrap">
          <img loading="lazy" src="${v.thumbnail}" alt="${escapeHtml(v.title)}" />
          <div class="video-play-btn" aria-label="Play video">&#9654;</div>
        </div>
        <div class="video-title">${escapeHtml(v.title)}</div>
      </div>
    </div>
  `).join("");

  wrap.querySelectorAll(".card-video-thumb").forEach((card) => {
    makeCardMenu(card, {
      copyLabel: "Copy YouTube link",
      onCopy: () => {
        const url = `https://www.youtube.com/watch?v=${card.dataset.videoid}`;
        navigator.clipboard.writeText(url).then(() => showCopyToast("YouTube link copied"));
      },
      onDelete: () => card.remove(),
    });
    card.addEventListener("click", () => {
      if (!card.classList.contains("card-video-thumb")) return;
      const id = card.dataset.videoid;
      const content = card.querySelector(".video-content");
      if (content) content.innerHTML = `<iframe class="video-embed" src="https://www.youtube.com/embed/${id}?autoplay=1&rel=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
      card.classList.remove("card-video-thumb");
    });
  });
}

function wireArtifact(clusterEl) {
  const card = clusterEl.querySelector('[data-slot="artifact"]');
  const resultsContainer = clusterEl.querySelector('[data-slot="artifact-results"]');
  const btns = card.querySelectorAll(".artifact-btn");
  const wrap = card.querySelector(".artifact-input");
  const input = wrap.querySelector("input");
  const add = wrap.querySelector("button");
  let activeType = null;

  const placeholders = {
    explain: "e.g. explain quantum entanglement",
    mnemonic: "e.g. give me a mnemonic",
    image: "e.g. photosynthesis diagram",
    youtube: "e.g. how mitosis works",
  };
  const labels = { explain: "＋ Explain", mnemonic: "＋ Mnemonic", image: "＋ Image", youtube: "＋ YouTube" };

  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.type;
      if (activeType === type && wrap.classList.contains("is-open")) {
        wrap.classList.remove("is-open");
        activeType = null;
        btns.forEach((b) => b.classList.remove("is-active"));
        return;
      }
      activeType = type;
      input.placeholder = placeholders[type];
      wrap.classList.add("is-open");
      btns.forEach((b) => b.classList.toggle("is-active", b === btn));
      input.focus();
    });
  });

  const submit = async () => {
    const query = input.value.trim();
    if (!query || !activeType) return;
    input.value = "";
    const type = activeType;
    const activeBtn = card.querySelector(`.artifact-btn[data-type="${type}"]`);
    if (activeBtn) { activeBtn.disabled = true; activeBtn.textContent = "Adding…"; }
    try {
      if (type === "explain") {
        const r = await postAsk({ mode: "explain", prompt: query, topic: query, history: state.history.slice(-HISTORY_TURNS * 2) });
        const node = document.createElement("article");
        node.className = "card card-artifact-result";
        node.innerHTML = `<div class="card-title">✦ ${escapeHtml(query)}</div><div class="card-body"></div>`;
        node.querySelector(".card-body").innerHTML = renderMarkdown(r.text);
        makeCardMenu(node, {
          copyLabel: "Copy text",
          onCopy: () => navigator.clipboard.writeText(r.text).then(() => showCopyToast("Text copied")),
          onDelete: () => node.remove(),
        });
        resultsContainer.appendChild(node);
      } else if (type === "mnemonic") {
        const r = await postAsk({ mode: "artifact", prompt: query, topic: stickyTopic() });
        const node = document.createElement("article");
        node.className = "card card-artifact-result";
        node.innerHTML = `<div class="card-title">✦ ${escapeHtml(query)}</div><div class="card-body"></div>`;
        node.querySelector(".card-body").innerHTML = renderMarkdown(r.text);
        makeCardMenu(node, {
          copyLabel: "Copy text",
          onCopy: () => navigator.clipboard.writeText(r.text).then(() => showCopyToast("Text copied")),
          onDelete: () => node.remove(),
        });
        resultsContainer.appendChild(node);
      } else if (type === "image") {
        const resp = await fetch(`/api/images?q=${encodeURIComponent(query)}`);
        const urls = await resp.json();
        const node = document.createElement("div");
        node.className = "card-images card-artifact-result-images";
        if (urls.length) {
          urls.slice(0, 3).forEach((url) => {
            const article = document.createElement("article");
            article.className = "card card-image";
            article.innerHTML = `<img loading="lazy" referrerpolicy="no-referrer" src="${escapeHtml(url)}" alt="image" onerror="this.closest('article').style.display='none'" />`;
            makeCardMenu(article, {
              copyLabel: "Copy image URL",
              onCopy: () => navigator.clipboard.writeText(url).then(() => showCopyToast("Image URL copied")),
              onDelete: () => article.remove(),
            });
            node.appendChild(article);
          });
        } else {
          node.innerHTML = `<article class="card card-image"><div class="card-body" style="color:var(--muted)">No images found.</div></article>`;
        }
        resultsContainer.appendChild(node);
      } else if (type === "youtube") {
        const resp = await fetch(`/api/youtube?q=${encodeURIComponent(query)}`);
        const vids = await resp.json();
        const node = document.createElement("div");
        node.className = "card-videos card-artifact-result-videos";
        if (!vids.length) {
          node.innerHTML = `<article class="card card-video"><div class="card-body" style="color:var(--muted)">No videos found.</div></article>`;
        } else {
          node.innerHTML = vids.slice(0, 2).map((v) => `
            <div class="card card-video card-video-thumb" data-videoid="${escapeHtml(v.videoId)}">
              <div class="video-content">
                <div class="video-thumb-wrap">
                  <img loading="lazy" src="${v.thumbnail}" alt="${escapeHtml(v.title)}" />
                  <div class="video-play-btn" aria-label="Play video">&#9654;</div>
                </div>
                <div class="video-title">${escapeHtml(v.title)}</div>
              </div>
            </div>`).join("");
          node.querySelectorAll(".card-video-thumb").forEach((thumb) => {
            makeCardMenu(thumb, {
              copyLabel: "Copy YouTube link",
              onCopy: () => {
                const url = `https://www.youtube.com/watch?v=${thumb.dataset.videoid}`;
                navigator.clipboard.writeText(url).then(() => showCopyToast("YouTube link copied"));
              },
              onDelete: () => thumb.remove(),
            });
            thumb.addEventListener("click", () => {
              if (!thumb.classList.contains("card-video-thumb")) return;
              const id = thumb.dataset.videoid;
              const content = thumb.querySelector(".video-content");
              if (content) content.innerHTML = `<iframe class="video-embed" src="https://www.youtube.com/embed/${id}?autoplay=1&rel=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
              thumb.classList.remove("card-video-thumb");
            });
          });
        }
        resultsContainer.appendChild(node);
      }
    } catch (err) {
      alert("Failed to add artifact: " + (err?.message || err));
    } finally {
      if (activeBtn) { activeBtn.disabled = false; activeBtn.textContent = labels[type]; }
      wrap.classList.remove("is-open");
      btns.forEach((b) => b.classList.remove("is-active"));
      activeType = null;
    }
  };

  add.addEventListener("click", submit);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
}

// ─────────────── Cluster nav (left rail) ───────────────
function addClusterNavDot(cluster) {
  const dot = document.createElement("button");
  dot.className = "cluster-dot";
  dot.title = cluster.prompt;
  dot.addEventListener("click", () => cluster.el.scrollIntoView({ behavior: "smooth", block: "start" }));
  els.clusterNav.appendChild(dot);
}

// ─────────────── Sticky notes ───────────────
function stickyTopic() {
  const first = els.stickiesLayer?.querySelector(".sticky-text");
  return (first?.textContent || "").trim() || "general study";
}

function makeStickyBoard(text = "") {
  const board = document.createElement("div");
  board.className = "sticky-board";
  board.innerHTML = `
    <div class="sticky-tape"></div>
    <div class="sticky-note">
      <div class="sticky-label">TO-DO</div>
      <div class="sticky-text" contenteditable="true" spellcheck="false">${escapeHtml(text)}</div>
      <button class="sticky-delete" aria-label="Delete sticky">×</button>
    </div>
  `;
  board.querySelector(".sticky-delete").addEventListener("click", () => board.remove());
  return board;
}

els.stickyAdd.addEventListener("click", () => {
  const board = makeStickyBoard();
  els.stickiesLayer.insertBefore(board, els.stickyAdd);
  board.querySelector(".sticky-text").focus();
});

// Wire delete on the initial sticky note
document.querySelector("#stickies-layer .sticky-delete")
  ?.addEventListener("click", function () { this.closest(".sticky-board").remove(); });

// ─────────────── Chat output ───────────────
function appendChat(mode, role, text, opts = {}) {
  const root = mode === "ask" ? els.chatAsk : els.chatQuiz;
  appendMsgDOM(root, role, text, opts);
}
function appendMsgDOM(root, role, text, opts = {}) {
  const div = document.createElement("div");
  div.className = `chat-msg ${role}`;
  if (opts.ephemeral) div.dataset.ephemeral = "1";
  div.textContent = text;
  root.appendChild(div);
  root.scrollTop = root.scrollHeight;
}
function replaceEphemeral(mode, text) {
  const root = mode === "ask" ? els.chatAsk : els.chatQuiz;
  const last = root.querySelector('[data-ephemeral="1"]:last-of-type');
  if (last) {
    last.dataset.ephemeral = "";
    last.textContent = text;
  } else {
    appendChat(mode, "assistant", text);
  }
}

// Push to global ask history + render if currently showing global ask.
function pushAskMessage(role, content) {
  state.askMessages.push({ role, content });
  if (!state.followUpMode && state.activeMode === "ask") {
    appendMsgDOM(els.chatAsk, role, content);
  }
}

// Push to a cluster's follow-up history + render if that cluster is the focused view.
function pushFollowUpMessage(cluster, role, content) {
  cluster.followUpHistory.push({ role, content });
  if (state.followUpMode && state.focusedClusterId === cluster.id && state.activeMode === "ask") {
    appendMsgDOM(els.chatAsk, role, content);
  }
}

// Wipe + re-render the ask chat from whichever source is active right now.
function renderAskChat() {
  els.chatAsk.innerHTML = "";
  const source = state.followUpMode
    ? (focusedCluster()?.followUpHistory || [])
    : state.askMessages;
  for (const msg of source) appendMsgDOM(els.chatAsk, msg.role, msg.content);
}

function focusedCluster() {
  return state.clusters.find((c) => c.id === state.focusedClusterId) || null;
}

// ─────────────── Network ───────────────
async function postAsk(body) {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`ask ${body.mode} ${res.status}`);
  return res.json();
}

async function fetchYouTube(q) {
  if (!q || !q.trim()) return [];
  const res = await fetch(`/api/youtube?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error(`youtube ${res.status}`);
  return res.json();
}

async function fetchImages(terms) {
  if (!terms || !terms.length) return [];
  const q = terms.slice(0, 3).join(" ");
  const res = await fetch(`/api/images?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error(`images ${res.status}`);
  return res.json();
}

// ─────────────── Scroll-down ───────────────
els.scrollDown.addEventListener("click", () => {
  const last = state.clusters[state.clusters.length - 1];
  if (last) last.el.scrollIntoView({ behavior: "smooth", block: "start" });
  else els.canvas.scrollTo({ top: 0, behavior: "smooth" });
});

// ─────────────── Top menu (stub) ───────────────
els.topMenu.addEventListener("click", () => {
  const action = prompt("Menu — type: clear | about");
  if (action === "clear") location.reload();
  else if (action === "about") alert("Synapse — a personal learning canvas.\nOne prompt → one cluster on the board.");
});

// ─────────────── Mic (Web Speech API) ───────────────
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SR) {
  els.micBtn.disabled = true;
  els.micBtn.title = "Voice input not supported in this browser";
} else {
  const rec = new SR();
  rec.continuous = false;
  rec.interimResults = true;
  rec.lang = navigator.language || "en-US";
  let recording = false;
  rec.onresult = (e) => {
    const transcript = Array.from(e.results).map((r) => r[0].transcript).join(" ");
    els.prompt.value = transcript;
    els.prompt.dispatchEvent(new Event("input"));
  };
  rec.onend = () => { recording = false; els.micBtn.classList.remove("is-recording"); };
  rec.onerror = () => { recording = false; els.micBtn.classList.remove("is-recording"); };
  els.micBtn.addEventListener("click", () => {
    if (recording) { rec.stop(); return; }
    try { rec.start(); recording = true; els.micBtn.classList.add("is-recording"); }
    catch (err) { console.warn("mic", err); }
  });
}

// ─────────────── File upload (image → next ask) ───────────────
els.addFileBtn.addEventListener("click", () => els.fileInput.click());
els.fileInput.addEventListener("change", async () => {
  const file = els.fileInput.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.pendingImage = reader.result;
    els.addFileBtn.textContent = "📎";
    els.addFileBtn.title = `Attached: ${file.name}`;
  };
  reader.readAsDataURL(file);
});

// ─────────────── Card menu ───────────────
const _toastEl = (() => {
  const el = document.createElement("div");
  el.className = "copy-toast";
  document.body.appendChild(el);
  return el;
})();
let _toastTimer = null;

function showCopyToast(msg = "Copied") {
  _toastEl.textContent = msg;
  _toastEl.classList.add("is-visible");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => _toastEl.classList.remove("is-visible"), 2000);
}

function closeAllCardMenus() {
  document.querySelectorAll(".card-menu-btn.is-active").forEach((b) => b.classList.remove("is-active"));
  document.querySelectorAll(".card-menu-dropdown.is-open").forEach((d) => d.classList.remove("is-open"));
}

document.addEventListener("click", closeAllCardMenus);

function makeCardMenu(cardEl, { copyLabel = "Copy", onCopy, onDelete }) {
  const btn = document.createElement("button");
  btn.className = "card-menu-btn";
  btn.setAttribute("aria-label", "Card options");
  btn.textContent = "···";
  cardEl.appendChild(btn);

  const dropdown = document.createElement("div");
  dropdown.className = "card-menu-dropdown";
  dropdown.innerHTML = `
    <button class="card-menu-item" data-action="copy">${escapeHtml(copyLabel)}</button>
    <button class="card-menu-item card-menu-item--delete" data-action="delete">Delete</button>
  `;
  document.body.appendChild(dropdown);

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const alreadyOpen = btn.classList.contains("is-active");
    closeAllCardMenus();
    if (alreadyOpen) return;
    btn.classList.add("is-active");
    dropdown.style.visibility = "hidden";
    dropdown.classList.add("is-open");
    const r = btn.getBoundingClientRect();
    const left = Math.max(4, r.right - dropdown.offsetWidth);
    const top = r.bottom + 4 + dropdown.offsetHeight > window.innerHeight
      ? r.top - dropdown.offsetHeight - 4
      : r.bottom + 4;
    dropdown.style.top = top + "px";
    dropdown.style.left = left + "px";
    dropdown.style.visibility = "";
  });

  dropdown.querySelector('[data-action="copy"]').addEventListener("click", (e) => {
    e.stopPropagation();
    closeAllCardMenus();
    onCopy?.();
  });

  dropdown.querySelector('[data-action="delete"]').addEventListener("click", (e) => {
    e.stopPropagation();
    closeAllCardMenus();
    dropdown.remove();
    onDelete?.();
  });
}

// ─────────────── Utils ───────────────
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
}

function renderMarkdown(text) {
  const lines = text.split("\n");
  let html = "";
  let listType = null; // "ul" | "ol"

  const inline = (s) =>
    escapeHtml(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");

  const closeList = () => {
    if (listType) { html += `</${listType}>`; listType = null; }
  };

  for (const raw of lines) {
    const line = raw.trim();
    const olMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (line.startsWith("## ")) {
      closeList();
      html += `<h2>${inline(line.slice(3))}</h2>`;
    } else if (line.startsWith("### ")) {
      closeList();
      html += `<h3>${inline(line.slice(4))}</h3>`;
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      if (listType !== "ul") { closeList(); html += "<ul>"; listType = "ul"; }
      html += `<li>${inline(line.slice(2))}</li>`;
    } else if (olMatch) {
      if (listType !== "ol") { closeList(); html += "<ol>"; listType = "ol"; }
      html += `<li>${inline(olMatch[2])}</li>`;
    } else if (line === "") {
      closeList();
    } else {
      closeList();
      html += `<p>${inline(line)}</p>`;
    }
  }
  closeList();
  return html;
}

// ─────────────── Follow-up mode ───────────────
function enableFollowUpToggle() {
  els.followUpToggle.disabled = false;
  els.followUpToggle.title = state.followUpMode
    ? "Click to turn off follow-up"
    : "Chat about the most recent cluster";
}

function latestCluster() {
  return state.clusters[state.clusters.length - 1] || null;
}

function setFollowUpMode(on) {
  if (on && state.clusters.length === 0) return;

  if (on) {
    const target = latestCluster();
    state.focusedClusterId = target.id;
    state.followUpMode = true;
    state.clusters.forEach((c) => c.el.classList.toggle("is-focused", c.id === target.id));
    els.followUpToggle.classList.add("is-on");
    els.followUpLabel.textContent = `Following up on: "${target.prompt}"`;
    els.followUpToggle.title = "Click to turn off follow-up";
    els.prompt.placeholder = "Follow up on this cluster…";
  } else {
    state.followUpMode = false;
    state.focusedClusterId = null;
    state.clusters.forEach((c) => c.el.classList.remove("is-focused"));
    els.followUpToggle.classList.remove("is-on");
    els.followUpLabel.textContent = "Follow-up";
    els.followUpToggle.title = "Chat about the most recent cluster";
    els.prompt.placeholder = "Ask something to study…";
  }
  renderAskChat();
}

els.followUpToggle.addEventListener("click", () => {
  if (els.followUpToggle.disabled) return;
  setFollowUpMode(!state.followUpMode);
});

function buildClusterContext(cluster) {
  const textOf = (sel) => (cluster.el.querySelector(sel)?.textContent || "").trim();
  return {
    prompt:  cluster.prompt,
    explain: textOf('[data-slot="explain"] .card-body'),
    eli5:    textOf('[data-slot="eli5"] .card-body'),
    fact:    textOf('[data-slot="fact"] .card-body'),
  };
}

async function handleFollowUp(prompt) {
  const cluster = focusedCluster();
  if (!cluster) {
    setFollowUpMode(false);
    return handleAsk(prompt);
  }

  pushFollowUpMessage(cluster, "user", prompt);
  const ephemeralMsg = document.createElement("div");
  if (state.activeMode === "ask") {
    ephemeralMsg.className = "chat-msg assistant";
    ephemeralMsg.dataset.ephemeral = "1";
    ephemeralMsg.textContent = "…";
    els.chatAsk.appendChild(ephemeralMsg);
    els.chatAsk.scrollTop = els.chatAsk.scrollHeight;
  }

  try {
    const r = await postAsk({
      mode: "followup",
      prompt,
      topic: stickyTopic(),
      clusterContext: buildClusterContext(cluster),
      history: cluster.followUpHistory.slice(-HISTORY_TURNS * 2 - 1, -1),
    });
    ephemeralMsg.remove();
    pushFollowUpMessage(cluster, "assistant", r.text);
  } catch (err) {
    ephemeralMsg.remove();
    pushFollowUpMessage(cluster, "assistant", fallback("Follow-up", err));
  }
}

console.log("Synapse main.js ready");
