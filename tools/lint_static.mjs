#!/usr/bin/env node
/*
 * Atlas static guardrail lint (no dependencies).
 *
 * For every app (5 sub-apps + hub) it checks the things that silently break a
 * fully-offline static PWA collection:
 *   - every sw.js CORE precache entry points at a file that exists
 *     (Cache.addAll is all-or-nothing: one missing entry kills the whole SW)
 *   - every <script src> / <link rel=stylesheet> in index.html exists
 *   - every JS/CSS asset in index.html is precached in CORE (warning)
 *   - every @font-face url("../fonts/..") exists and is precached (warning)
 *   - each app has a CACHE constant and cache names are unique across apps
 *   - manifest.webmanifest is valid JSON (when present)
 *   - no external http(s) URLs except the W3C SVG ns, .example, localhost
 *
 * Usage:  node tools/lint_static.mjs
 * Exit code is non-zero if any FAIL is found.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const APPS = [
  { name: "hub", dir: ROOT },
  { name: "Blueprint", dir: join(ROOT, "hld-lld-academy") },
  { name: "Codex", dir: join(ROOT, "dsa-patterns-academy") },
  { name: "Citadel", dir: join(ROOT, "cyber-academy") },
  { name: "Cascade", dir: join(ROOT, "data-eng-academy") },
  { name: "TechLead", dir: join(ROOT, "techno-managerial-academy") },
];

let fails = 0;
let warns = 0;
const cacheNames = new Map();

const fail = (app, msg) => { console.log(`FAIL [${app}] ${msg}`); fails++; };
const warn = (app, msg) => { console.log(`warn [${app}] ${msg}`); warns++; };
const pass = (app, msg) => console.log(`ok   [${app}] ${msg}`);

function read(p) { return existsSync(p) ? readFileSync(p, "utf8") : null; }

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function resolveCore(appDir, entry) {
  let rel = entry.replace(/^\.\//, "");
  if (rel === "" || rel.endsWith("/")) rel += "index.html";
  return join(appDir, rel);
}

function extractCore(sw) {
  const m = sw.match(/const CORE\s*=\s*\[([\s\S]*?)\]/);
  if (!m) return null;
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

function hasExternal(text) {
  const cleaned = text
    .replace(/https?:\/\/(www\.)?w3\.org[^\s"')]*/g, "")
    .replace(/https?:\/\/[a-z0-9.-]*\.example[^\s"')]*/gi, "")
    .replace(/https?:\/\/(localhost|127\.0\.0\.1)[^\s"')]*/g, "");
  const m = cleaned.match(/https?:\/\/[^\s"')]+/);
  return m ? m[0] : null;
}

for (const app of APPS) {
  const { name, dir } = app;
  const indexPath = join(dir, "index.html");
  const swPath = join(dir, "sw.js");
  const index = read(indexPath);
  const sw = read(swPath);
  if (!index) { fail(name, "missing index.html"); continue; }
  if (!sw) { fail(name, "missing sw.js"); continue; }

  // cache name + uniqueness
  const cm = sw.match(/const CACHE\s*=\s*"([^"]+)"/);
  if (!cm) fail(name, "sw.js has no CACHE constant");
  else {
    if (cacheNames.has(cm[1])) fail(name, `cache name "${cm[1]}" collides with ${cacheNames.get(cm[1])}`);
    else { cacheNames.set(cm[1], name); pass(name, `cache ${cm[1]}`); }
  }

  // CORE entries exist
  const core = extractCore(sw) || [];
  if (!core.length) warn(name, "sw.js CORE array empty or unparsed");
  let missing = 0;
  for (const entry of core) {
    if (/^https?:/.test(entry)) { fail(name, `CORE has external URL ${entry}`); continue; }
    if (!existsSync(resolveCore(dir, entry))) { fail(name, `CORE entry missing on disk: ${entry}`); missing++; }
  }
  if (!missing && core.length) pass(name, `${core.length} CORE entries all exist`);

  // index.html assets exist + precached
  const assets = [
    ...[...index.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]),
    ...[...index.matchAll(/<link[^>]+href="([^"]+\.css)"/g)].map((m) => m[1]),
  ].filter((a) => !/^https?:|^data:/.test(a));
  for (const a of assets) {
    if (!existsSync(join(dir, a.replace(/^\.\//, "")))) fail(name, `index asset missing on disk: ${a}`);
    const norm = a.startsWith("./") ? a : "./" + a;
    if (core.length && !core.includes(norm) && !core.includes(a)) warn(name, `index asset not precached in CORE: ${a}`);
  }

  // @font-face references
  const css = read(join(dir, "css", "styles.css"));
  if (css) {
    for (const m of css.matchAll(/url\("\.\.\/(fonts\/[^"]+)"\)/g)) {
      const fp = join(dir, m[1]);
      if (!existsSync(fp)) fail(name, `@font-face references missing file: ${m[1]}`);
      else if (core.length && !core.includes("./" + m[1])) warn(name, `font not precached in CORE: ./${m[1]}`);
    }
  }

  // manifest JSON valid
  const manPath = join(dir, "manifest.webmanifest");
  if (existsSync(manPath)) {
    try { JSON.parse(readFileSync(manPath, "utf8")); pass(name, "manifest JSON valid"); }
    catch (e) { fail(name, "manifest.webmanifest invalid JSON: " + e.message); }
  }

  // external URL scan over html/js/css
  const scanFiles = [indexPath, swPath, ...walk(join(dir, "js")), ...walk(join(dir, "css"))]
    .filter((p) => /\.(html|js|mjs|css)$/.test(p) && existsSync(p));
  let ext = 0;
  for (const p of scanFiles) {
    const hit = hasExternal(readFileSync(p, "utf8"));
    if (hit) { fail(name, `external URL in ${p.replace(ROOT + "/", "")}: ${hit}`); ext++; }
  }
  if (!ext) pass(name, "no disallowed external URLs");
}

console.log(`\n${fails ? "FAILED" : "PASSED"}: ${fails} failure(s), ${warns} warning(s) across ${APPS.length} apps.`);
process.exit(fails ? 1 : 0);
