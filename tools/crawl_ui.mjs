#!/usr/bin/env node
/*
 * Atlas UI sweep — light-theme readability and keyboard/command-palette
 * behaviour. Sibling of crawl_e2e.mjs; same dependency-free CDP client, same
 * route-enumeration discipline, much smaller route budget.
 *
 * Why this exists as its own gate: crawl_e2e.mjs drives everything with
 * programmatic click() in the default (dark) theme, so two whole classes of
 * visible defect were invisible to it.
 *
 * ---- Gate A: light-theme contrast -----------------------------------------
 * Every app has a data-theme="light" mode. The documented hazard in this repo
 * is widget cut-out text styled `color: var(--ink-900)`: that reads on *accent*
 * fills (accent darkens in light theme) and disappears on *constant* fills,
 * which need an explicit [data-theme="light"] override.
 *
 * For a sample of routes the sweep measures every text-bearing node inside
 * .widget-mount and .note in BOTH themes and compares:
 *   - ratio < 1.5 in either theme        -> failure (text is effectively gone)
 *   - light < 2.2 while dark >= 3.0      -> failure (light-theme regression:
 *                                           exactly the hazard above)
 *   - otherwise ratio < 3.0              -> warning (low contrast by design)
 * Measuring both themes is what keeps this honest: a node that is equally dim
 * in dark is a styling choice, not a regression, and gets reported as such.
 *
 * Backgrounds come from elementsFromPoint at the node's centre rather than a
 * DOM walk, so SVG text over a <rect fill> composites the same way HTML text
 * over a parent background does. Nodes sitting on a gradient or image are
 * counted as unmeasurable and reported, never guessed at.
 *
 * ---- Gate B: keyboard + command palette -----------------------------------
 * Keys are delivered with CDP Input.dispatchKeyEvent, i.e. through the real
 * browser input pipeline, not a synthetic dispatchEvent that would bypass focus
 * and default-prevention. Checked: Cmd/Ctrl-K palette, "/" search focus, "?"
 * shortcuts modal, A-E quiz answer keys, left/right lesson nav, Escape, plus
 * focus containment inside each dialog and focus restoration on close.
 *
 * Each behaviour is only a failure if the app advertises it. The advertised set
 * is read out of the app's own UI (its shortcuts modal, its <kbd> chrome hints,
 * its quiz footer tip), so the thin shells are not measured against the mature
 * ones' feature list, and a newly advertised shortcut is covered with no change
 * here. Something implemented but unadvertised, or advertised-and-absent, is
 * reported either way -- only the severity differs.
 *
 * Prereqs: the same static server + headless Chrome as crawl_e2e.mjs.
 *
 * Usage:
 *   node tools/crawl_ui.mjs                     # all apps
 *   node tools/crawl_ui.mjs --app=cyber-academy
 *   node tools/crawl_ui.mjs --sample=4          # 4 routes per app for the theme sweep
 *   node tools/crawl_ui.mjs --selftest          # negative tests, no gate output
 *
 * Env: E2E_BASE (default http://127.0.0.1:8780), E2E_CDP (default http://127.0.0.1:9240)
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, discoverApps } from "./lib/atlas-shared.mjs";
import { Session, sleep, boot, reload, resetOrigin, HARNESS_FAULT, reportFault, startDeadline } from "./lib/cdp.mjs";

const argv = process.argv.slice(2);
const flag = (name, dflt = null) => {
  const hit = argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return dflt;
  return hit.includes("=") ? hit.split("=").slice(1).join("=") : true;
};
const BASE = String(flag("base", process.env.E2E_BASE || "http://127.0.0.1:8780")).replace(/\/$/, "");
const CDP = String(flag("cdp", process.env.E2E_CDP || "http://127.0.0.1:9240")).replace(/\/$/, "");
const ONLY = flag("app");
const SAMPLE = Number(flag("sample", 8)) || 8;
const QUIET = !!flag("quiet", false);
/*
 * Photograph every contrast failure and label it confirmed / flagged /
 * artifact. Costs one screenshot per failure, so it is opt-in for a run whose
 * job is to decide what to hand to a CSS fix, rather than on by default.
 */
const TRIAGE = !!flag("triage", false);
const OUT = String(flag("out", join(ROOT, "tools", "ui-report.json")));

/* Contrast thresholds. Deliberately far below WCAG AA (4.5) — the brief is to
 * catch near-invisible text, not to grade the palette. */
const GONE = 1.5;    // same colour either side: the text is not there
const BROKEN = 2.2;  // light-theme value that counts as a regression
const DIM = 3.0;     // WCAG large-text floor; below this is worth a warning

/*
 * The sweep needs a desktop viewport: at the default headless 800x600 the
 * mobile breakpoints (1080/680/560/460) collapse the search box and sidebar, so
 * half the keyboard surface is unreachable and the theme sweep measures a
 * layout no desktop user sees.
 *
 * It has to come from Chrome's own --window-size, not Emulation
 * setDeviceMetricsOverride: that override sent this Chrome's browser process
 * into a permanent 100%-CPU spin that outlived the run and made every later
 * CDP attach hang. Asking for the viewport instead of imposing it costs one
 * launch flag and cannot wedge the browser.
 */
const MIN_WIDTH = 1100;

const say = (...a) => { if (!QUIET) console.log(...a); };

/* ================================================== in-page UI test harness */

