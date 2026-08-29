# Atlas content engine — authoring contract

Every Atlas app is a dependency-free static SPA. Content is plain JavaScript data
registered on `window`, rendered by that app's `js/app.js`. This document is the
authoring contract: follow it exactly and your file drops in with no wiring changes.

---

## 1. Hard rules (a build that breaks these is rejected)

1. **Zero external requests.** No `http://` or `https://` URL anywhere except the
   SVG namespace `http://www.w3.org/2000/svg` and demo hostnames on the reserved
   `.example` TLD. `tools/lint_static.mjs` fails the build otherwise.
2. **100% original prose.** Topics may mirror any public curriculum; sentences may
   not. Write every explanation from scratch in your own words. Never paste
   passages, taglines, or question text from another site.
3. **No dependencies, no build step.** ES5-safe vanilla JS (`var`/`function` or
   plain `const`/arrow — both are fine, but no modules, no imports, no JSX).
4. **Files are additive.** Create only the new files you are assigned. Do **not**
   edit `js/app.js`, `js/exam.js`, `index.html`, `sw.js`, or anything in `tools/`
   — the integrator wires those centrally. Editing them causes merge conflicts.
5. **Every id must be unique and URL-safe**: `[a-z0-9-]+`.
6. **Answers must be correct.** Verify every quiz `answer` index against its
   `options` array before you finish. Off-by-one answers are the #1 defect.
7. **No `console.*` calls.** Not even during debugging. The smoke test asserts a
   clean console and any log becomes a build failure.
8. **Never name the source site** — not in prose, not in comments, not anywhere.
9. **Names and headings must be ours too.** Rule 2 covers sentences; this covers
   labels. A coined framework name, mnemonic, tier ladder, or recurring section
   heading taken from a commercial course is borrowed vocabulary even when every
   sentence under it is original, and it spreads: a heading copied into a brief
   becomes a heading in twenty lessons, a module name, and a route slug. Use the
   table below, which is the canonical list. When you need a device that is not
   in it, name it yourself in plain language and add a row.

| Concept | Our wording |
| --- | --- |
| level rubric heading | **How this scores at each level** |
| pattern-recognition cue | **Spotting it in a prompt** |
| graded ladder | **Naive / Solid / Standout** |
| four-beat answer structure | **SALT** (Setup, Actions, Landing, Takeaway) |
| three-step opening loop | **Name it, pick it, land it** |
| story pre-indexing | **the story shortlist** |
| first-person-plural narration problem | **the missing "I"** |
| AI-coding thesis | **Judgment is the deliverable** |
| types-as-tests | **Types are the cheapest tests you will ever write** |
| named phase framework | **the phase plan** |
| entity heading | **Entity model and API** |
| case-study module | **Production Case Studies** |

---

## 1b. One self-contained file per unit

Each file you are assigned owns a **track or a set of modules**, and registers
everything that content needs — track data, its quizzes, and its widgets — in
that single file. This is what lets many authors work at once without conflicts.

The skeleton, which you should copy verbatim and fill in:

```js
/* track-<unit>.js — <what this covers> */
(function () {
  "use strict";

  /* ---------- widgets owned by this file ---------- */
  var Widgets = {};
  function h(tag, attrs) { /* … see section 5 … */ }
  Widgets.myLab = function (mount) { /* … */ };
  window.Widgets = Object.assign(window.Widgets || {}, Widgets);

  /* ---------- quizzes owned by this file ---------- */
  window.QUIZZES = Object.assign(window.QUIZZES || {}, {
    "mytrack-mymodule": { title: "…", sub: "…", questions: [ /* … */ ] }
  });

  /* ---------- track / module registration ---------- */
  window.TRACKS = window.TRACKS || {};
  window.TRACKS.mytrack = { id: "mytrack", /* … */ modules: [ /* … */ ] };
})();
```

**If your file adds modules to a track another file already registered**, do not
redefine the track. Push onto it instead, and tolerate either load order:

```js
window.TRACKS = window.TRACKS || {};
var t = window.TRACKS.lld;
if (t && t.modules) t.modules.push.apply(t.modules, MY_MODULES);
```

`Object.assign` is mandatory for `window.QUIZZES` and `window.Widgets`. Plain
assignment (`window.QUIZZES = { … }`) silently deletes every sibling file's
entries and is the single worst bug this repo has shipped.

---

## 2. Track / lesson data shape

Register a track under a namespaced key on `window.TRACKS`:

