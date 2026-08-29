#!/usr/bin/env node
/**
 * audit_quiz_answers.mjs — prove a quiz answer-index rewrite changed no meaning.
 *
 * Moving `answer` indices around to fix a lopsided answer distribution is a
 * mechanical edit, and mechanical edits are exactly where a wrong answer can
 * hide: nothing in the content contract can tell "option 2 is now the correct
 * one" apart from "the correct answer is now the wrong option". The validator
 * only checks that `answer` is in range, and the crawler only checks that the
 * quiz UI marks *something* right. Both stay green if a question's meaning
 * silently changed.
 *
 * This reads the questions out of two git revisions, keys each one by its own
 * text, and compares what the app would render as the correct answer:
 *
 *     ok        the correct-answer TEXT is identical; only its position moved
 *     SEMANTIC  the correct-answer text differs — the answer itself changed
 *     OPTIONS   the option set changed (added, removed or reworded)
 *
 * Usage:
 *   node tools/audit_quiz_answers.mjs --commit=<rev>      # <rev>^ vs <rev>
 *   node tools/audit_quiz_answers.mjs --from=<a> --to=<b>
 *   node tools/audit_quiz_answers.mjs --from=HEAD~1       # ...--to defaults to HEAD
 *   node tools/audit_quiz_answers.mjs --app=cyber-academy
 *
 * Exit 0 when every shared question kept its correct answer, 1 otherwise.
 */

import { execFileSync } from "node:child_process";
import vm from "node:vm";
import { ROOT, discoverApps, makeSandbox } from "./lib/atlas-shared.mjs";

const flag = (name, dflt = null) => {
  const hit = process.argv.slice(2).find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return dflt;
  return hit.includes("=") ? hit.split("=").slice(1).join("=") : true;
};

const git = (...args) =>
  execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

const commit = flag("commit");
const FROM = commit ? `${commit}^` : (flag("from") || "HEAD~1");
const TO = commit ? String(commit) : (flag("to") || "HEAD");
const ONLY = flag("app");

const rev = (r) => git("rev-parse", "--short", r).trim();

/* data files only: app.js and friends touch a live DOM on load */
const DATA_FILE_RE = /^(curriculum-|track-|quizzes|widgets|widget-kit|practice-content|content|flashcards)/;

/** every js/ data file an app had at a revision, in browser-ish load order */
function filesAt(revision, dir) {
  let out;
  try { out = git("ls-tree", "-r", "--name-only", revision, "--", `${dir}/js/`); }
  catch { return []; }
  return out.split("\n")
    .filter((p) => p.endsWith(".js"))
    .filter((p) => DATA_FILE_RE.test(p.split("/").pop()))
    .sort((a, b) => {
      const fa = a.split("/").pop(), fb = b.split("/").pop();
      if (fa.startsWith("widget-kit")) return -1;
      if (fb.startsWith("widget-kit")) return 1;
      return fa.localeCompare(fb);
    });
}

/**
 * Run an app's content as it stood at a revision and hand back its quizzes.
 * Reading the files through the engine rather than parsing the diff is the
 * point: it sees what the app would actually render, including any quiz built
 * or edited by code rather than written as a literal.
 */
function quizzesAt(revision, dir) {
  const sandbox = makeSandbox();
  const context = vm.createContext(sandbox);
  const problems = [];
  for (const path of filesAt(revision, dir)) {
    let src;
    try { src = git("show", `${revision}:${path}`); } catch { continue; }
    try { new vm.Script(src, { filename: path }).runInContext(context, { timeout: 15000 }); }
    catch (e) { problems.push(`${path}: ${e.message}`); }
  }
  const q = sandbox.QUIZZES || (sandbox.window && sandbox.window.QUIZZES) || {};
  return { quizzes: q, problems };
}

/* Whitespace is the only difference allowed to be invisible here. Anything else
 * — punctuation, capitalisation, a reworded clause — is a real change and must
 * show up, because a reworded correct answer is exactly what we are hunting. */
const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

function index(quizzes) {
  const out = new Map();
  const dupes = [];
  for (const qid of Object.keys(quizzes)) {
    const qz = quizzes[qid];
    if (!qz || !Array.isArray(qz.questions)) continue;
    qz.questions.forEach((q, i) => {
      if (!q || !Array.isArray(q.options)) return;
      /* keyed by question text, not by position: the whole point is to follow a
       * question that may have moved within its quiz */
      const key = `${qid} :: ${norm(q.q)}`;
      if (out.has(key)) { dupes.push(key); return; }
      out.set(key, {
        qid, at: i, answer: q.answer,
        correct: norm(q.options[q.answer]),
        options: q.options.map(norm),
      });
    });
  }
  return { byKey: out, dupes };
}