const HARNESS = String.raw`
window.__ui = (function () {
  "use strict";

  function main() { return document.getElementById("main") || document.querySelector("main") || document.body; }

  /*
   * Two frames, or a timer if the frames never come. Headless Chrome stops
   * producing frames when nothing repaints, so a bare
   * requestAnimationFrame chain can be starved indefinitely: the settle
   * promise never resolves and the gate hangs rather than reporting anything.
   */
  function settle(done) {
    var fired = false;
    function go() { if (fired) return; fired = true; done(); }
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { setTimeout(go, 0); });
    });
    setTimeout(go, 150);
  }

  function nav(hash) {
    return new Promise(function (resolve) {
      var fired = false;
      function finish() { if (fired) return; fired = true; window.removeEventListener("hashchange", onHash); settle(function () { resolve(true); }); }
      function onHash() { finish(); }
      if (location.hash === hash) { finish(); return; }
      window.addEventListener("hashchange", onHash);
      location.hash = hash;
      setTimeout(finish, 400);
    });
  }

  /* --------------------------------------------------------- route discovery */

  function tracks() {
    if (window.TRACKS && typeof window.TRACKS === "object") return window.TRACKS;
    for (var k in window) {
      if (/_DATA$/.test(k) && window[k] && window[k].tracks) return window[k].tracks;
    }
    return {};
  }

  /*
   * Lesson routes annotated with how many widget and note blocks the content
   * declares, so the caller can spend its small route budget where the
   * cut-out-text hazard actually lives instead of sampling blindly.
   */
  function discover() {
    var T = tracks(), out = [], ids = [];
    for (var key in T) {
      var tr = T[key];
      if (!tr || !tr.id) continue;
      ids.push(tr.id);
      (tr.modules || []).forEach(function (mod) {
        (mod.lessons || []).forEach(function (les) {
          var w = 0, n = 0;
          (les.blocks || []).forEach(function (b) {
            if (!b || !b.t) return;
            if (b.t === "widget") w++;
            else if (b.t === "note") n++;
          });
          out.push({ route: "#/" + tr.id + "/" + mod.id + "/" + les.id, track: tr.id, widgets: w, notes: n });
        });
      });
    }
    return { lessons: out, trackIds: ids };
  }

  /* ------------------------------------------------------------------ theme */

  function theme() { return document.documentElement.getAttribute("data-theme") || ""; }

  /* Prefer the app's own control so the real code path is exercised; fall back
   * to the attribute the control sets, so an app with no visible toggle is
   * still swept rather than skipped. */
  /*
   * Transitions off while measuring.
   *
   * These stylesheets are full of shorthand transitions ("transition: 0.18s
   * var(--ease)"), which means *all* properties animate — colour included. Read
   * a computed colour in the same frame as the theme flip and you get the value
   * the property is transitioning *from*, so light-theme text still reports its
   * dark-theme colour while the backdrop behind it already reports the light
   * one. That mismatch invented a light-theme "invisible text" failure on
   * roughly a hundred nodes that render fine.
   *
   * Suppressing transitions changes no final colour, only how fast it arrives,
   * so the measurement is the settled state rather than a frame of animation.
   */
  function freeze(on) {
    var el = document.getElementById("__uiFreeze");
    if (on && !el) {
      el = document.createElement("style");
      el.id = "__uiFreeze";
      el.textContent = "*, *::before, *::after { transition: none !important; animation: none !important; }";
      document.head.appendChild(el);
    } else if (!on && el) {
      el.remove();
    }
    return !!document.getElementById("__uiFreeze") === !!on;
  }

  function setTheme(want) {
    var btn = document.getElementById("themeToggle");
    if (btn) {
      for (var i = 0; i < 3 && theme() !== want; i++) btn.click();
      if (theme() === want) return { theme: theme(), via: "toggle" };
    }
    document.documentElement.setAttribute("data-theme", want);
    return { theme: theme(), via: btn ? "attribute (toggle did not reach it)" : "attribute (no #themeToggle)" };
  }

  /* ----------------------------------------------------------- contrast math */

  function parsePaint(v) {
    if (!v) return null;
    v = String(v).trim();
    if (v === "none" || v === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
    var m = v.match(/^rgba?\(([^)]+)\)$/);
    if (m) {
      var p = m[1].split(/[,\/\s]+/).filter(function (x) { return x.length; }).map(Number);
      if (p.length < 3 || p.some(isNaN)) return null;
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    }
    if (/^#[0-9a-f]{6}$/i.test(v)) {
      return { r: parseInt(v.slice(1, 3), 16), g: parseInt(v.slice(3, 5), 16), b: parseInt(v.slice(5, 7), 16), a: 1 };
    }
    if (/^#[0-9a-f]{3}$/i.test(v)) {
      return { r: parseInt(v[1] + v[1], 16), g: parseInt(v[2] + v[2], 16), b: parseInt(v[3] + v[3], 16), a: 1 };
    }
    return null;   // named colour or a paint server; caller treats as unmeasurable
  }

  function over(fg, bg) {
    var a = fg.a;
    return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
  }

  function lum(c) {
    function ch(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
  }

  function ratio(a, b) {
    var la = lum(a), lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  function ownText(el) {
    var t = "";
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3) t += n.nodeValue;
    }
    return t.replace(/\s+/g, " ").trim();
  }

  /* stable across a theme flip: child-index path from #main plus tag/class */
  function pathKey(el) {
    var parts = [], node = el, root = main();
    while (node && node !== root && node.parentNode) {
      var p = node.parentNode, i = 0;
      for (var c = p.firstElementChild; c && c !== node; c = c.nextElementSibling) i++;
      parts.unshift(i);
      node = p;
    }
    return parts.join(".") + "|" + (el.tagName || "").toLowerCase() + "." + (el.getAttribute && el.getAttribute("class") || "");
  }

  /* decoration hidden from assistive tech: still on screen, but not text the
   * app is asking anyone to read, and a large share of the icon glyphs and
   * spacer characters in these widgets. Counted, not silently dropped. */
  function ariaHidden(el) {
    for (var n = el; n && n.nodeType === 1; n = n.parentNode) {
      if (n.getAttribute && n.getAttribute("aria-hidden") === "true") return true;
    }
    return false;
  }

  var lastSkips = { aria: 0 };

  function candidates(limit) {
    var out = [], seen = [];
    lastSkips = { aria: 0 };
    var roots = main().querySelectorAll(".widget-mount, .note");
    for (var i = 0; i < roots.length; i++) {
      var scope = roots[i].querySelectorAll("*");
      var list = [roots[i]];
      for (var j = 0; j < scope.length; j++) list.push(scope[j]);
      for (var k = 0; k < list.length; k++) {
        var el = list[k];
        if (seen.indexOf(el) >= 0) continue;
        if (/^(script|style|defs|clippath|lineargradient|radialgradient|marker|pattern)$/i.test(el.tagName)) continue;
        if (!ownText(el)) continue;
        seen.push(el);
        if (ariaHidden(el)) { lastSkips.aria++; continue; }
        out.push(el);
        if (out.length >= limit) return out;
      }
    }
    return out;
  }

  /*
   * Resolve a pathKey back to its element, so a finding can be re-examined
   * later without holding a reference across a navigation.
   */
  function elementByKey(key) {
    var idx = String(key).split("|")[0];
    var node = main();
    if (!idx) return node;
    var parts = idx.split(".");
    for (var i = 0; i < parts.length; i++) {
      var want = parseInt(parts[i], 10), c = node.firstElementChild;
      for (var j = 0; c && j < want; j++) c = c.nextElementSibling;
      if (!c) return null;
      node = c;
    }
    return node;
  }

  /*
   * Everything the driver needs to judge one finding on the rendered pixels:
   * where it is on screen right now, and the properties that decide whether a
   * low ratio is a defect or decoration.
   */
  function probeRect(key) {
    var el = elementByKey(key);
    if (!el) return null;
    var root = document.documentElement, prev = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    var r = bringIntoView(el);
    root.style.scrollBehavior = prev;
    var cs = getComputedStyle(el);
    var text = ownText(el);
    return {
      /* PAGE coordinates, not viewport ones: Page.captureScreenshot's clip is
       * relative to the document origin. Handing it a getBoundingClientRect()
       * while the page is scrolled photographs a different region entirely —
       * usually a flat patch of background, which then reads as a perfect 1:1
       * and "confirms" every finding for the wrong reason. */
      rect: { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) },
      viewport: { x: Math.round(r.left), y: Math.round(r.top) },
      onScreen: r.top >= 0 && r.bottom <= innerHeight && r.width >= 1 && r.height >= 1,
      aria: ariaHidden(el),
      fontPx: parseFloat(cs.fontSize) || 0,
      weight: cs.fontWeight,
      /* punctuation, arrows, box-drawing: nothing anyone reads for meaning */
      wordy: /[A-Za-z0-9]/.test(text),
      text: text.slice(0, 60),
      selector: (el.tagName || "").toLowerCase() +
        (el.getAttribute && el.getAttribute("class") ? "." + String(el.getAttribute("class")).trim().split(/\s+/).join(".") : "")
    };
  }

  /*
   * The background under a node, taken from the paint stack at its centre.
   * Walking parent background-color misses the case this gate exists for --
   * SVG <text> whose backdrop is a sibling <rect fill> -- while a point hit
   * test composites both the same way the user sees them.
   */
  function backdrop(el, cx, cy) {
    var stack;
    try { stack = document.elementsFromPoint(cx, cy); } catch (e) { return { why: "no hit test" }; }
    var at = stack.indexOf(el);
    if (at < 0) {
      /* something is on top of the text, or the text sits outside its own box
       * (a transform, a clip). Not a contrast verdict either way. */
      return { why: "node not on top at its own centre" };
    }

    /* Every painted layer under the text, nearest first, down to the first
     * opaque one — starting with the text's OWN element, because a glyph is
     * painted over its element's background, not merely over its ancestors'.
     * Starting at at+1 here read every accent pill and primary button in the
     * repo as near-invisible: their cut-out ink-900 label was
     * composited against the page surface instead of the accent fill the label
     * actually sits on. */
    var layers = [], opaque = false;
    for (var i = at; i < stack.length && !opaque; i++) {
      var node = stack[i];
      var cs = getComputedStyle(node);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return { why: "sits on a gradient or image" };
      var paint = parsePaint(cs.backgroundColor);
      /* An SVG shape's fill *is* its background — but only for shapes under the
       * text, never for the text element itself, whose fill is the glyph colour
       * we are comparing against. Reading it as a backdrop too made every SVG
       * label its own background and reported a flat 1:1 in both themes. */
      if ((!paint || !paint.a) && i !== at && node.ownerSVGElement !== undefined && node.tagName !== "svg") {
        paint = parsePaint(cs.fill);
      }
      if (!paint) return { why: "unparseable paint " + JSON.stringify(cs.backgroundColor) };
      if (!paint.a) continue;
      layers.push(paint);
      opaque = paint.a >= 0.999;
    }
    if (!opaque) {
      var page = parsePaint(getComputedStyle(document.body).backgroundColor);
      if (!page || page.a < 0.999) page = parsePaint(getComputedStyle(document.documentElement).backgroundColor);
      if (!page || !page.a) return { why: "no opaque backdrop anywhere in the stack" };
      layers.push(page);
    }

    /* composite bottom-up so a translucent layer over a dark page reads the
     * way it looks, not the way its own rgba() suggests */
    var acc = layers[layers.length - 1];
    for (var j = layers.length - 2; j >= 0; j--) acc = over(layers[j], acc);
    return { color: acc };
  }

  /*
   * Bring a node into the viewport *synchronously*. Every app sets
   * html { scroll-behavior: smooth }, which makes scrollIntoView animate — the
   * rect read straight afterwards is mid-flight, the hit test lands on whatever
   * is passing under the point, and perfectly readable text gets filed as
   * unmeasurable. Pinning the behaviour for the duration of the measurement is
   * what makes this deterministic.
   */
  function bringIntoView(el) {
    try { el.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" }); } catch (e) {}
    var r = el.getBoundingClientRect();
    if (r.top >= 0 && r.bottom <= innerHeight) return r;
    /* nested scroll containers, or a node near the end of the document that
     * scrollIntoView cannot centre: fall back to an absolute window scroll */
    window.scrollTo({ top: Math.max(0, r.top + scrollY - innerHeight / 2), behavior: "auto" });
    return el.getBoundingClientRect();
  }

  function contrast(limit) {
    var els = candidates(limit || 150);
    var nodes = [], unmeasurable = [];
    var root = document.documentElement;
    var prevBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    var prevScroll = scrollY;
    try {
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility !== "visible") continue;
      var r = bringIntoView(el);
      if (r.width < 1 || r.height < 1) continue;

      /* cumulative opacity: 0.02 on an ancestor hides text no matter the colour */
      var op = 1, anc = el;
      while (anc && anc.nodeType === 1) {
        var o = parseFloat(getComputedStyle(anc).opacity);
        if (!isNaN(o)) op *= o;
        anc = anc.parentNode;
      }

      var isSvgText = el.ownerSVGElement !== undefined && el.tagName !== "svg";
      var fg = parsePaint(isSvgText ? cs.fill : cs.color);
      if (!fg) { unmeasurable.push({ key: pathKey(el), why: "unparseable text colour " + (isSvgText ? cs.fill : cs.color) }); continue; }

      /* the centre of the node's own box, only usable if it is on screen —
       * clamping into the viewport would aim the hit test at a different
       * element and invent a backdrop */
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cx < 1 || cy < 1 || cx > innerWidth - 2 || cy > innerHeight - 2) {
        unmeasurable.push({ key: pathKey(el), why: "could not be scrolled into the viewport" });
        continue;
      }
      var back = backdrop(el, cx, cy);
      if (!back.color) { unmeasurable.push({ key: pathKey(el), why: back.why }); continue; }

      var eff = over({ r: fg.r, g: fg.g, b: fg.b, a: fg.a * op }, back.color);
      nodes.push({
        key: pathKey(el),
        ratio: Math.round(ratio(eff, back.color) * 100) / 100,
        fg: (isSvgText ? cs.fill : cs.color) + (op < 0.999 ? " @opacity " + Math.round(op * 100) / 100 : ""),
        bg: "rgb(" + Math.round(back.color.r) + ", " + Math.round(back.color.g) + ", " + Math.round(back.color.b) + ")",
        text: ownText(el).slice(0, 60),
        inWidget: !!el.closest(".widget-mount"),
        widget: (function (m) { return m ? m.getAttribute("data-widget") : null; })(el.closest(".widget-mount"))
      });
    }
    } finally {
      window.scrollTo({ top: prevScroll, behavior: "auto" });
      root.style.scrollBehavior = prevBehavior;
    }
    return { theme: theme(), nodes: nodes, unmeasurable: unmeasurable, considered: els.length,
             skippedAriaHidden: lastSkips.aria };
  }

  /* ------------------------------------------------- keyboard: what is claimed */

  /*
   * The advertised shortcut set, read from the app's own UI. Sources, in the
   * order they matter: the shortcuts modal it builds at boot, <kbd> hints in
   * the chrome, the command-palette button's own label, and the quiz footer
   * tip. Deriving this instead of hardcoding it means the thin shells are
   * judged on what they promise, and a new promise is covered for free.
   */
  function advertised() {
    var texts = [];
    var help = document.querySelector(".help-modal, [aria-labelledby='helpTitle']");
    if (help) {
      var rows = help.querySelectorAll(".help-row");
      for (var i = 0; i < rows.length; i++) texts.push((rows[i].textContent || "").trim());
      if (!rows.length) texts.push((help.textContent || "").trim());
    }
    var kbds = document.querySelectorAll("kbd");
    for (var j = 0; j < kbds.length; j++) {
      if (main().contains(kbds[j])) continue;          // lesson prose, not a promise
      texts.push((kbds[j].textContent || "").trim());
    }
    var cmdk = document.querySelector("#cmdkBtn, .cmdk-btn, [aria-label*='command palette' i]");
    if (cmdk) texts.push(((cmdk.getAttribute("title") || "") + " " + (cmdk.textContent || "") + " " + (cmdk.getAttribute("aria-label") || "")).trim());
    var hint = main().querySelector(".quiz-hint");
    if (hint) texts.push((hint.textContent || "").trim());

    var blob = texts.join(" | ");
    return {
      cmdk: /(\u2318|cmd|ctrl|control)\s*[-+ ]?\s*k\b/i.test(blob),
      slash: /(^|[|\s])\/($|[|\s])/.test(blob) || /focus the search/i.test(blob),
      help: /\?/.test(blob),
      arrows: /\u2190|\u2192|arrow|previous ?\/ ?next/i.test(blob),
      quizkeys: /a\s*[\u2013\-]\s*e|press a|1\s*[\u2013\-]\s*9/i.test(blob),
      escape: /\besc\b/i.test(blob),
      sources: texts.slice(0, 12)
    };
  }

  /* ---------------------------------------------- keyboard: observable state */

  function palette() { return document.querySelector(".palette, #palette, [aria-label*='ommand palette'][role='dialog']"); }
  function helpModal() { return document.querySelector(".help-modal, [aria-labelledby='helpTitle']"); }
  function shown(el) {
    if (!el || el.hidden) return false;
    var cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    return el.getClientRects().length > 0;
  }

  function describe(el) {
    if (!el || el === document.body) return "body";
    return (el.tagName || "?").toLowerCase() +
      (el.id ? "#" + el.id : "") +
      (el.getAttribute && el.getAttribute("class") ? "." + String(el.getAttribute("class")).split(/\s+/)[0] : "");
  }

  function state() {
    var pal = palette(), hm = helpModal(), a = document.activeElement;
    var search = document.querySelector("#search, #searchInput, input.search, header input[type=text]");
    return {
      hash: location.hash,
      paletteOpen: shown(pal),
      helpOpen: shown(hm),
      focus: describe(a),
      focusInPalette: !!(pal && a && pal.contains(a)),
      focusInHelp: !!(hm && a && hm.contains(a)),
      focusIsSearch: !!(search && a === search),
      quizAnswered: !!main().querySelector(".q-opt.correct, .q-opt.wrong, .q-opt[disabled]"),
      quizPresent: !!main().querySelector(".q-opt")
    };
  }

  /*
   * Same snapshot, but wait for focus to land inside the dialog first.
   *
   * Every app moves focus into a freshly opened dialog from a timer
   * (setTimeout(..., 10) after the element is unhidden), so a synchronous read
   * one frame after the keypress catches focus still on the trigger and reports
   * "the dialog does not take focus" — which it does, 10ms later. Poll instead,
   * and only conclude the dialog never claimed focus once the window closes.
   */
  function waitFor(read, ok, ms) {
    var deadline = Date.now() + (ms || 400);
    return new Promise(function (res) {
      (function tick() {
        var v = read();
        if (ok(v) || Date.now() > deadline) return res(v);
        setTimeout(tick, 20);
      })();
    });
  }

  function stateWhenFocused(which, ms) {
    return waitFor(state, function (st) { return !!st[which]; }, ms);
  }

  /* self-test for the primitive above: focus arrives on a timer, exactly like
   * the apps do it. The immediate read must miss it and the polled read must
   * catch it — if both agree, the poll is not actually waiting and the
   * "dialog does not take focus" warning is meaningless. */
  function focusWaitProbe() {
    var box = document.createElement("div");
    box.setAttribute("data-ui-focus-probe", "1");
    box.innerHTML = '<input type="text" />';
    main().appendChild(box);
    var input = box.querySelector("input");
    var inside = function () { return document.activeElement === input; };
    setTimeout(function () { input.focus(); }, 180);
    var immediate = inside();
    return waitFor(inside, function (v) { return v; }, 500).then(function (polled) {
      box.remove();
      return { immediate: immediate, polled: polled };
    });
  }

  function caps() {
    return {
      themeToggle: !!document.getElementById("themeToggle"),
      search: !!document.querySelector("#search, #searchInput, input.search, header input[type=text]"),
      palette: !!palette(),
      help: !!helpModal(),
      advertised: advertised()
    };
  }

  function blur() { try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) {} return describe(document.activeElement); }

  /* park focus somewhere identifiable so "focus was restored" is a real claim
   * rather than "focus happens to be on body again" */
  function parkFocus() {
    var anchor = document.getElementById("themeToggle") || document.querySelector("header button, button");
    if (anchor && anchor.focus) { anchor.focus(); return describe(document.activeElement); }
    return blur();
  }

  /*
   * Ground truth: the contrast actually on screen, from the rendered pixels of
   * one node, rather than from its computed styles.
   *
   * The CSS math above can only be as right as its model of the paint stack. It
   * is worth having a second opinion that shares none of that model, because
   * the whole value of this gate is that a low number means a human cannot read
   * the text. Method: the modal colour in the crop is the background; the glyph
   * colour is the luminance extreme, taken at a percentile so one stray border
   * pixel or an antialiased edge cannot define it.
   */
  function decode(b64, w, h) {
    return fetch("data:image/png;base64," + b64).then(function (r) { return r.blob(); })
      .then(createImageBitmap).then(function (bm) {
        var c = new OffscreenCanvas(bm.width, bm.height), g = c.getContext("2d");
        g.drawImage(bm, 0, 0);
        /* inset, so a border or a neighbour's edge is not sampled as text */
        var ix = Math.min(2, Math.floor(bm.width / 8)), iy = Math.min(2, Math.floor(bm.height / 8));
        var iw = Math.max(1, bm.width - ix * 2), ih = Math.max(1, bm.height - iy * 2);
        var d = g.getImageData(ix, iy, iw, ih).data;
        var tally = {}, pixels = [];
        for (var i = 0; i < d.length; i += 4) {
          var col = { r: d[i], g: d[i + 1], b: d[i + 2] };
          var k = col.r + "," + col.g + "," + col.b;
          tally[k] = (tally[k] || 0) + 1;
          pixels.push(col);
        }
        if (!pixels.length) return null;
        var modeKey = null, modeN = -1;
        for (var key in tally) if (tally[key] > modeN) { modeN = tally[key]; modeKey = key; }
        var p = modeKey.split(",").map(Number);
        var bg = { r: p[0], g: p[1], b: p[2], a: 1 };
        var lbg = lum(bg);
        var scored = pixels.map(function (c2) { return { c: c2, d: Math.abs(lum(c2) - lbg) }; })
          .sort(function (a, b2) { return b2.d - a.d; });
        /* the 2nd percentile of most-distant pixels: real glyph core, not noise */
        var pick = scored[Math.min(scored.length - 1, Math.floor(scored.length * 0.02))].c;
        return {
          bg: "rgb(" + bg.r + ", " + bg.g + ", " + bg.b + ")",
          fg: "rgb(" + pick.r + ", " + pick.g + ", " + pick.b + ")",
          ratio: Math.round(ratio({ r: pick.r, g: pick.g, b: pick.b, a: 1 }, bg) * 100) / 100,
          bgShare: Math.round((modeN / pixels.length) * 100) / 100,
          size: bm.width + "x" + bm.height
        };
      });
  }

  /* ------------------------------------------------------------- self-tests */

  /*
   * Sabotage: swallow every keydown at the capture phase, ahead of every app
   * listener. With this on, every advertised shortcut must be reported broken;
   * with it off, the same run must pass. A check that cannot fail is not a
   * check.
   */
  var swallow = null;
  function sabotage(on) {
    if (on && !swallow) {
      swallow = function (e) { e.stopImmediatePropagation(); e.preventDefault(); };
      window.addEventListener("keydown", swallow, true);
      document.addEventListener("keydown", swallow, true);
      return true;
    }
    if (!on && swallow) {
      window.removeEventListener("keydown", swallow, true);
      document.removeEventListener("keydown", swallow, true);
      swallow = null;
      return true;
    }
    return false;
  }

  /*
   * Contrast probes, planted in a real mount so they run through the same
   * candidate collection, hit testing and compositing as authored content.
   *   bad     - grey on white, the classic light-theme cut-out failure
   *   svg     - the same failure expressed as SVG text on a <rect fill>
   *   faded   - readable colours killed by an ancestor opacity
   *   good    - must NOT be flagged; guards against a check that fails
   *             everything and looks vigilant
   */
  var probe = null;
  function plantProbes() {
    var host = main().querySelector(".widget-mount") || main();
    probe = document.createElement("div");
    probe.setAttribute("data-ui-probe", "1");
    probe.innerHTML =
      '<div class="note" style="background:#ffffff"><span data-p="bad" style="color:#f4f4f4">probe near invisible</span></div>' +
      '<div class="note" style="background:#ffffff"><span data-p="good" style="color:#101010">probe readable</span></div>' +
      '<div class="note" style="background:#ffffff;opacity:0.04"><span data-p="faded" style="color:#000000">probe faded out</span></div>' +
      /* The cut-out case: the text's OWN element paints the fill it sits on,
       * the way every accent pill and primary button in these apps does. The
       * original probe set only ever put the fill on an ancestor, which let a
       * backdrop walk that skipped the element itself pass the self-test while
       * calling several hundred perfectly readable labels invisible. */
      '<div class="note" style="background:#101010">' +
      '<span data-p="cutout-ok" style="background:#5eead4;color:#070910;padding:2px 6px">probe cutout readable</span> ' +
      '<span data-p="cutout-bad" style="background:#5eead4;color:#5ce9d2;padding:2px 6px">probe cutout invisible</span>' +
      "</div>" +
      /* Mid-transition case: this text is *becoming* invisible over 4s. Measured
       * naively in the same frame as the change it still reports its readable
       * start colour, which is how a hundred real-looking light-theme failures
       * got invented — and how a real one could just as easily be missed. */
      '<div class="note" style="background:#ffffff">' +
      '<span data-p="tween" style="color:#101010;transition:color 4s linear">probe transitioning away</span>' +
      "</div>" +
      /* Decoration and punctuation: both invisible, neither worth a CSS fix.
       * The aria-hidden one must never be collected at all; the punctuation one
       * is collected and must be triaged as arguable rather than confirmed. */
      '<div class="note" style="background:#ffffff">' +
      '<span data-p="aria" aria-hidden="true" style="color:#f4f4f4">probe aria hidden</span>' +
      "</div>" +
      '<div class="note" style="background:#ffffff">' +
      '<span data-p="punct" style="color:#f4f4f4">\u2014 \u00b7 \u2014</span>' +
      "</div>" +
      '<div class="note" style="background:#ffffff">' +
      '<svg width="120" height="40" viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="0" y="0" width="120" height="40" fill="#ffffff"></rect>' +
      '<text data-p="svg" x="6" y="24" fill="#f6f6f6" font-size="12">probe svg cutout</text>' +
      "</svg></div>";
    host.appendChild(probe);
    return true;
  }
  /* start the probe's colour transition; with the freeze in place the new colour
   * must be readable immediately rather than four seconds later */
  function tweenProbe() {
    var el = probe && probe.querySelector('[data-p="tween"]');
    if (!el) return false;
    el.style.color = "#f4f4f4";
    return getComputedStyle(el).color;
  }
  function pullProbes() {
    if (probe) { probe.remove(); probe = null; }
    return !main().querySelector("[data-ui-probe]");
  }

  return {
    nav: nav, discover: discover, freeze: freeze,
    theme: theme, setTheme: setTheme, contrast: contrast,
    caps: caps, state: state, stateWhenFocused: stateWhenFocused, blur: blur, parkFocus: parkFocus,
    probeRect: probeRect, decode: decode,
    sabotage: sabotage, plantProbes: plantProbes, tweenProbe: tweenProbe, pullProbes: pullProbes,
    focusWaitProbe: focusWaitProbe
  };
})();
`;