```js
window.TRACKS = window.TRACKS || {};
window.TRACKS.sdi = {
  id: "sdi",                    // must match the object key
  name: "System Design Interview",
  short: "SDI",                 // 3-5 chars, shown in the sidebar
  tagline: "Ship a design in 35 minutes",
  color: "#f5a623",             // hex
  blurb: "One paragraph shown on the track card.",
  modules: [
    {
      id: "framework",
      name: "Phase Plan",
      icon: "compass",          // see icon list below
      lessons: [
        {
          id: "requirements",
          title: "Nailing requirements in five minutes",
          summary: "One sentence, shown under the H1 and in search results.",
          minutes: 7,           // integer read-time estimate
          tags: ["framework", "requirements"],
          blocks: [ /* see block grammar */ ]
        }
      ]
    }
  ]
};
```

Route for a lesson is `#/<track.id>/<module.id>/<lesson.id>`.

Valid `icon` values (anything else silently falls back):
`compass, trend, bolt, database, share, queue, plug, globe, shield, blocks, map,
cube, diamond, broom, grid, wrench`

### Sizing guidance

- 8–14 lessons per module, 3–6 modules per track.
- 6–12 minutes per lesson, which is roughly 10–22 blocks.
- Every lesson needs at least one `note` block and one non-prose block
  (`table`, `compare`, `stat`, `code`, or `ul`). Pure walls of `p` are rejected.
- Every lesson **ends** with a `{ t: "note", variant: "key", … }` block that
  compresses the lesson into the one thing worth remembering under pressure.

### House voice

Direct second person, and every lesson moves in the same four beats:

1. **Mental model** — the picture the reader should hold.
2. **Mechanism** — how it actually works, concretely, with numbers or code.
3. **Explicit trade-off** — what it costs. Never present a choice as free.
4. **Interview cue** — the sentence that earns credit out loud.

Write for someone competent who is short on time. No filler, no "in today's
fast-paced world", no hedging where you know the answer, no false confidence
where you don't.

### Three devices to reuse

These carry most of the teaching value and cost almost nothing to write:

1. **Graded tiers — Naive / Solid / Standout.** For any consequential choice
   (objective, model, storage, index), show the ladder rather than one answer.
   Use a `table` with a `Tier` column, or three `compare` blocks. Example shape
   for a moderation objective: *Naive* "remove the most harmful posts" (unbounded
   false positives) → *Naive* "maximize accuracy" (class imbalance makes it
   meaningless) → *Solid* "maximize removal subject to a precision floor" →
   *Standout* "minimize views of harmful content subject to that same floor"
   (optimizes exposure, which is the thing that actually causes harm).
2. **"How this scores at each level."** Close every problem breakdown with a
   `table` whose rows are Mid / Senior / Staff and whose cells say what each bar
   actually requires. This is what turns a walkthrough into calibration.
3. **"Spotting it in a prompt."** Close every pattern and coding-pattern lesson
   with a `cue` block listing the recognition triggers — the phrases in a problem
   statement that should make this pattern the first thing you reach for.

---

## 3. Block grammar

`lesson.blocks` is an ordered array. Each block is `{ t: "<type>", ... }`.
Inline HTML is allowed in `html` fields and list `items`; use
`<strong>`, `<em>`, and `<code class='tok'>…</code>`. All other fields are
plain text and get HTML-escaped by the renderer.

| `t` | Fields | Renders as |
| --- | --- | --- |
| `p` | `html` | paragraph |
| `h` | `text` | section heading (gets an anchor id) |
| `h2` | `text` | sub-heading |
| `ul` | `items: string[]` | bulleted list (items may contain inline HTML) |
| `ol` | `items: string[]` | numbered list |
| `code` | `lang`, `code` | code card with copy button + highlighting |
| `note` | `variant`, `html` | callout; `variant` ∈ `tip` \| `key` \| `warn` \| `trap` |
| `table` | `headers: string[]`, `rows: string[][]` | data table (cells allow inline HTML) |
| `compare` | `bad: {title, items[]}`, `good: {title, items[]}` | two-column contrast |
| `stat` | `items: [{v, k}]` | metric row — `v` is the big number, `k` the label |
| `cue` | `html` | "spotting it" callout |
| `widget` | `id` | mounts `window.Widgets[id]` |
| `quiz` | `id` | mounts `window.QUIZZES[id]` |