/** compare two indexed revisions of one app's questions */
function compare(beforeIdx, afterIdx) {
  const res = { shared: 0, indexMoved: 0, orderChanged: 0, semantic: 0, options: 0, added: 0, removed: 0, findings: [] };
  for (const [key, x] of afterIdx.byKey) {
    const y = beforeIdx.byKey.get(key);
    if (!y) { res.added++; continue; }
    res.shared++;
    const sameOrder = x.options.length === y.options.length && x.options.every((o, i) => o === y.options[i]);
    const sameSet = [...x.options].sort().join("\u0000") === [...y.options].sort().join("\u0000");
    if (!sameSet) {
      res.options++;
      res.findings.push({ key, kind: "OPTIONS", detail:
        `option set changed\n        before: ${JSON.stringify(y.options)}\n        after:  ${JSON.stringify(x.options)}` });
    }
    if (x.correct !== y.correct) {
      res.semantic++;
      res.findings.push({ key, kind: "SEMANTIC", detail:
        `correct answer text changed\n        before: index ${y.answer} = ${JSON.stringify(y.correct)}\n        after:  index ${x.answer} = ${JSON.stringify(x.correct)}` });
      continue;
    }
    if (x.answer !== y.answer) res.indexMoved++;
    if (!sameOrder && sameSet) res.orderChanged++;
  }
  for (const key of beforeIdx.byKey.keys()) if (!afterIdx.byKey.has(key)) res.removed++;
  return res;
}

/*
 * Negative self-test. An audit that cannot fail is not evidence, and this one
 * exists purely to be believed, so it has to demonstrate it can call a
 * rewritten answer a rewritten answer.
 */
if (flag("selftest", false)) {
  const mk = (questions) => index({ demo: { questions } });
  const base = [{ q: "Which one?", options: ["alpha", "beta", "gamma"], answer: 1 }];

  const cases = [
    { what: "a pure permutation is not a semantic change",
      after: [{ q: "Which one?", options: ["beta", "alpha", "gamma"], answer: 0 }],
      expect: (r) => r.semantic === 0 && r.orderChanged === 1 && r.indexMoved === 1 },
    { what: "an index moved without moving the option is caught as semantic",
      after: [{ q: "Which one?", options: ["alpha", "beta", "gamma"], answer: 2 }],
      expect: (r) => r.semantic === 1 },
    { what: "a reworded correct answer is caught as semantic",
      after: [{ q: "Which one?", options: ["alpha", "beta but different", "gamma"], answer: 1 }],
      expect: (r) => r.semantic === 1 && r.options === 1 },
    { what: "a dropped distractor is caught as an option-set change",
      after: [{ q: "Which one?", options: ["alpha", "beta"], answer: 1 }],
      expect: (r) => r.options === 1 && r.semantic === 0 },
    { what: "an untouched question is reported as untouched",
      after: base,
      expect: (r) => r.semantic === 0 && r.indexMoved === 0 && r.orderChanged === 0 && r.shared === 1 },
  ];

  let bad = 0;
  for (const c of cases) {
    const r = compare(mk(base), mk(c.after));
    const good = c.expect(r);
    if (!good) bad++;
    console.log(`${good ? "ok  " : "FAIL"} [selftest] ${c.what}` +
      (good ? "" : `  (semantic=${r.semantic} indexMoved=${r.indexMoved} orderChanged=${r.orderChanged} options=${r.options})`));
  }
  console.log(`\n${bad ? "FAILED" : "PASSED"}: audit self-test ${bad ? bad + " case(s) wrong" : "all cases hold"}.`);
  process.exit(bad ? 1 : 0);
}

console.log(`quiz answer audit — ${rev(FROM)} (${FROM}) → ${rev(TO)} (${TO})\n`);

const apps = discoverApps().filter((a) => !ONLY || a.dir === ONLY || a.name.toLowerCase() === String(ONLY).toLowerCase());
const totals = { shared: 0, indexMoved: 0, orderChanged: 0, semantic: 0, options: 0, added: 0, removed: 0 };
const bad = [];

for (const app of apps) {
  const before = quizzesAt(FROM, app.dir);
  const after = quizzesAt(TO, app.dir);
  for (const p of [...before.problems, ...after.problems]) console.log(`warn [${app.name}] ${p}`);

  const b = index(before.quizzes), a = index(after.quizzes);
  if (!b.byKey.size && !a.byKey.size) continue;
  for (const d of [...new Set([...b.dupes, ...a.dupes])]) {
    console.log(`warn [${app.name}] two questions share the same text, only the first is audited: ${d}`);
  }

  const r = compare(b, a);
  for (const k of Object.keys(totals)) totals[k] += r[k];
  for (const f of r.findings) bad.push({ app: app.name, ...f });

  console.log(`${r.semantic ? "FAIL" : "ok  "} [${app.name}] ${r.shared} shared question(s), ` +
    `${r.indexMoved} answer index(es) changed, ${r.orderChanged} option list(s) reordered, ` +
    `${r.semantic} semantic change(s)${r.options ? `, ${r.options} option-set change(s)` : ""}`);
}

if (bad.length) {
  console.log("");
  for (const f of bad.slice(0, 40)) console.log(`  ${f.kind} [${f.app}] ${f.key}\n        ${f.detail}`);
  if (bad.length > 40) console.log(`  ... ${bad.length - 40} more`);
}

console.log(
  `\n${totals.semantic ? "FAILED" : "PASSED"}: ${totals.shared} question(s) present in both revisions · ` +
  `${totals.indexMoved} answer index(es) changed · ${totals.orderChanged} option list(s) reordered · ` +
  `${totals.semantic} correct answer(s) actually changed · ${totals.options} option-set change(s) · ` +
  `${totals.added} question(s) added · ${totals.removed} removed.`);

process.exit(totals.semantic ? 1 : 0);