/* ============================================================= key delivery */

/*
 * Real key events through the browser's input pipeline. A synthetic
 * dispatchEvent would skip focus routing and defaultPrevented handling, so a
 * shortcut that only works because the test aimed the event at the right node
 * would pass here and fail for a user.
 */
const MOD = { none: 0, alt: 1, ctrl: 2, meta: 4, shift: 8 };
const KEYS = {
  cmdk: { key: "k", code: "KeyK", vk: 75, mods: MOD.meta },
  ctrlk: { key: "k", code: "KeyK", vk: 75, mods: MOD.ctrl },
  slash: { key: "/", code: "Slash", vk: 191, text: "/" },
  question: { key: "?", code: "Slash", vk: 191, text: "?", mods: MOD.shift },
  a: { key: "a", code: "KeyA", vk: 65, text: "a" },
  tab: { key: "Tab", code: "Tab", vk: 9 },
  escape: { key: "Escape", code: "Escape", vk: 27 },
  right: { key: "ArrowRight", code: "ArrowRight", vk: 39 },
  left: { key: "ArrowLeft", code: "ArrowLeft", vk: 37 },
  f13: { key: "F13", code: "F13", vk: 124 },   // bound to nothing, anywhere
};

async function press(s, name) {
  const k = KEYS[name];
  if (!k) throw new Error("unknown key " + name);
  const common = { key: k.key, code: k.code, windowsVirtualKeyCode: k.vk, nativeVirtualKeyCode: k.vk, modifiers: k.mods || 0 };
  await s.send("Input.dispatchKeyEvent", { type: k.text ? "keyDown" : "rawKeyDown", text: k.text || "", ...common });
  await s.send("Input.dispatchKeyEvent", { type: "keyUp", ...common });
  /* two frames is what the apps need: openPalette focuses on a 10ms timer */
  await sleep(60);
}