`code.lang` affects highlighting only. Supported: `python`, `javascript`, `java`,
`sql`, `text`, `bash`. Use `text` for pseudo-code, capacity math, and diagrams.

### Examples

```js
{ t: "note", variant: "key", html: "<strong>State the invariant early.</strong> One confirmed booking per seat, per event — everything else is negotiable." },

{ t: "table",
  headers: ["Choice", "Buys you", "Costs you"],
  rows: [
    ["Single-leader SQL", "Strong reads, easy transactions", "Write ceiling, failover gap"],
    ["Leaderless NoSQL", "Write throughput, no failover", "Conflict handling on you"]
  ]
},

{ t: "compare",
  bad:  { title: "Fan-out on read", items: ["Cheap writes", "Slow feeds for big follow graphs"] },
  good: { title: "Fan-out on write", items: ["Fast feeds", "Write amplification on celebrities"] }
},

{ t: "stat", items: [
  { v: "35 min", k: "typical interview" },
  { v: "~5 min", k: "requirements" }
] },

{ t: "code", lang: "text", code:
  "DAU            = 50,000,000\n" +
  "posts/user/day = 0.2\n" +
  "writes/sec     = 50e6 * 0.2 / 86400  ~= 116/s"
}
```

---

## 4. Quiz data shape

`window.QUIZZES` is a flat object shared by every quiz file in the app. Because
several files contribute to it, **always merge, never reassign** — use exactly
the same `Object.assign` pattern the existing files use:

```js
/* my new quiz file — merged into window.QUIZZES */
window.QUIZZES = Object.assign(window.QUIZZES || {}, {
  "sdi-framework": { title: "...", sub: "...", questions: [ /* ... */ ] },
  "sdi-core":      { title: "...", sub: "...", questions: [ /* ... */ ] }
});
```

A single entry looks like this:

```js
  "sdi-framework": {
  title: "Phase plan checkpoint",
  sub: "Scoping, budgeting time, and sequencing the whiteboard.",
  questions: [
    {
      q: "You have 35 minutes. Roughly how long should requirements take?",
      options: ["30 seconds", "About 5 minutes", "About 15 minutes", "Skip it"],
      answer: 1,                 // ZERO-BASED index into options
      explain: "Five minutes is enough to pin functional scope, one or two "
             + "non-functional targets, and the scale you will design against. "
             + "Less and you design the wrong system; more and you run out of "
             + "time for the deep dive that actually differentiates you."
    }
  ]
  }
```

Rules:

- **Quiz id must start with `<trackId>-`** — the app and exam module filter by
  that prefix. `sdi-framework`, `bd-uber`, `mlsd-recsys`, etc.
- 4 options per question (5 max), exactly one correct.
- 4–10 questions per quiz; one quiz per module minimum.
- `explain` is 2–4 sentences and teaches the *reasoning*, not just the fact.
  It must make sense to someone who got the question wrong.
- Distractors must be plausible. No joke options, no "all of the above".

---

## 5. Widget data shape

A widget is a function that receives an empty mount element and fills it.

Widget files also share one namespace, so they close with the same merge:
`window.Widgets = Object.assign(window.Widgets || {}, Widgets);`

```js
(function () {
  "use strict";
  var Widgets = {};

  // helper: same DOM builder style the other widget files use
  function h(tag, attrs, ...kids) {
    var el = document.createElement(tag);
    for (var k in attrs) {
      if (k === "class") el.className = attrs[k];
      else if (k === "html") el.innerHTML = attrs[k];
      else if (k.indexOf("on") === 0 && typeof attrs[k] === "function") el.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) el.setAttribute(k, attrs[k]);
    }
    kids.forEach(function (kid) {
      if (kid == null) return;
      el.appendChild(typeof kid === "string" ? document.createTextNode(kid) : kid);
    });
    return el;
  }

  Widgets.fanoutLab = function (mount) {
    mount.classList.add("widget");
    mount.appendChild(h("div", { class: "widget-head" },
      h("span", { class: "w-pill" }, "simulator"),
      h("h3", {}, "Fan-out cost lab")));
    mount.appendChild(h("p", { class: "widget-desc" }, "Drag the follower count and watch write amplification."));

    var stage = h("div", { class: "w-stage" });
    // ... build controls with .w-btn / .w-seg / .w-seg-btn / .w-field
    // ... build numeric output with .w-readout
    mount.appendChild(stage);
  };

  window.Widgets = Object.assign(window.Widgets || {}, Widgets);
})();
```

