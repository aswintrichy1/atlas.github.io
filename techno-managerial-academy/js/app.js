(function () {
  "use strict";

  const DATA = window.TM_DATA;
  const STORE = {
    progress: "tm_progress_v1",
    weak: "tm_weak_v1",
    story: "tm_story_bank_v1",
    theme: "tm_theme",
    flash: "tm_flash_v1",
    interviewHistory: "tm_interview_history_v1",
    interviewDraft: "tm_interview_draft_v1"
  };
  const main = document.getElementById("main");
  const toastEl = document.getElementById("toast");
  let activeTimer = null;
  const state = {
    progress: readSet(STORE.progress),
    weak: readJson(STORE.weak, {}),
    flash: readJson(STORE.flash, {}),
    quiz: { idx: 0, score: 0, items: [] },
    flashIdx: 0,
    flashBack: false,
    sim: null
  };

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
      return value && typeof value === "object" ? value : fallback;
    } catch (_) {
      return fallback;
    }
  }
  function readSet(key) {
    try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); } catch (_) { return new Set(); }
  }
  function saveSet(key, set) { try { localStorage.setItem(key, JSON.stringify([...set])); } catch (_) {} }
  function saveJson(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function allLessons() { return DATA.tracks.flatMap((t) => t.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, track: t, module: m })))); }
  function lessonKey(trackId, moduleId, lessonId) { return `${trackId}/${moduleId}/${lessonId}`; }
  function lessonRoute(trackId, moduleId, lessonId) { return `#/${trackId}/${moduleId}/${lessonId}`; }
  function findLesson(trackId, moduleId, lessonId) {
    return allLessons().find((l) => l.track.id === trackId && l.module.id === moduleId && l.id === lessonId);
  }
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }
  function stopTimer() {
    if (activeTimer) clearInterval(activeTimer);
    activeTimer = null;
  }
  function focusMain() {
    main.focus({ preventScroll: true });
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.getElementById("themeToggle").setAttribute("aria-pressed", theme === "light" ? "true" : "false");
    try { localStorage.setItem(STORE.theme, theme); } catch (_) {}
  }

  function shell(title, html) {
    stopTimer();
    main.innerHTML = html;
    document.title = `${title} · TechLead`;
    window.scrollTo(0, 0);
    updateProgress();
    updateActiveNav();
    setTimeout(focusMain, 0);
  }

  function updateProgress() {
    const total = allLessons().length;
    const pct = total ? Math.round((state.progress.size / total) * 100) : 0;
    const ring = document.getElementById("prValue");
    if (ring) ring.style.strokeDashoffset = String(97.4 - (97.4 * pct / 100));
    const text = document.getElementById("progressText");
    if (text) text.textContent = `${pct}%`;
  }

  function buildNav() {
    const nav = document.getElementById("nav");
    nav.innerHTML = DATA.tracks.map((track) => `
      <section class="nav-track" style="--track-color:${esc(track.color)}">
        <div class="nav-track-head"><span class="tk-dot"></span><div><div class="tk-name">${esc(track.name)}</div><div class="tk-meta">${esc(track.modules.length)} modules</div></div></div>
        ${track.modules.map((mod) => `
          <div class="nav-module">
            <div class="nav-module-title">${esc(mod.name)}</div>
            <div class="nav-lessons">
              ${mod.lessons.map((lesson) => {
                const key = lessonKey(track.id, mod.id, lesson.id);
                return `<a href="${lessonRoute(track.id, mod.id, lesson.id)}" data-route="${lessonRoute(track.id, mod.id, lesson.id)}" class="${state.progress.has(key) ? "done" : ""}">${esc(lesson.title)}</a>`;
              }).join("")}
            </div>
          </div>
        `).join("")}
      </section>
    `).join("");
  }

  function updateActiveNav() {
    document.querySelectorAll("[data-route]").forEach((a) => {
      const active = a.getAttribute("data-route") === location.hash;
      a.classList.toggle("active", active);
      if (active) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  function renderHome() {
    const lessons = allLessons();
    shell("Home", `
      <section class="hero">
        <span class="hero-tag"><span class="pulse"></span>offline · local · interview operating system</span>
        <h1>Practice the round where <span class="grad">technical judgment meets business pressure</span>.</h1>
        <p class="lede">TechLead now uses the same Atlas shell as Blueprint and Cascade: sidebar curriculum, feature pane, search, progress, rubrics, simulator, local story bank, quizzes, flashcards, and model-answer calibration.</p>
        <div class="hero-cta">
          <a class="btn btn-primary" href="#/hld/framing/round-decoder">Start HLD leadership</a>
          <a class="btn btn-ghost" href="#/interview">Run simulator</a>
          <a class="btn btn-ghost" href="#/rubrics">Open rubrics</a>
        </div>
        <div class="hero-stats">
          <span class="stat"><b>${DATA.tracks.length}</b> tracks</span>
          <span class="stat"><b>${lessons.length}</b> lessons</span>
          <span class="stat"><b>${DATA.questions.length}</b> quiz questions</span>
          <span class="stat"><b>${DATA.scenarios.length}</b> scenarios</span>
          <span class="stat"><b>${DATA.companyPacks.length}</b> company packs</span>
        </div>
      </section>
      <section class="section">
        <div class="track-cards">
          ${DATA.tracks.map((t) => `<a class="track-card" style="--track-color:${esc(t.color)}" href="${lessonRoute(t.id, t.modules[0].id, t.modules[0].lessons[0].id)}"><h2>${esc(t.name)}</h2><p>${esc(t.blurb)}</p><div class="chips">${t.modules.map((m) => `<span class="chip">${esc(m.name)}</span>`).join("")}</div><span class="go">Open track →</span></a>`).join("")}
        </div>
      </section>
    `);
  }

  function renderLesson(trackId, moduleId, lessonId) {
    const lesson = findLesson(trackId, moduleId, lessonId);
    if (!lesson) return renderHome();
    const key = lessonKey(trackId, moduleId, lessonId);
    const done = state.progress.has(key);
    shell(lesson.title, `
      <article class="lesson" style="--track-color:${esc(lesson.track.color)}">
        <div class="crumbs"><a href="#/">Home</a> / ${esc(lesson.track.name)} / ${esc(lesson.module.name)}</div>
        <header class="lesson-head">
          <span class="eyebrow">${esc(lesson.track.short)} · ${esc(lesson.minutes)} min</span>
          <h1><span class="grad">${esc(lesson.title)}</span></h1>
          <p class="summary">${esc(lesson.summary)}</p>
          <div class="tags">${lesson.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
        </header>
        <div class="lesson-body">
          <section class="block"><h2 class="block-h">What to practice</h2><ul>${lesson.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></section>
          <section class="block"><h2 class="block-h">Interview signal map</h2><div class="table-wrap"><table><thead><tr><th>Area</th><th>Strong signal</th></tr></thead><tbody>${lesson.tableRows.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join("")}</tbody></table></div></section>
          <div class="note"><b>Drill:</b> ${esc(lesson.drill)}</div>
          <section class="block"><h2 class="block-h">Score yourself</h2>${renderRubricMini()}</section>
        </div>
        <div class="complete-bar">
          <button class="btn btn-primary" id="markDone" type="button" aria-pressed="${done ? "true" : "false"}">${done ? "Completed" : "Mark complete"}</button>
          <a class="btn btn-ghost" href="#/quiz">Quiz</a>
          <a class="btn btn-ghost" href="#/interview">Simulator</a>
        </div>
      </article>
    `);
    document.getElementById("markDone").addEventListener("click", () => {
      state.progress.add(key);
      saveSet(STORE.progress, state.progress);
      buildNav();
      toast("Lesson marked complete.");
      renderLesson(trackId, moduleId, lessonId);
    });
  }

  function renderRubricMini() {
    return `<div class="score-grid">${DATA.rubrics.dimensions.map((d) => `<div class="score-card"><b>${esc(d[1])}</b><p>${esc(d[2])}</p></div>`).join("")}</div>`;
  }

  function renderPractice() {
    shell("Practice", `
      <section class="hero"><span class="hero-tag"><span class="pulse"></span>practice library</span><h1>Scenario drills with scoring signals.</h1><p class="lede">Use these as timed prompts, then score for technical judgment, managerial reasoning, communication, decision quality, and leadership signal.</p></section>
      <section class="section card-grid">${DATA.scenarios.map((s) => `<article class="card"><h2>${esc(s.title)}</h2><p>${esc(s.prompt)}</p><div class="chips"><span class="chip">${esc(s.category)}</span>${s.signals.map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div></article>`).join("")}</section>
    `);
  }

  function renderRubrics() {
    shell("Rubrics", `
      <section class="hero"><span class="hero-tag"><span class="pulse"></span>scorecard</span><h1>Reusable techno-managerial scoring rubric.</h1><p class="lede">Use the same dimensions for lessons, scenarios, model answers, and simulator attempts.</p></section>
      <section class="section">
        <article class="panel"><h2>Dimensions</h2>${renderRubricMini()}</article>
        <article class="panel"><h2>1-5 Score Labels</h2><div class="table-wrap"><table><thead><tr><th>Score</th><th>Label</th><th>Meaning</th></tr></thead><tbody>${DATA.rubrics.scale.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join("")}</tbody></table></div></article>
      </section>
    `);
  }

  function renderQuizStart() {
    state.quiz = { idx: 0, score: 0, items: shuffle(DATA.questions.slice()) };
    shell("Quiz", `<section class="panel quiz-q"><h1><span class="grad">Judgment Quiz</span></h1><p>${DATA.questions.length} scenario questions across HLD, LLD, Data Engineering, and leadership behavior.</p><div class="actions"><button class="btn btn-primary" id="startQuiz" type="button">Start quiz</button></div></section>`);
    document.getElementById("startQuiz").addEventListener("click", renderQuizQuestion);
  }
  function renderQuizQuestion() {
    const item = state.quiz.items[state.quiz.idx];
    if (!item) return renderQuizResult();
    shell("Quiz", `<section class="panel quiz-q"><div class="crumbs">Question ${state.quiz.idx + 1} / ${state.quiz.items.length} · ${esc(item.track)}</div><h1>${esc(item.prompt)}</h1>${item.options.map((o, i) => `<button class="q-opt" type="button" data-i="${i}">${esc(o)}</button>`).join("")}<div id="quizExplain" aria-live="polite"></div></section>`);
    document.querySelectorAll(".q-opt").forEach((btn) => btn.addEventListener("click", () => {
      const picked = Number(btn.dataset.i);
      document.querySelectorAll(".q-opt").forEach((b, i) => {
        b.disabled = true;
        if (i === item.answer) { b.classList.add("good"); b.insertAdjacentHTML("beforeend", ' <span class="q-mark" aria-hidden="true">\u2713</span><span class="sr-only"> (correct answer)</span>'); }
        if (i === picked && i !== item.answer) { b.classList.add("bad"); b.insertAdjacentHTML("beforeend", ' <span class="q-mark" aria-hidden="true">\u2717</span><span class="sr-only"> (your answer, incorrect)</span>'); }
      });
      if (picked === item.answer) state.quiz.score++;
      else {
        state.weak[item.prompt] = { prompt: item.prompt, explain: item.explain, at: new Date().toISOString() };
        saveJson(STORE.weak, state.weak);
      }
      document.getElementById("quizExplain").innerHTML = `<div class="note">${esc(item.explain)}</div><div class="actions"><button class="btn btn-primary" id="nextQ" type="button">Next</button></div>`;
      document.getElementById("nextQ").addEventListener("click", () => { state.quiz.idx++; renderQuizQuestion(); });
    }));
  }
  function renderQuizResult() {
    shell("Quiz Result", `<section class="panel"><h1><span class="grad">${state.quiz.score} / ${state.quiz.items.length}</span></h1><p>Missed questions were saved locally as weak spots.</p><div class="actions"><a class="btn btn-primary" href="#/quiz">Retry</a><a class="btn btn-ghost" href="#/">Home</a></div></section>`);
  }

  function renderFlashcards() {
    const idx = state.flashIdx % DATA.flashcards.length;
    const card = DATA.flashcards[idx];
    shell("Flashcards", `<section class="panel flash-page"><div class="crumbs">${idx + 1} / ${DATA.flashcards.length}</div><div class="flash-card">${state.flashBack ? `<p class="flash-back">${esc(card.back)}</p>` : `<p class="flash-front">${esc(card.front)}</p>`}</div><div class="actions"><button class="btn btn-primary" id="flip" type="button">Flip</button><button class="btn btn-ghost" id="known" type="button" aria-pressed="${state.flash[idx] === "known"}">Known</button><button class="btn btn-ghost" id="review" type="button" aria-pressed="${state.flash[idx] === "review"}">Review</button><button class="btn btn-ghost" id="nextFlash" type="button">Next</button></div></section>`);
    document.getElementById("flip").addEventListener("click", () => { state.flashBack = !state.flashBack; renderFlashcards(); });
    document.getElementById("known").addEventListener("click", () => { state.flash[idx] = "known"; saveJson(STORE.flash, state.flash); toast("Marked known."); });
    document.getElementById("review").addEventListener("click", () => { state.flash[idx] = "review"; saveJson(STORE.flash, state.flash); toast("Marked for review."); });
    document.getElementById("nextFlash").addEventListener("click", () => { state.flashIdx = (state.flashIdx + 1) % DATA.flashcards.length; state.flashBack = false; renderFlashcards(); });
  }

  function renderModels() {
    shell("Model Answers", `<section class="hero"><span class="hero-tag"><span class="pulse"></span>calibration</span><h1>Weak / good / senior answers.</h1><p class="lede">Calibrate depth and structure. Do not memorize scripts.</p></section><section class="section">${DATA.models.map((m) => `<article class="panel"><h2>${esc(m.title)}</h2><p>${esc(m.prompt)}</p><div class="models"><div class="model-card weak"><h3>Weak</h3><p>${esc(m.weak)}</p></div><div class="model-card good"><h3>Good</h3><p>${esc(m.good)}</p></div><div class="model-card senior"><h3>Senior</h3><p>${esc(m.senior)}</p></div></div></article>`).join("")}</section>`);
  }
  function renderCompanies() {
    shell("Company Packs", `<section class="hero"><span class="hero-tag"><span class="pulse"></span>company-specific prep</span><h1>Prep packs by interview style.</h1><p class="lede">Original preparation frames for common company cultures. No copied interview banks or external links.</p></section><section class="section card-grid">${DATA.companyPacks.map((p) => `<article class="card"><h2>${esc(p.title)}</h2><p>${esc(p.focus)}</p><ul>${p.drills.map((d) => `<li>${esc(d)}</li>`).join("")}</ul></article>`).join("")}</section>`);
  }

  function renderStoryBank() {
    shell("Story Bank", `<section class="panel story-page"><h1><span class="grad">STAR-L Story Bank</span></h1><p>Everything stays in this browser. Do not enter secrets, credentials, customer names, or private incident data.</p><div class="form-grid">${["project", "role", "scope", "tradeoff", "stakeholder", "metric", "learning"].map((id) => `<label><span>${id}</span><textarea id="${id}" maxlength="700" autocomplete="off" placeholder="Add sanitized notes for ${id}"></textarea></label>`).join("")}</div><div class="actions"><button class="btn btn-primary" id="draft" type="button">Generate</button><button class="btn btn-ghost" id="saveStory" type="button">Save local</button><button class="btn btn-ghost" id="exportStories" type="button">Export stories</button><button class="btn btn-ghost" id="importStories" type="button">Import stories</button><button class="btn warn" id="clearStories" type="button">Clear</button><input id="storyImportFile" type="file" accept="application/json,.json" hidden></div><pre id="draftOut" aria-live="polite">Fill fields and generate a STAR-L draft.</pre><div id="savedStories"></div></section>`);
    const out = document.getElementById("draftOut");
    const value = (id) => document.getElementById(id).value.trim() || `[${id}]`;
    const draftText = () => `Situation:\nIn ${value("project")}, the context was ${value("scope")}.\n\nTask:\nMy role was ${value("role")}. I needed to balance ${value("tradeoff")} while protecting ${value("metric")}.\n\nAction:\nI made the trade-off explicit, aligned ${value("stakeholder")}, and chose the path that best protected the outcome.\n\nResult:\nThe result was measured through ${value("metric")}.\n\nLearning:\nThe main learning was ${value("learning")}. Next time, I would surface that signal earlier.`;
    const renderSaved = () => {
      const stories = readJson(STORE.story, []);
      document.getElementById("savedStories").innerHTML = `<h2>Saved locally (${stories.length})</h2>${stories.map((s) => `<pre>${esc(s.draft)}</pre>`).join("")}`;
    };
    document.getElementById("draft").addEventListener("click", () => { out.textContent = draftText(); });
    document.getElementById("saveStory").addEventListener("click", () => {
      const stories = readJson(STORE.story, []);
      stories.unshift({ at: new Date().toISOString(), draft: draftText().slice(0, 4000) });
      saveJson(STORE.story, stories.slice(0, 25));
      toast("Story saved locally.");
      renderSaved();
    });
    document.getElementById("exportStories").addEventListener("click", () => downloadJson("techno-managerial-story-bank.json", { stories: readJson(STORE.story, []) }));
    document.getElementById("importStories").addEventListener("click", () => document.getElementById("storyImportFile").click());
    document.getElementById("storyImportFile").addEventListener("change", importStories);
    document.getElementById("clearStories").addEventListener("click", () => { localStorage.removeItem(STORE.story); renderSaved(); toast("Story bank cleared."); });
    renderSaved();
  }

  function importStories(event) {
    const file = event.target.files && event.target.files[0];
    if (!file || file.size > 300000) return toast("Import rejected: file too large.");
    file.text().then((text) => {
      const parsed = JSON.parse(text);
      if (!parsed || !Array.isArray(parsed.stories)) throw new Error("bad shape");
      const stories = parsed.stories.slice(0, 25).map((s) => ({ at: typeof s.at === "string" ? s.at : new Date().toISOString(), draft: String(s.draft || "").slice(0, 4000) })).filter((s) => s.draft.trim());
      saveJson(STORE.story, stories);
      toast("Stories imported.");
      renderStoryBank();
    }).catch(() => toast("Import failed. Expected { stories: [{ draft }] }."));
  }

  function renderInterview() {
    const history = readJson(STORE.interviewHistory, []);
    shell("Interview Simulator", `<section class="hero"><span class="hero-tag"><span class="pulse"></span>simulator</span><h1>Randomized interview simulator.</h1><p class="lede">Balanced prompt sequence, segment timer, notes, scorecard, local history, and weak-area recommendations.</p><div class="hero-cta"><button class="btn btn-primary" id="startSim" type="button">Start full mock</button><button class="btn btn-ghost" id="rapidSim" type="button">Start rapid drill</button></div></section><section class="section"><article class="panel"><h2>Recent sessions</h2>${history.length ? history.slice(0, 8).map((h) => `<p><b>${esc(h.mode)}</b> · ${esc(h.averageScore)}/4 average · ${esc(h.endedAt)} · focus: ${esc(h.focus)}</p>`).join("") : "<p>No local sessions yet.</p>"}</article></section>`);
    document.getElementById("startSim").addEventListener("click", () => startSimulator("full"));
    document.getElementById("rapidSim").addEventListener("click", () => startSimulator("rapid"));
  }
  function startSimulator(mode) {
    const prompts = buildPromptSequence(mode);
    state.sim = { id: String(Date.now()), mode, prompts, idx: 0, remaining: prompts[0].durationSec, notes: {}, scores: {}, running: false };
    saveJson(STORE.interviewDraft, state.sim);
    renderSimPrompt();
  }
  function buildPromptSequence(mode) {
    const pool = shuffle(DATA.simulatorPrompts.slice());
    if (mode === "rapid") return pool.slice(0, 4).map((p) => ({ ...p, durationSec: 180 }));
    const picks = [];
    ["architecture", "data", "delivery", "people", "incident", "lld"].forEach((cat) => {
      const found = pool.find((p) => p.category === cat && !picks.includes(p));
      if (found) picks.push(found);
    });
    return picks.concat(pool.filter((p) => !picks.includes(p)).slice(0, 2)).slice(0, 7);
  }
  function renderSimPrompt() {
    const sim = state.sim || readJson(STORE.interviewDraft, null);
    if (!sim || !sim.prompts || !sim.prompts.length) return renderInterview();
    state.sim = sim;
    const prompt = sim.prompts[sim.idx];
    shell("Interview Simulator", `<section class="panel sim-page"><div class="sim-layout"><div><div class="crumbs">Prompt ${sim.idx + 1} / ${sim.prompts.length} · ${esc(prompt.category)}</div><h1><span class="grad">${esc(prompt.title)}</span></h1><p>${esc(prompt.prompt)}</p><div class="note"><b>Strong signals:</b> ${prompt.signals.map(esc).join(" · ")}</div><p class="timer" id="simTimer" aria-live="polite">${fmt(sim.remaining)}</p><div class="actions"><button class="btn btn-primary" id="simStart" type="button">Start</button><button class="btn btn-ghost" id="simPause" type="button">Pause</button><button class="btn btn-ghost" id="simNext" type="button">Next</button><button class="btn warn" id="simFinish" type="button">Finish</button></div></div><div><h2>Notes</h2><textarea id="simNotes" maxlength="2500" placeholder="Capture your answer outline. Stored locally as draft.">${esc(sim.notes[prompt.id] || "")}</textarea><h2>Scorecard</h2>${renderSimScores(prompt.id)}<h2>Queue</h2><div class="queue">${sim.prompts.map((p, i) => `<div class="queue-item ${i === sim.idx ? "active" : ""}">${i + 1}. ${esc(p.title)}</div>`).join("")}</div></div></div></section>`);
    document.getElementById("simNotes").addEventListener("input", (e) => { sim.notes[prompt.id] = e.target.value.slice(0, 2500); saveJson(STORE.interviewDraft, sim); });
    document.querySelectorAll("[data-score]").forEach((input) => input.addEventListener("input", () => { saveScores(prompt.id); }));
    document.getElementById("simStart").addEventListener("click", () => {
      if (!activeTimer) activeTimer = setInterval(() => {
        if (!document.getElementById("simTimer")) return stopTimer();
        if (sim.remaining > 0) sim.remaining--;
        document.getElementById("simTimer").textContent = fmt(sim.remaining);
        saveJson(STORE.interviewDraft, sim);
      }, 1000);
    });
    document.getElementById("simPause").addEventListener("click", stopTimer);
    document.getElementById("simNext").addEventListener("click", () => { saveScores(prompt.id); sim.idx = Math.min(sim.idx + 1, sim.prompts.length - 1); sim.remaining = sim.prompts[sim.idx].durationSec; saveJson(STORE.interviewDraft, sim); renderSimPrompt(); });
    document.getElementById("simFinish").addEventListener("click", finishSimulator);
  }
  function renderSimScores(promptId) {
    const scores = (state.sim && state.sim.scores[promptId]) || {};
    return `<div class="score-grid">${DATA.rubrics.dimensions.map((d) => `<label class="score-card"><span>${esc(d[1])}</span><input data-score="${esc(d[0])}" type="range" min="0" max="4" value="${Number(scores[d[0]] || 0)}"><small>0-4</small></label>`).join("")}</div>`;
  }
  function saveScores(promptId) {
    const scores = {};
    document.querySelectorAll("[data-score]").forEach((input) => { scores[input.dataset.score] = Number(input.value); });
    state.sim.scores[promptId] = scores;
    saveJson(STORE.interviewDraft, state.sim);
  }
  function finishSimulator() {
    const sim = state.sim;
    if (!sim) return;
    stopTimer();
    const totals = {};
    let count = 0, sum = 0;
    Object.values(sim.scores).forEach((scoreMap) => Object.keys(scoreMap).forEach((k) => { totals[k] = (totals[k] || 0) + scoreMap[k]; sum += scoreMap[k]; count++; }));
    const focusKey = Object.keys(totals).sort((a, b) => totals[a] - totals[b])[0] || "ownership";
    const focus = (DATA.rubrics.dimensions.find((d) => d[0] === focusKey) || ["", "Trade-off clarity"])[1];
    const history = readJson(STORE.interviewHistory, []);
    history.unshift({ id: sim.id, mode: sim.mode, endedAt: new Date().toISOString(), averageScore: count ? (sum / count).toFixed(1) : "0.0", focus, prompts: sim.prompts.map((p) => p.title).slice(0, 5) });
    saveJson(STORE.interviewHistory, history.slice(0, 25));
    localStorage.removeItem(STORE.interviewDraft);
    state.sim = null;
    shell("Simulator Result", `<section class="panel"><h1><span class="grad">Simulator complete</span></h1><p>Average score: <b>${esc(history[0].averageScore)} / 4</b></p><div class="note">Next focus: ${esc(focus)}. Retry one scenario and deliberately improve this dimension.</div><div class="actions"><a class="btn btn-primary" href="#/interview">Run another</a><a class="btn btn-ghost" href="#/rubrics">Review rubrics</a></div></section>`);
  }

  function renderReview() {
    const weak = Object.values(state.weak);
    shell("Review", `<section class="panel"><h1><span class="grad">Study List</span></h1>${weak.length ? weak.map((w) => `<div class="note"><b>${esc(w.prompt)}</b><br>${esc(w.explain)}</div>`).join("") : "<p>No weak spots yet. Take the quiz to build a local study list.</p>"}</section>`);
  }

  function route() {
    const hash = location.hash || "#/";
    if (hash === "#/" || hash === "") return renderHome();
    if (hash === "#/practice" || hash === "#/scenarios") return renderPractice();
    if (hash === "#/rubrics") return renderRubrics();
    if (hash === "#/quiz" || hash === "#/exam") return renderQuizStart();
    if (hash === "#/flashcards") return renderFlashcards();
    if (hash === "#/models") return renderModels();
    if (hash === "#/companies") return renderCompanies();
    if (hash === "#/story-bank") return renderStoryBank();
    if (hash === "#/interview" || hash === "#/mock") return renderInterview();
    if (hash === "#/review") return renderReview();
    const parts = hash.replace(/^#\//, "").split("/");
    if (parts.length === 3) return renderLesson(parts[0], parts[1], parts[2]);
    return renderHome();
  }

  function initSearch() {
    const input = document.getElementById("search");
    const box = document.getElementById("searchResults");
    const entries = allLessons().map((l) => ({ title: l.title, crumb: `${l.track.name} / ${l.module.name}`, route: lessonRoute(l.track.id, l.module.id, l.id) }))
      .concat(DATA.scenarios.map((s) => ({ title: s.title, crumb: `Scenario / ${s.category}`, route: "#/practice" })))
      .concat([{ title: "Rubrics", crumb: "Feature", route: "#/rubrics" }, { title: "Interview simulator", crumb: "Feature", route: "#/interview" }, { title: "Story bank", crumb: "Feature", route: "#/story-bank" }]);
    input.addEventListener("input", () => {
      const term = input.value.trim().toLowerCase();
      if (!term) { box.hidden = true; box.innerHTML = ""; return; }
      const hits = entries.filter((e) => (e.title + " " + e.crumb).toLowerCase().includes(term)).slice(0, 10);
      box.innerHTML = hits.length ? hits.map((h) => `<a class="sr-item" role="option" href="${esc(h.route)}"><div class="sr-title">${esc(h.title)}</div><div class="sr-crumb">${esc(h.crumb)}</div></a>`).join("") : `<div class="sr-empty">No matches</div>`;
      box.hidden = false;
    });
    input.addEventListener("keydown", (e) => { if (e.key === "Escape") { input.value = ""; box.hidden = true; } });
    window.addEventListener("hashchange", () => { input.value = ""; box.hidden = true; });
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); input.focus(); }
    });
  }

  function initChrome() {
    const theme = localStorage.getItem(STORE.theme) || "dark";
    setTheme(theme);
    document.getElementById("themeToggle").addEventListener("click", () => setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"));
    const sidebar = document.getElementById("sidebar");
    const scrim = document.getElementById("scrim");
    const navToggle = document.getElementById("navToggle");
    function closeNav() { sidebar.classList.remove("open"); scrim.hidden = true; navToggle.setAttribute("aria-expanded", "false"); }
    navToggle.addEventListener("click", () => { const open = !sidebar.classList.contains("open"); sidebar.classList.toggle("open", open); scrim.hidden = !open; navToggle.setAttribute("aria-expanded", String(open)); });
    scrim.addEventListener("click", closeNav);
    document.getElementById("featureToggle").addEventListener("click", () => toggleFeature(true));
    document.getElementById("featurePaneClose").addEventListener("click", () => toggleFeature(false));
    document.getElementById("exportData").addEventListener("click", exportBackup);
    document.getElementById("importData").addEventListener("click", () => document.getElementById("importFile").click());
    document.getElementById("importFile").addEventListener("change", importBackup);
    document.getElementById("resetProgress").addEventListener("click", () => { state.progress = new Set(); saveSet(STORE.progress, state.progress); buildNav(); updateProgress(); toast("Progress reset."); route(); });
    document.getElementById("cmdkBtn").addEventListener("click", openPalette);
    document.addEventListener("keydown", (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); } });
    window.addEventListener("hashchange", closeNav);
  }
  function toggleFeature(show) {
    const pane = document.getElementById("featurePane");
    const btn = document.getElementById("featureToggle");
    pane.hidden = !show;
    btn.setAttribute("aria-expanded", String(show));
  }
  function openPalette() {
    const items = [
      ["Home", "#/"], ["Practice", "#/practice"], ["Rubrics", "#/rubrics"], ["Simulator", "#/interview"], ["Quiz", "#/quiz"], ["Flashcards", "#/flashcards"], ["Models", "#/models"], ["Story Bank", "#/story-bank"], ["Study List", "#/review"]
    ].concat(allLessons().slice(0, 18).map((l) => [l.title, lessonRoute(l.track.id, l.module.id, l.id)]));
    const div = document.createElement("div");
    div.className = "palette";
    div.innerHTML = `<div class="palette-box"><div class="feature-pane-head"><span>Command Palette</span><button class="feature-pane-close" type="button" aria-label="Close">×</button></div><div class="palette-list">${items.map((i) => `<a href="${esc(i[1])}"><span>${esc(i[0])}</span><small>${esc(i[1])}</small></a>`).join("")}</div></div>`;
    document.body.appendChild(div);
    div.querySelector("button").addEventListener("click", () => div.remove());
    div.addEventListener("click", (e) => { if (e.target === div) div.remove(); });
    div.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => div.remove()));
  }

  function exportBackup() {
    downloadJson("techno-managerial-atlas-backup.json", {
      progress: [...state.progress],
      weak: state.weak,
      flash: state.flash,
      stories: readJson(STORE.story, []),
      interviewHistory: readJson(STORE.interviewHistory, []),
      theme: localStorage.getItem(STORE.theme) || null
    });
  }
  function importBackup(e) {
    const file = e.target.files && e.target.files[0];
    if (!file || file.size > 500000) return toast("Import rejected.");
    file.text().then((text) => {
      const data = JSON.parse(text);
      if (Array.isArray(data.progress)) { state.progress = new Set(data.progress.map(String)); saveSet(STORE.progress, state.progress); }
      if (data.weak && typeof data.weak === "object") { state.weak = data.weak; saveJson(STORE.weak, state.weak); }
      if (data.flash && typeof data.flash === "object") { state.flash = data.flash; saveJson(STORE.flash, state.flash); }
      if (Array.isArray(data.stories)) saveJson(STORE.story, data.stories.slice(0, 25));
      if (Array.isArray(data.interviewHistory)) saveJson(STORE.interviewHistory, data.interviewHistory.slice(0, 25));
      if (typeof data.theme === "string" && (data.theme === "dark" || data.theme === "light")) setTheme(data.theme);
      buildNav();
      updateProgress();
      toast("Backup imported.");
      route();
    }).catch(() => toast("Import failed."));
  }
  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function fmt(seconds) {
    const s = Math.max(0, seconds | 0);
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  buildNav();
  initChrome();
  initSearch();
  window.addEventListener("hashchange", route);
  route();
})();