const st = (s) => s.evaluate(`JSON.stringify(window.__ui.state())`).then(JSON.parse);
/* state once focus has had a chance to reach the dialog (apps focus on a timer) */
const stFocused = (s, which) =>
  s.evaluate(`window.__ui.stateWhenFocused(${JSON.stringify(which)}, 500).then(JSON.stringify)`,
    { awaitPromise: true }).then(JSON.parse);
const viewport = (s) =>
  s.evaluate(`JSON.stringify({width:innerWidth,height:innerHeight})`).then(JSON.parse);
const line = (w) => `${w.route}  ${w.symptom}${w.detail ? "  — " + String(w.detail).slice(0, 130) : ""}`;

/**
 * Collapse contrast failures onto their cause: the pair of colours involved.
 * One unthemed token repeats across every node that inherits it, so the useful
 * unit of a report is "this foreground on this background, N nodes, M routes".
 * Anything without a colour pair (a boot failure, say) is passed through whole.
 */
function groupByCause(failures) {
  const groups = new Map();
  for (const f of failures) {
    const pair = String(f.detail || "").match(/(rgb\([^)]*\)) on (rgb\([^)]*\))/);
    const key = pair ? `${f.symptom}|${pair[1]}|${pair[2]}` : `${f.symptom}|${f.route}`;
    let g = groups.get(key);
    if (!g) {
      g = { symptom: f.symptom, colours: pair ? `${pair[1]} on ${pair[2]}` : "", count: 0, routeSet: new Set(),
            example: `${f.route}  ${String(f.detail || "").split(" — ")[0]}` };
      groups.set(key, g);
    }
    g.count++;
    g.routeSet.add(f.route);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, routes: g.routeSet.size }))
    .sort((a, b) => b.count - a.count);
}

/* ================================================================ the gates */

function classify(dark, light) {
  const byKey = new Map(dark.nodes.map((n) => [n.key, n]));
  const failures = [], warnings = [];
  for (const l of light.nodes) {
    const d = byKey.get(l.key);
    const where = l.widget ? `widget "${l.widget}"` : l.inWidget ? "widget" : ".note";
    const detail = `"${l.text}" — ${l.fg} on ${l.bg}, ratio ${l.ratio}:1` + (d ? ` (dark theme: ${d.ratio}:1)` : "");
    const rec = { key: l.key, lightRatio: l.ratio, darkRatio: d ? d.ratio : null, text: l.text, widget: l.widget || null };
    if (l.ratio < GONE) failures.push({ symptom: `${where}: text is invisible in light theme`, detail, ...rec });
    else if (l.ratio < BROKEN && d && d.ratio >= DIM) failures.push({ symptom: `${where}: light-theme contrast regression`, detail, ...rec });
    else if (l.ratio < DIM) warnings.push({ symptom: `${where}: low contrast in light theme`, detail, ...rec });
  }
  for (const d of dark.nodes) {
    if (d.ratio < GONE) {
      const where = d.widget ? `widget "${d.widget}"` : d.inWidget ? "widget" : ".note";
      failures.push({ symptom: `${where}: text is invisible in dark theme`, detail: `"${d.text}" — ${d.fg} on ${d.bg}, ratio ${d.ratio}:1` });
    }
  }
  return { failures, warnings };
}