In **Cascade** (`data-eng-academy`) the helpers already exist globally — use
`var WK = window.WK;` then `WK.h`, `WK.svgEl`, `WK.shell`, `WK.hashStr` instead
of redefining them.

Available CSS classes (already styled in every app's `css/styles.css` — do not
add new CSS files): `.widget`, `.widget-head`, `.w-pill`, `.widget-desc`,
`.w-stage`, `.w-btn` (add `.primary` or `.ghost`), `.w-seg` + `.w-seg-btn`
(add `.active`), `.w-field`, `.w-readout` with `.ro` children.

Widget rules:

- Must render synchronously and never throw. Wrap risky math in guards; the app
  catches throws but shows an error card.
- No `setInterval` that runs forever — the SPA swaps `#main` on navigation and
  the timer would leak. Use `setTimeout` for one-shot animations.
- Deterministic where possible so quizzes can reference exact outputs.
- Build SVG with `document.createElementNS("http://www.w3.org/2000/svg", tag)`.

---

## 6. Self-check before you finish

Run these from the repo root and paste the output in your final message. Never
modify anything in `tools/` — run the tools, don't edit them. If you believe a
tool is genuinely wrong, say so in your report instead of patching it.

```bash
# 1. syntax-check every file you wrote
node --check <your-file.js>

# 2. contract test — validates ids, block grammar, quiz answers, widget refs
node tools/validate_content.mjs

# 3. no external URLs / broken precache
node tools/lint_static.mjs
```

### The review pass the validator cannot do for you

The tools check structure. They cannot check truth. Walk this list deliberately
before you report done — most of these fail *silently* in the browser:

- **Quiz answers.** Re-read every question and count the `options` array by hand
  to confirm the `answer` index names the option you actually meant. The
  validator only range-checks the bounds; a confidently wrong answer ships.
- **Widget resolution and behaviour.** Every `{t:"widget", id}` must name a
  function you registered, and that function must render visible content *and*
  update its `.w-readout` when its controls are used. A widget that mounts an
  empty div passes every automated check and teaches nothing.
- **Quiz resolution.** Every `{t:"quiz", id}` must name a key you registered,
  with the correct `<trackId>-` prefix for the app you are writing for.
- **Cross-links.** Every `#/track/module/lesson` route you write anywhere — in
  prose, in `practice-content.js` `route`/`related`/`links` fields — must name a
  lesson that exists. Dangling routes render as nothing; nobody notices.
- **Technical accuracy.** Sanity-check asserted latencies, capacity arithmetic,
  complexities, and API or config details. Where you are not certain, soften the
  claim ("typically single-digit milliseconds") rather than inventing a precise
  number that a reader will quote in an interview and get corrected on.
- **Consistency.** House voice throughout, terminal `variant:"key"` note on every
  lesson, `icon` values from the valid list only, no `console.*`, no external
  URLs, source site unnamed.

Report in your final message:

- files created, with line counts
- lesson count, quiz count, question count, widget count
- the exact `window.TRACKS.<id>` key and every module id you used
- every `window.QUIZZES[...]` key you registered
- every `window.Widgets.<name>` you registered
- confirmation that all three commands above pass

---

## 7. Verifying

Five gates cover the repo. `tools/verify_all.sh` runs all of them in order,
starts the static server and headless Chrome only if they are not already
listening, tears down only what it started, and prints one verdict.

Exit codes are deliberately distinct, because "the content is broken" and "the
harness is broken" call for opposite responses:

| Exit | Meaning |
| --- | --- |
| 0 | every gate green |
| N | N gates found content failures |
| 98 | a harness fault — no verdict was reached, nothing was proven either way |

A harness fault is a dead static server, a Chrome that was killed or wedged, or
a page that stopped answering the protocol. The browser gates exit `3` in that
case and print `HARNESS FAULT — not a content failure`; the runner turns that
into `98` and refuses to call the run a pass or a fail. Two rules keep those
faults rare: each browser gate gets a freshly launched Chrome on a throwaway
profile, and Chrome's viewport comes from `--window-size` on the command line —
never from `Emulation.setDeviceMetricsOverride`, which has pinned the browser
process at 100% CPU past the end of a run and hung every later attach.

```bash
tools/verify_all.sh                      # everything
tools/verify_all.sh --app=cyber-academy  # scope the link + crawl gates
tools/verify_all.sh --sample=8           # quick crawl: 8 lessons per app
```