const setTheme = (s, want) =>
  s.evaluate(`JSON.stringify(window.__ui.setTheme(${JSON.stringify(want)}))`).then(JSON.parse);

/*
 * Navigation, bounded and recoverable.
 *
 * A hash navigation is a sub-second operation, so a 10s ceiling on it is
 * generous. Occasionally — reproducibly on the third or later session against
 * one long-lived Chrome — the in-page promise never settles even though the
 * renderer answers everything else, and a 30s protocol timeout then kills a run
 * that had found real defects. One reload puts the page back in a known state
 * and the sweep continues; a second failure is a genuine harness fault and is
 * allowed to end the run loudly, because at that point the browser cannot be
 * trusted to report anything about the content.
 */
async function navTo(s, route, app) {
  const call = `window.__ui.nav(${JSON.stringify(route)}).then(function(){return 1;})`;
  try {
    await s.evaluate(call, { awaitPromise: true, timeoutMs: 10_000 });
    return { recovered: false };
  } catch (e) {
    if (!e.harnessFault || !app) throw e;
    say(`     · navigation to ${route} stalled; reloading ${app.dir} once and retrying`);
    const again = await prepare(s, app);
    if (!again.ok) throw e;
    await s.evaluate(call, { awaitPromise: true, timeoutMs: 10_000 });
    return { recovered: true };
  }
}

/*
 * Second opinion on one finding, from the pixels Chrome actually painted.
 *
 * The verdict a contrast gate hands over has to survive the question "did you
 * check?", and everything above it shares one model of the paint stack — so a
 * wrong model produces a confident wrong number, at scale. This screenshots the
 * node and measures glyph-against-background from the image, then labels the
 * finding:
 *
 *   confirmed  — the rendered pixels agree the text is unreadable
 *   flagged    — real but arguably not a defect: decoration, punctuation-only,
 *                or large display type that clears the large-text bar
 *   artifact   — the pixels disagree with the CSS math, or the node could not be
 *                photographed; either way not something to hand to a CSS fix
 *
 * The page must be in light theme, frozen, and on the finding's own route when
 * this runs.
 */
const PIXEL_OK = 3.0;     // rendered ratio at or above this contradicts the finding
const LARGE_PX = 24;      // WCAG large-text threshold, where 3:1 is the bar

/** photograph one node by key and measure its rendered contrast */
async function pixelProbe(s, key) {
  let probe = null;
  try { probe = JSON.parse(await s.evaluate(`JSON.stringify(window.__ui.probeRect(${JSON.stringify(key)}) || null)`)); }
  catch (e) { if (e.harnessFault) throw e; }
  if (!probe) return { why: "node no longer resolvable on this route" };
  if (!probe.onScreen) return { why: "node could not be brought fully on screen", probe };

  let shot;
  try {
    const msg = await s.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: { x: probe.rect.x, y: probe.rect.y, width: Math.max(2, probe.rect.w), height: Math.max(2, probe.rect.h), scale: 1 },
    });
    shot = msg && msg.result && msg.result.data;
  } catch (e) { if (e.harnessFault) throw e; }
  if (!shot) return { why: "screenshot of the node came back empty", probe };

  let px = null;
  try {
    px = JSON.parse(await s.evaluate(
      `window.__ui.decode(${JSON.stringify(shot)}).then(JSON.stringify)`, { awaitPromise: true }));
  } catch (e) { if (e.harnessFault) throw e; }
  if (!px) return { why: "screenshot could not be decoded", probe };
  return { ...px, probe };
}

async function verifyByPixels(s, failures) {
  for (const f of failures) {
    if (!f.key) { f.triage = { class: "artifact", why: "no node key to re-examine" }; continue; }
    const px = await pixelProbe(s, f.key);
    const probe = px.probe;
    if (probe) f.selector = probe.selector;
    if (px.why) { f.triage = { class: "artifact", why: px.why }; continue; }

    f.pixel = { fg: px.fg, bg: px.bg, ratio: px.ratio, bgShare: px.bgShare, size: px.size };
    if (px.ratio >= PIXEL_OK) {
      f.triage = { class: "artifact", why: `rendered pixels read ${px.ratio}:1 (${px.fg} on ${px.bg}), so the computed-style math was wrong here` };
    } else if (probe.aria) {
      f.triage = { class: "flagged", why: "aria-hidden decoration" };
    } else if (!probe.wordy) {
      f.triage = { class: "flagged", why: `no letters or digits in "${probe.text}" — punctuation or an icon glyph` };
    } else if (probe.fontPx >= LARGE_PX && px.ratio >= 2.6) {
      f.triage = { class: "flagged", why: `${Math.round(probe.fontPx)}px display type at ${px.ratio}:1, just under the 3:1 large-text bar` };
    } else {
      f.triage = { class: "confirmed", why: `rendered pixels read ${px.ratio}:1 (${px.fg} on ${px.bg})` };
    }
  }
}

async function measure(s, route, limit = 150, app = null) {
  await navTo(s, route, app);
  /* re-assert after every navigation, including after a recovery reload, which
   * drops the freeze along with the rest of the document: a dropped freeze
   * silently reintroduces the mid-transition readings this exists to prevent */
  await s.evaluate(`window.__ui.freeze(true)`);
  await setTheme(s, "dark");
  const dark = JSON.parse(await s.evaluate(`JSON.stringify(window.__ui.contrast(${limit}))`));
  const via = await setTheme(s, "light");
  const light = JSON.parse(await s.evaluate(`JSON.stringify(window.__ui.contrast(${limit}))`));
  await setTheme(s, "dark");
  await s.evaluate(`window.__ui.freeze(false)`);
  return { dark, light, via };
}

async function themeSweep(s, entry, routes, app) {
  let toggleChecked = false;
  for (const route of routes) {
    let m;
    try { m = await measure(s, route, 150, app); }
    catch (e) {
      if (e.harnessFault) throw e;      // a dead browser is not a styling defect
      entry.failures.push({ route, symptom: "theme sweep failed", detail: e.message });
      continue;
    }
    /* the toggle is the same control on every route; report it once */
    if (!toggleChecked) {
      toggleChecked = true;
      if (m.via.theme !== "light") entry.failures.push({ route, symptom: "light theme could not be applied at all", detail: `data-theme stayed "${m.via.theme}"` });
      else if (/toggle did not reach it/.test(m.via.via)) entry.failures.push({ route, symptom: "#themeToggle does not switch the theme", detail: "three clicks left data-theme unchanged; the sweep set the attribute directly to continue" });
    }
    entry.themeRoutes++;
    entry.nodesMeasured += m.light.nodes.length;
    entry.unmeasurable += m.light.unmeasurable.length;
    const { failures, warnings } = classify(m.dark, m.light);
    /* triage while still on this route, in the state the finding was made in */
    if (TRIAGE && failures.length) {
      await s.evaluate(`window.__ui.freeze(true)`);
      await setTheme(s, "light");
      await verifyByPixels(s, failures);
      await setTheme(s, "dark");
      await s.evaluate(`window.__ui.freeze(false)`);
    }
    entry.ariaSkipped += m.light.skippedAriaHidden || 0;
    for (const f of failures) entry.failures.push({ route, ...f });
    for (const w of warnings) entry.warnings.push({ route, ...w });
    /* Node count drifting between themes means the flip re-rendered rather than
     * restyled; pairing is then unreliable and the reader should know. */
    if (m.dark.nodes.length !== m.light.nodes.length) {
      entry.warnings.push({
        route, symptom: "theme flip changed the node set",
        detail: `${m.dark.nodes.length} measurable in dark vs ${m.light.nodes.length} in light — dark/light pairing is partial on this route`,
      });
    }
  }
}

/*
 * One behaviour check. `advertised` decides severity, `feasible` decides
 * whether it is asked at all, and `run` returns null on success or the reason
 * it failed.
 */
async function keyboardSweep(s, entry, caps, lessonRoute, quizRoute) {
  const adv = caps.advertised;
  const checks = [];

  checks.push({
    name: "Cmd/Ctrl-K opens the command palette",
    id: "cmdk", advertised: adv.cmdk, feasible: caps.palette,
    async run() {
      const before = await s.evaluate(`window.__ui.parkFocus()`);
      await press(s, "cmdk");
      let open = await st(s);
      let via = "Cmd-K";
      if (!open.paletteOpen) { await press(s, "ctrlk"); open = await st(s); via = "Ctrl-K"; }
      if (!open.paletteOpen) return "neither Cmd-K nor Ctrl-K opened a palette";
      if (via === "Ctrl-K") entry.warnings.push({ route: lessonRoute, symptom: "palette opened on Ctrl-K but not Cmd-K", detail: "headless Chrome may not deliver Meta; treated as pass" });

      /* focus containment: Tab must not walk out of the dialog */
      open = await stFocused(s, "focusInPalette");
      if (open.focusInPalette) {
        await press(s, "tab");
        const tabbed = await st(s);
        if (!tabbed.focusInPalette) return `Tab moved focus out of the palette to ${tabbed.focus} — the dialog does not trap focus`;
      } else {
        entry.warnings.push({ route: lessonRoute, symptom: "palette does not take focus when opened", detail: `focus stayed on ${open.focus}; a keyboard user cannot reach the palette contents, so focus trapping is untestable` });
      }

      await press(s, "escape");
      const closed = await st(s);
      if (closed.paletteOpen) return "Escape did not close the palette";
      if (open.focusInPalette && closed.focus !== before) {
        return `focus was not restored on close: opened from ${before}, landed on ${closed.focus}`;
      }
      return null;
    },
  });

  checks.push({
    name: '"/" focuses the search box',
    id: "slash", advertised: adv.slash, feasible: caps.search,
    async run() {
      await s.evaluate(`window.__ui.blur()`);
      await press(s, "slash");
      const a = await st(s);
      if (!a.focusIsSearch) return `focus went to ${a.focus} instead of the search input`;
      /* and it must not have typed the slash into the page */
      await s.evaluate(`window.__ui.blur()`);
      return null;
    },
  });

  checks.push({
    name: '"?" opens the shortcuts modal',
    id: "help", advertised: adv.help, feasible: caps.help,
    async run() {
      const before = await s.evaluate(`window.__ui.parkFocus()`);
      await press(s, "question");
      let open = await st(s);
      if (!open.helpOpen) return "the shortcuts modal did not open";
      open = await stFocused(s, "focusInHelp");
      if (open.focusInHelp) {
        await press(s, "tab");
        const tabbed = await st(s);
        if (!tabbed.focusInHelp) return `Tab moved focus out of the modal to ${tabbed.focus} — the dialog does not trap focus`;
      } else {
        entry.warnings.push({ route: lessonRoute, symptom: "shortcuts modal does not take focus when opened", detail: `focus stayed on ${open.focus}` });
      }
      await press(s, "escape");
      const closed = await st(s);
      if (closed.helpOpen) return "Escape did not close the shortcuts modal";
      if (open.focusInHelp && closed.focus !== before) {
        return `focus was not restored on close: opened from ${before}, landed on ${closed.focus}`;
      }
      return null;
    },
  });

  checks.push({
    name: "A-E answers the visible quiz",
    id: "quizkeys", advertised: adv.quizkeys, feasible: !!quizRoute,
    async run() {
      await s.evaluate(`window.__ui.nav(${JSON.stringify(quizRoute)}).then(function(){return 1;})`, { awaitPromise: true });
      await s.evaluate(`window.__ui.blur()`);
      const before = await st(s);
      if (!before.quizPresent) return `no .q-opt rendered on ${quizRoute}`;
      if (before.quizAnswered) return `the quiz on ${quizRoute} was already answered before any key was sent`;
      await press(s, "a");
      const after = await st(s);
      if (!after.quizAnswered) return `"A" did not select an option`;
      return null;
    },
  });

  checks.push({
    name: "left/right move between lessons",
    id: "arrows", advertised: adv.arrows, feasible: !!lessonRoute,
    async run() {
      await s.evaluate(`window.__ui.nav(${JSON.stringify(lessonRoute)}).then(function(){return 1;})`, { awaitPromise: true });
      await s.evaluate(`window.__ui.blur()`);
      const start = await st(s);
      await press(s, "right");
      const fwd = await st(s);
      if (fwd.hash === start.hash) return `ArrowRight did not leave ${start.hash}`;
      await press(s, "left");
      const back = await st(s);
      if (back.hash !== start.hash) return `ArrowLeft went to ${back.hash} instead of back to ${start.hash}`;
      return null;
    },
  });

  for (const c of checks) {
    if (!c.feasible) { entry.keyboard.push({ id: c.id, name: c.name, result: "skip", why: "the app has no such surface" }); continue; }
    say(`       - ${c.name}`);
    await s.evaluate(`window.__ui.nav(${JSON.stringify(lessonRoute)}).then(function(){return 1;})`, { awaitPromise: true });
    let why = null;
    try { why = await c.run(); }
    catch (e) {
      if (e.harnessFault) throw e;
      why = "check threw: " + e.message;
    }
    await s.flush();
    for (const ev of s.take()) entry.failures.push({ route: lessonRoute, symptom: `${ev.kind} during "${c.name}"`, detail: ev.text });

    if (!why) {
      entry.keyboard.push({ id: c.id, name: c.name, result: "pass", advertised: c.advertised });
      if (!c.advertised) entry.warnings.push({ route: lessonRoute, symptom: `${c.name} — works but is not advertised anywhere in the UI`, detail: "no shortcuts modal row, chrome <kbd> hint or button label mentions it" });
    } else if (c.advertised) {
      entry.keyboard.push({ id: c.id, name: c.name, result: "FAIL", why });
      entry.failures.push({ route: lessonRoute, symptom: `advertised shortcut broken: ${c.name}`, detail: why });
    } else {
      entry.keyboard.push({ id: c.id, name: c.name, result: "absent", why });
      entry.warnings.push({ route: lessonRoute, symptom: `${c.name} — not implemented, and not advertised`, detail: why });
    }
  }

  /* A key the apps bind nowhere must move nothing. If this "fails", the state
   * probe is reacting to the act of pressing rather than to the app. */
  await s.evaluate(`window.__ui.nav(${JSON.stringify(lessonRoute)}).then(function(){return 1;})`, { awaitPromise: true });
  await s.evaluate(`window.__ui.blur()`);
  const q = await st(s);
  await press(s, "f13");
  const q2 = await st(s);
  if (q.hash !== q2.hash || q.paletteOpen !== q2.paletteOpen || q.helpOpen !== q2.helpOpen) {
    entry.failures.push({ route: lessonRoute, symptom: "an unbound key (F13) changed the app state", detail: `${JSON.stringify(q)} -> ${JSON.stringify(q2)}` });
  }
}

/* ============================================================== per-app run */

async function installHarness(s) {
  for (let i = 0; i < 3; i++) {
    await s.evaluate(HARNESS);
    if (await s.evaluate(`typeof window.__ui === "object" && typeof window.__ui.contrast === "function"`)) return true;
    await sleep(120);
  }
  return false;
}

async function prepare(s, app) {
  const url = `${BASE}/${app.dir}/index.html`;
  if (!(await boot(s, url))) return { ok: false, why: "app never booted" };
  await resetOrigin(s);
  s.take();
  if (!(await reload(s))) return { ok: false, why: "app never booted after a clean reload" };
  if (!(await installHarness(s))) return { ok: false, why: "UI harness would not install" };
  const disc = JSON.parse(await s.evaluate(`JSON.stringify(window.__ui.discover())`));
  if (!disc.lessons.length) return { ok: false, why: "no tracks registered yet (content still being authored)", authoring: true };
  return { ok: true, disc };
}

/* Routes worth the budget: widget-heavy first (the cut-out-text hazard lives
 * there), then note-heavy, spread across tracks so one track's styling cannot
 * stand in for the rest. */
function pickRoutes(lessons, n) {
  const scored = lessons.slice().sort((a, b) => (b.widgets * 3 + b.notes) - (a.widgets * 3 + a.notes));
  const perTrack = new Map(), out = [];
  for (const l of scored) {
    const c = perTrack.get(l.track) || 0;
    if (c >= Math.max(1, Math.ceil(n / 3))) continue;
    perTrack.set(l.track, c + 1);
    out.push(l.route);
    if (out.length >= n) break;
  }
  for (const l of scored) {
    if (out.length >= n) break;
    if (!out.includes(l.route)) out.push(l.route);
  }
  return out;
}

async function sweepApp(s, app) {
  const entry = {
    name: app.name, dir: app.dir,
    themeRoutes: 0, nodesMeasured: 0, unmeasurable: 0, ariaSkipped: 0,
    keyboard: [], failures: [], warnings: [], skipped: null, advertised: null,
  };
  say(`\n── ${app.name} (${app.dir}) ──`);
  if (!app.hasShell) { entry.skipped = "no index.html + js/app.js yet"; say(`   skipped — ${entry.skipped}`); return entry; }

  const prep = await prepare(s, app);
  if (!prep.ok) {
    if (prep.authoring) { entry.skipped = prep.why; say(`   skipped — ${entry.skipped}`); return entry; }
    entry.failures.push({ route: "#/", symptom: prep.why, detail: `${BASE}/${app.dir}/index.html` });
    say(`   FAIL — ${prep.why}`);
    return entry;
  }

  const caps = JSON.parse(await s.evaluate(`JSON.stringify(window.__ui.caps())`));
  entry.advertised = caps.advertised;
  if (!caps.themeToggle) entry.warnings.push({ route: "#/", symptom: "no #themeToggle in the chrome", detail: "the sweep set data-theme directly, so the app's own toggle path is unverified" });

  const routes = pickRoutes(prep.disc.lessons, SAMPLE);
  await themeSweep(s, entry, ["#/", ...routes], app);

  /* keyboard needs a lesson route, and a route that actually mounts a quiz */
  const lessonRoute = routes[0] || "#/";
  let quizRoute = null;
  for (const r of routes.slice(0, 6)) {
    await s.evaluate(`window.__ui.nav(${JSON.stringify(r)}).then(function(){return 1;})`, { awaitPromise: true });
    if ((await st(s)).quizPresent) { quizRoute = r; break; }
  }
  /* the quiz footer advertises its own answer keys, and that tip only exists on
   * a route with a quiz — so the advertised set has to be re-read there */
  if (quizRoute) {
    const onQuiz = JSON.parse(await s.evaluate(`JSON.stringify(window.__ui.caps())`)).advertised;
    for (const k of ["cmdk", "slash", "help", "arrows", "quizkeys", "escape"]) caps.advertised[k] = caps.advertised[k] || onQuiz[k];
    entry.advertised = caps.advertised;
  }
  await s.flush(); s.take();
  await keyboardSweep(s, entry, caps, lessonRoute, quizRoute);
  return entry;
}