| Gate | Command | Covers |
| --- | --- | --- |
| 1. content contract | `node tools/validate_content.mjs` | track/module/lesson ids unique and URL-safe, block grammar and required fields, quiz `answer` in range, every `{t:"quiz"\|"widget"}` id resolves, widgets mount without throwing, `app.js`/`exam.js`/`index.html` wiring |
| 2. static guardrails | `node tools/lint_static.mjs` | every `sw.js` CORE entry exists, every `index.html` asset exists and is precached, cache names unique, manifest is valid JSON, no external URLs |
| 3. link integrity | `node tools/check_links.mjs` | every `href` and every route literal resolves to a real lesson, track or feature route (with file and line); hub `APPS` targets and progress keys; `localStorage` prefix uniqueness across academies; hub backlink |
| 4. end-to-end crawl | `node tools/crawl_e2e.mjs` | every route in a real browser: content rendered, zero console output, zero failed requests, no empty `.widget-mount`/`.quiz-mount`, no leaked `undefined`/`NaN`/`[object Object]`, no silent fall-through to home; then every quiz played to its result card, one control driven on every widget, exam started and answered, a flashcard flipped |
| 5. UI sweep | `node tools/crawl_ui.mjs` | light theme and the keyboard, on a sample of routes per app. Measures computed foreground/background contrast for every text node in `.widget-mount` and `.note` in **both** themes: under 1.5:1 in either theme is invisible, under 2.2:1 in light while 3:1 or better in dark is a light-theme regression, otherwise dim is a warning. Then dispatches real `KeyboardEvent`s for Cmd/Ctrl-K, `/`, `?`, `A`–`E` and left/right, and asserts the state change each one advertises, plus focus trapping in the palette and the shortcuts modal and focus restored on Escape |

Gate 5 measures both themes on purpose: a label that is equally dim in dark and
light is an authoring choice, while one that is fine in dark and gone in light is
a theming bug. It also freezes CSS transitions before measuring — reading a
colour mid-transition invents failures that are not there. Contrast failures
print grouped by colour pair, since one unthemed token repeats across every node
that inherits it.

Gates 1–3 are static and need nothing running. Gates 4 and 5 need the harness:

```bash
python3 -m http.server 8780 --directory .
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --disable-gpu --no-first-run --no-default-browser-check \
  --remote-debugging-port=9240 --user-data-dir=/tmp/atlas-chrome-smoke about:blank
node tools/crawl_e2e.mjs
```

The crawler discovers routes by reading `window.TRACKS` out of the live page and
the feature-route list out of each app's own router, so new content is covered
with no change to the tooling. It writes `tools/e2e-report.json` alongside its
console output. Useful flags: `--app=<dir>`, `--sample=N`, `--no-interact`,
`--quiet`.

An academy whose shell exists but whose content has not landed yet is skipped
with a notice rather than failing; if the shell mounts a track that no content
file registers, findings on that track and on the cross-track views are recorded
as warnings until the content arrives.

Each of the newer gates carries a negative test, because a gate that has quietly
stopped detecting is worse than no gate. `verify_all.sh` runs them as a
pre-flight and refuses to report a verdict if any of them fails:

```bash
node tools/check_links.mjs --selftest   # can it still see a dangling route?
node tools/crawl_e2e.mjs   --selfcheck  # can it still see an empty mount,
                                        # a leaked value, a fall-through?
node tools/crawl_ui.mjs    --selftest   # plants unreadable text (grey on white,
                                        # SVG on a fill, cut-out text on its own
                                        # fill, one killed by ancestor opacity,
                                        # one mid-transition) and one readable
                                        # control that must NOT be flagged; then
                                        # swallows every keydown at the capture
                                        # phase and requires every shortcut that
                                        # just passed to be reported broken
```

### Auditing a bulk content rewrite

`tools/audit_quiz_answers.mjs` compares two revisions of the quiz data and says
what actually changed, matching questions by prompt text rather than position:

```bash
node tools/audit_quiz_answers.mjs --commit=<sha>   # that commit against its parent
node tools/audit_quiz_answers.mjs --from=HEAD~3 --to=HEAD
node tools/audit_quiz_answers.mjs --selftest       # synthetic pairs, one of each kind
```

It separates a moved index (`answer` points at the same text in a new position)
from a reordered option list, from a changed option set, from a genuinely
different correct answer. Only the last is a semantic change, and it is what to
look for after any bulk edit of `answer` fields.