/* ================================================================ self-test */

/*
 * Negative tests. Both gates are asked to detect a planted defect, and asked
 * NOT to flag a control case, because a check that reports everything is as
 * useless as one that reports nothing.
 */
async function selftest(s, app) {
  let bad = 0;
  /* printed as they run, not batched — a self-test that goes silent while it
   * hangs tells you nothing about which stage hung */
  const ok = (cond, what) => { console.log(`${cond ? "ok  " : "FAIL"} [selftest] ${what}`); if (!cond) bad++; };
  const stage = (what) => say(`     · ${what}`);

  stage(`booting ${app.dir}`);
  const prep = await prepare(s, app);
  if (!prep.ok) { console.log(`FAIL [selftest] ${app.dir}: ${prep.why}`); return 1; }

  /* ---- contrast: planted probes ---- */
  /* a widget-bearing route, so the probes are collected through the same
   * .widget-mount path as authored widget text rather than a .note-only path */
  const withWidget = prep.disc.lessons.find((l) => l.widgets > 0);
  const route = (withWidget && withWidget.route) || pickRoutes(prep.disc.lessons, 1)[0] || "#/";
  stage(`contrast probes on ${route}`);
  await s.evaluate(`window.__ui.nav(${JSON.stringify(route)}).then(function(){return 1;})`, { awaitPromise: true });
  await s.evaluate(`window.__ui.freeze(true)`);
  await setTheme(s, "light");
  const clean = JSON.parse(await s.evaluate(`JSON.stringify(window.__ui.contrast(400))`));
  await s.evaluate(`window.__ui.plantProbes()`);
  await s.evaluate(`window.__ui.tweenProbe()`);      // start a 4s colour fade
  const dirty = JSON.parse(await s.evaluate(`JSON.stringify(window.__ui.contrast(400))`));

  const find = (t) => {
    const hit = dirty.nodes.find((n) => n.text.indexOf(t) >= 0);
    if (!hit) {
      const why = dirty.unmeasurable.map((u) => u.why);
      say(`       (probe "${t}" was not measured; unmeasurable reasons on this route: ${[...new Set(why)].join("; ") || "none"})`);
    }
    return hit;
  };
  const pGone = find("probe near invisible"), pGood = find("probe readable"),
        pFaded = find("probe faded out"), pSvg = find("probe svg cutout");
  ok(pGone && pGone.ratio < GONE, `grey-on-white text is measured as invisible (${pGone ? pGone.ratio : "not found"}:1)`);
  ok(pSvg && pSvg.ratio < GONE, `SVG text on a <rect fill> backdrop is measured as invisible (${pSvg ? pSvg.ratio : "not found"}:1)`);
  ok(pFaded && pFaded.ratio < DIM, `text killed by ancestor opacity is caught (${pFaded ? pFaded.ratio : "not found"}:1)`);
  ok(pGood && pGood.ratio > 10, `readable text is NOT flagged (${pGood ? pGood.ratio : "not found"}:1)`);

  /* the backdrop must include the text's own element fill, not just ancestors' */
  const pCutOk = find("probe cutout readable"), pCutBad = find("probe cutout invisible");
  ok(pCutOk && pCutOk.ratio > 10,
    `dark cut-out text on its own accent fill reads as readable (${pCutOk ? pCutOk.ratio : "not found"}:1)`);
  ok(pCutBad && pCutBad.ratio < GONE,
    `same-colour text on its own accent fill is still caught (${pCutBad ? pCutBad.ratio : "not found"}:1)`);

  /* the measurement must see settled colours, not a frame of a transition */
  const pTween = find("probe transitioning away");
  ok(pTween && pTween.ratio < GONE,
    `a colour still mid-transition is measured at its settled value (${pTween ? pTween.ratio : "not found"}:1)`);
  ok(await s.evaluate(`window.__ui.freeze(false)`), "the transition freeze can be lifted again");

  /*
   * The classifier must react to the probes specifically. Asserting "the clean
   * route has zero failures" would be asserting the content is clean, which is
   * the gate's job to find out, not the self-test's premise — a real defect on
   * the probe route would then read as a broken tool.
   */
  const planted = classify(clean, dirty).failures.filter((f) => /probe /.test(f.detail));
  ok(planted.length >= 2, `the classifier turns the probes into failures (${planted.length} of them)`);

  /* aria-hidden decoration must never reach the classifier in the first place */
  ok(!find("probe aria hidden"), "aria-hidden text is not measured at all");
  ok((dirty.skippedAriaHidden || 0) >= 1, `and the skip is counted, not silent (${dirty.skippedAriaHidden || 0})`);

  /*
   * Triage on the planted set: the pixel check has to agree with the CSS math
   * about text that really is gone, and has to demote the punctuation-only
   * case. If it agreed with everything it would be decoration on the report;
   * if it disagreed with everything it would erase every real finding.
   */
  stage("triaging the planted failures from the rendered pixels");
  /* the punctuation probe has no word in it to match on — that is the point of
   * it — so the planted set is matched on the probe text OR that exact glyph run */
  const triaged = classify(clean, dirty).failures.filter((f) => /probe |\u2014 \u00b7 \u2014/.test(f.detail));
  await verifyByPixels(s, triaged);
  const byProbe = (t) => triaged.find((f) => (f.text || "").indexOf(t) >= 0);
  const tGone = byProbe("probe near invisible"), tPunct = byProbe("\u2014");
  ok(tGone && tGone.triage && tGone.triage.class === "confirmed",
    `grey-on-white text is confirmed by the pixels (${tGone && tGone.triage ? tGone.triage.class + ", rendered " + (tGone.pixel ? tGone.pixel.ratio : "?") + ":1" : "not triaged"})`);
  ok(tPunct && tPunct.triage && tPunct.triage.class === "flagged",
    `punctuation-only text is demoted to arguable (${tPunct && tPunct.triage ? tPunct.triage.class : "not triaged"})`);
  const artifacts = triaged.filter((f) => f.triage && f.triage.class === "artifact");
  ok(artifacts.length === 0,
    `no planted probe is dismissed as a harness artifact${artifacts.length ? " (" + artifacts.map((a) => a.triage.why).join("; ") + ")" : ""}`);

  /*
   * The control the first version of this lacked, and needed. Every failure it
   * triaged came back "rendered 1:1", which looks like agreement and was
   * actually the screenshot landing on a flat patch of page background: the
   * clip is in page coordinates and it was being handed viewport ones. Pointing
   * the same pixel path at text that is definitely readable is what catches
   * that class of error — a crop that misses its target cannot tell black text
   * on white from nothing at all.
   */
  const control = pGood && (await pixelProbe(s, pGood.key));
  ok(control && control.ratio > 8,
    `the pixel probe reads readable black-on-white text as readable (${control ? control.ratio + ":1 " + control.fg + " on " + control.bg : "no reading"})`);
  const gonePixels = pGone && (await pixelProbe(s, pGone.key));
  ok(gonePixels && gonePixels.ratio < GONE,
    `and reads the invisible probe as invisible (${gonePixels ? gonePixels.ratio + ":1" : "no reading"})`);
  const cleanVerdict = classify(clean, clean).failures.filter((f) => /probe /.test(f.detail));
  ok(cleanVerdict.length === 0, `with the probes gone the classifier stops reporting them (${cleanVerdict.length})`);

  /* the light-theme regression rule specifically: dim in light, fine in dark */
  const synthetic = classify(
    { nodes: [{ key: "k", ratio: 8.4, fg: "x", bg: "y", text: "cut-out label" }] },
    { nodes: [{ key: "k", ratio: 1.9, fg: "x", bg: "y", text: "cut-out label", inWidget: true, widget: "demo" }] });
  ok(synthetic.failures.some((f) => /light-theme contrast regression/.test(f.symptom)),
    "a node readable in dark but not in light is called a light-theme regression");
  const bothDim = classify(
    { nodes: [{ key: "k", ratio: 2.6, fg: "x", bg: "y", text: "muted caption" }] },
    { nodes: [{ key: "k", ratio: 2.6, fg: "x", bg: "y", text: "muted caption", inWidget: true, widget: "demo" }] });
  ok(!bothDim.failures.length && bothDim.warnings.length === 1,
    "a node equally dim in both themes is a warning, not a regression");
  ok(await s.evaluate(`window.__ui.pullProbes()`), "the probes leave no residue");
  await setTheme(s, "dark");

  /* ---- keyboard: sabotage every listener ---- */
  stage("finding a quiz route");
  const caps = JSON.parse(await s.evaluate(`JSON.stringify(window.__ui.caps())`));
  const lesson = route;
  let quizRoute = null;
  for (const r of pickRoutes(prep.disc.lessons, 6)) {
    await s.evaluate(`window.__ui.nav(${JSON.stringify(r)}).then(function(){return 1;})`, { awaitPromise: true });
    if ((await st(s)).quizPresent) { quizRoute = r; break; }
  }
  await s.flush(); s.take();

  /* the dialogs move focus on a timer, so the focus assertions poll. Prove the
   * poll waits: an immediate read must miss deferred focus and the polled read
   * must catch it. When both agree the "dialog does not take focus" warning is
   * either always or never emitted, and it fired on all six apps until this. */
  stage("deferred-focus probe");
  const fw = JSON.parse(await s.evaluate(`window.__ui.focusWaitProbe().then(JSON.stringify)`, { awaitPromise: true }));
  ok(fw.immediate === false, "an immediate read misses focus that arrives on a timer");
  ok(fw.polled === true, "the polled read catches it");

  stage("keyboard sweep, unsabotaged");
  const live = { keyboard: [], failures: [], warnings: [] };
  await keyboardSweep(s, live, caps, lesson, quizRoute);
  const advertisedIds = live.keyboard.filter((k) => k.result === "pass" && k.advertised).map((k) => k.id);
  ok(advertisedIds.length >= 2, `at least two advertised shortcuts pass unsabotaged (${advertisedIds.join(", ") || "none"})`);

  stage("keyboard sweep with keydown swallowed");
  await s.evaluate(`window.__ui.sabotage(true)`);
  const dead = { keyboard: [], failures: [], warnings: [] };
  await keyboardSweep(s, dead, caps, lesson, quizRoute);
  await s.evaluate(`window.__ui.sabotage(false)`);
  const stillPassing = dead.keyboard.filter((k) => advertisedIds.includes(k.id) && k.result === "pass").map((k) => k.id);
  ok(!stillPassing.length, `with keydown swallowed, every previously passing shortcut is reported broken${stillPassing.length ? " (still passing: " + stillPassing.join(", ") + ")" : ""}`);
  ok(dead.failures.length >= advertisedIds.length, `sabotage produces failures (${dead.failures.length})`);

  /* and the app is genuinely back to normal afterwards */
  stage("keyboard sweep after removing the sabotage");
  const back = { keyboard: [], failures: [], warnings: [] };
  await keyboardSweep(s, back, caps, lesson, quizRoute);
  const recovered = back.keyboard.filter((k) => advertisedIds.includes(k.id) && k.result === "pass").map((k) => k.id);
  ok(recovered.length === advertisedIds.length, `removing the sabotage restores every shortcut (${recovered.length}/${advertisedIds.length})`);

  return bad;
}

/* ==================================================================== main */

const main = async () => {
  startDeadline(Number(flag("deadline", 10)) * 60_000, "The UI sweep");
  const apps = discoverApps().filter((a) => !ONLY || a.dir === ONLY || a.name.toLowerCase() === String(ONLY).toLowerCase());
  if (!apps.length) { console.error(`no academy matched --app=${ONLY}`); process.exit(2); }

  const s = await Session.attach(CDP);
  const view = await viewport(s);
  if (view.width < MIN_WIDTH) {
    console.error(
      `the browser viewport is ${view.width}x${view.height}; below ${MIN_WIDTH}px the apps switch to\n` +
      `their mobile layout and the search box and sidebar are not reachable. Relaunch Chrome with\n` +
      `  --window-size=1440,1000\n` +
      `(tools/verify_all.sh already does this when it starts Chrome itself).`);
    s.close();
    process.exit(2);
  }

  if (flag("selftest", false)) {
    const target = apps.find((a) => a.hasShell);
    let bad = 1;
    try { bad = target ? await selftest(s, target) : 1; } finally { s.close(); }
    console.log(`\n${bad ? "FAILED" : "PASSED"}: UI-sweep self-test ${bad ? bad + " assertion(s) failed" : "all assertions hold"}.`);
    process.exit(bad ? 1 : 0);
  }

  const report = { base: BASE, viewport: view, thresholds: { invisible: GONE, regression: BROKEN, dim: DIM }, startedAt: new Date().toISOString(), apps: [] };
  try {
    for (const app of apps) {
      const entry = await sweepApp(s, app);
      report.apps.push(entry);
      if (entry.skipped) continue;
      const kb = entry.keyboard;
      say(`   ${entry.themeRoutes} route(s) swept in both themes · ${entry.nodesMeasured} text node(s) measured` +
          (entry.unmeasurable ? ` · ${entry.unmeasurable} unmeasurable` : "") +
          ` · keyboard ${kb.filter((k) => k.result === "pass").length}/${kb.filter((k) => k.result !== "skip").length} pass`);
      for (const k of kb) {
        if (k.result === "pass") continue;
        say(`   ${k.result === "FAIL" ? "FAIL" : "note"} ${k.name}${k.why ? " — " + k.why : ""}`);
      }
      /*
       * Printed one line per colour pair, not per text node. A single bad token
       * lands on every label that uses it — one real cause showed up as 97
       * failures — and a wall of near-identical lines reads as noise, which is
       * how a genuine defect gets scrolled past. The per-node detail stays in
       * the JSON report.
       */
      for (const g of groupByCause(entry.failures)) {
        console.log(`   FAIL ${g.symptom}  ${g.colours}\n        ${g.count} text node(s) on ${g.routes} route(s), e.g. ${g.example}`);
      }
      if (TRIAGE) {
        const conf = entry.failures.filter((f) => f.triage && f.triage.class === "confirmed");
        const flagged = entry.failures.filter((f) => f.triage && f.triage.class === "flagged");
        const art = entry.failures.filter((f) => f.triage && f.triage.class === "artifact");
        console.log(`   triage: ${conf.length} confirmed unreadable · ${flagged.length} flagged but arguable · ` +
          `${art.length} harness artifact${entry.ariaSkipped ? ` · ${entry.ariaSkipped} aria-hidden node(s) not measured` : ""}`);
        for (const f of conf.slice(0, 4)) {
          console.log(`     confirmed  ${f.route}  ${f.selector || "?"}\n` +
            `                "${f.text}" — computed ${f.lightRatio}:1, rendered ${f.pixel ? f.pixel.ratio : "?"}:1 ` +
            `(${f.pixel ? f.pixel.fg + " on " + f.pixel.bg : "?"}), dark theme ${f.darkRatio}:1`);
        }
        if (conf.length > 4) console.log(`     ... ${conf.length - 4} more confirmed (see ${OUT})`);
        for (const f of art.slice(0, 3)) console.log(`     artifact   ${f.route}  ${f.selector || "?"} — ${f.triage.why}`);
      }
      for (const w of entry.warnings.slice(0, 8)) console.log(`   warn ${line(w)}`);
      if (entry.warnings.length > 8) console.log(`   ... ${entry.warnings.length - 8} more warning(s) (see ${OUT})`);
    }
  } finally {
    s.close();
  }

  const rows = report.apps.map((a) => ({
    app: a.name,
    routes: a.themeRoutes,
    nodes: a.nodesMeasured,
    unmeas: a.unmeasurable,
    keys: a.keyboard.filter((k) => k.result !== "skip").length,
    pass: a.keyboard.filter((k) => k.result === "pass").length,
    fails: a.failures.length,
    warns: a.warnings.length,
    note: a.skipped || "",
  }));
  const cols = ["app", "routes", "nodes", "unmeas", "keys", "pass", "fails", "warns", "note"];
  const w = {};
  for (const c of cols) w[c] = Math.max(c.length, ...rows.map((r) => String(r[c]).length));
  console.log("\n" + cols.map((c) => c.padEnd(w[c])).join("  "));
  console.log(cols.map((c) => "-".repeat(w[c])).join("  "));
  for (const r of rows) console.log(cols.map((c) => String(r[c]).padEnd(w[c])).join("  "));

  const failures = report.apps.reduce((n, a) => n + a.failures.length, 0);
  const warnings = report.apps.reduce((n, a) => n + a.warnings.length, 0);
  report.totals = { failures, warnings, skipped: report.apps.filter((a) => a.skipped).map((a) => a.dir) };

  if (TRIAGE) {
    const count = (a, k) => a.failures.filter((f) => f.triage && f.triage.class === k).length;
    const trows = report.apps.filter((a) => !a.skipped).map((a) => ({
      app: a.name, fails: a.failures.length, confirmed: count(a, "confirmed"),
      flagged: count(a, "flagged"), artifact: count(a, "artifact"), ariaSkipped: a.ariaSkipped,
    }));
    const tc = ["app", "fails", "confirmed", "flagged", "artifact", "ariaSkipped"];
    const tw = {};
    for (const c of tc) tw[c] = Math.max(c.length, ...trows.map((r) => String(r[c]).length));
    console.log("\ntriage — every contrast failure re-measured from the rendered pixels");
    console.log(tc.map((c) => c.padEnd(tw[c])).join("  "));
    console.log(tc.map((c) => "-".repeat(tw[c])).join("  "));
    for (const r of trows) console.log(tc.map((c) => String(r[c]).padEnd(tw[c])).join("  "));
    report.totals.triage = {
      confirmed: trows.reduce((n, r) => n + r.confirmed, 0),
      flagged: trows.reduce((n, r) => n + r.flagged, 0),
      artifact: trows.reduce((n, r) => n + r.artifact, 0),
    };
    console.log(`\nconfirmed unreadable: ${report.totals.triage.confirmed} · arguable: ${report.totals.triage.flagged} · artifacts: ${report.totals.triage.artifact}`);
  }
  report.finishedAt = new Date().toISOString();
  writeFileSync(OUT, JSON.stringify(report, null, 2));

  console.log(`\n${failures ? "FAILED" : "PASSED"}: ${failures} failure(s), ${warnings} warning(s)` +
    `${report.totals.skipped.length ? ` · skipped ${report.totals.skipped.join(", ")}` : ""}`);
  console.log(`report: ${OUT}`);
  process.exit(failures ? 1 : 0);
};

main().catch((e) => {
  if (e && e.harnessFault) { reportFault(e, "The UI sweep"); process.exit(HARNESS_FAULT); }
  console.error("ui sweep error: " + (e && e.message || e));
  process.exit(2);
});
