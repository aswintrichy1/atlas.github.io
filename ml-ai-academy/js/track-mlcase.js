/* =====================================================================
   SYNAPSE · ML Problem Breakdowns
   window.TRACKS.mlcase  +  QUIZZES["mlcase-*"]  +  Widgets.mlcaseThreshold

   Seven full design walkthroughs. Every lesson runs the same eight beats:
     1. the ask + clarifying questions      5. high-level design (offline/online)
     2. requirements as measured targets    6. data, features, label
     3. objective ladder  Naive/Solid/Standout    7. evaluation + deep dives
     4. model ladder      Naive/Solid/Standout    8. Mid/Senior/Staff bar + key note

   The concepts these pages apply live in the mlsd track; this track is where
   you spend them on real problems.
   ===================================================================== */
(function () {
  "use strict";

  /* ==================================================================
     WIDGETS OWNED BY THIS FILE
     ================================================================== */
  var Widgets = {};

  function h(tag, attrs) {
    var el = document.createElement(tag), k, i, kid;
    if (attrs) {
      for (k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        if (attrs[k] == null) continue;
        if (k === "class") el.className = attrs[k];
        else if (k === "html") el.innerHTML = attrs[k];
        else if (k === "text") el.textContent = attrs[k];
        else if (k.indexOf("on") === 0 && typeof attrs[k] === "function") el.addEventListener(k.slice(2), attrs[k]);
        else el.setAttribute(k, attrs[k]);
      }
    }
    for (i = 2; i < arguments.length; i++) {
      kid = arguments[i];
      if (kid == null) continue;
      el.appendChild(typeof kid === "string" ? document.createTextNode(kid) : kid);
    }
    return el;
  }

  function fmt(n) {
    var s = String(Math.round(n)), out = "", c = 0, i;
    for (i = s.length - 1; i >= 0; i--) {
      out = s.charAt(i) + out;
      c++;
      if (c % 3 === 0 && i > 0) out = "," + out;
    }
    return out;
  }
  function pct(x) { return (Math.round(x * 1000) / 10).toFixed(1) + "%"; }

  /* ---- fixed synthetic score distributions (20 bins of width 0.05) ----
     pos[i] / neg[i] = count of truly-positive / truly-negative items whose
     model score fell in bin i, i.e. in [i/20, (i+1)/20).
     Each array is built so per-bin precision rises monotonically with the
     score. That guarantees the pedagogy holds: raising the threshold always
     raises precision and always lowers recall. Numbers are illustrative,
     not measurements. */
  var BINS = 20, BAND = 3; /* review band = 3 bins = 0.15 wide, below the cut */

  var SCENARIOS = [
    {
      key: "harm",
      tab: "harmful content",
      unit: "posts",
      floor: 0.95,
      cap: 3000,
      bandName: "queued for human review",
      wrong: "authors whose posts were taken down for nothing",
      slip: "harmful posts stay up and keep collecting views",
      neg: [46000, 20000, 12000, 7000, 4500, 3000, 2000, 1400, 950, 650, 430, 300, 200, 140, 95, 60, 40, 24, 12, 4],
      pos: [4, 6, 9, 13, 18, 25, 34, 46, 62, 80, 100, 120, 140, 160, 180, 200, 230, 280, 350, 420]
    },
    {
      key: "bot",
      tab: "bot detection",
      unit: "accounts",
      floor: 0.98,
      cap: 1500,
      bandName: "sent a challenge / rate limit",
      wrong: "real people locked out of their own accounts",
      slip: "automated accounts keep operating at full speed",
      neg: [38000, 19000, 12000, 8000, 5500, 4000, 3000, 2200, 1600, 1150, 820, 580, 400, 280, 190, 130, 85, 50, 25, 8],
      pos: [10, 15, 24, 38, 60, 95, 150, 230, 330, 450, 560, 640, 690, 700, 660, 580, 470, 340, 200, 90]
    },
    {
      key: "ad",
      tab: "ad click",
      unit: "impressions",
      floor: 0,
      cap: 0,
      bandName: "bid discounted",
      wrong: "advertisers paying for impressions that were never going to convert",
      slip: "impressions that would have paid for themselves are thrown away",
      neg: [16000, 15000, 13500, 12000, 10000, 8000, 6200, 4600, 3300, 2300, 1600, 1050, 700, 450, 280, 170, 100, 55, 25, 8],
      pos: [120, 180, 260, 380, 520, 700, 880, 1000, 1050, 1000, 880, 720, 560, 420, 300, 210, 140, 85, 45, 15]
    }
  ];

  function tally(sc, ti) {
    var i, tp = 0, fp = 0, band = 0, missed = 0, posAll = 0, all = 0;
    var lowEdge = ti - BAND; if (lowEdge < 0) lowEdge = 0;
    for (i = 0; i < BINS; i++) {
      posAll += sc.pos[i];
      all += sc.pos[i] + sc.neg[i];
      if (i >= ti) { tp += sc.pos[i]; fp += sc.neg[i]; }
      else if (i >= lowEdge) { band += sc.pos[i] + sc.neg[i]; }
      else { missed += sc.pos[i]; }
    }
    var actioned = tp + fp;
    return {
      tp: tp, fp: fp, actioned: actioned, band: band, missed: missed,
      posAll: posAll, all: all,
      prevalence: all > 0 ? posAll / all : 0,
      precision: actioned > 0 ? tp / actioned : null,
      recall: posAll > 0 ? tp / posAll : 0
    };
  }

  /* best precision any threshold can reach: keep only the top-scoring bin */
  function ceilingPrecision(sc) {
    var i = BINS - 1, d = sc.pos[i] + sc.neg[i];
    return d > 0 ? sc.pos[i] / d : 0;
  }

  function verdictFor(sc, ti, s) {
    var t = (ti / BINS).toFixed(2), out, ratio, ceil;
    if (s.actioned === 0) {
      return "At " + t + " nothing is auto-actioned at all: recall is 0% and precision is undefined because you never predict positive. " +
        "A threshold of 1.00 is not a conservative policy, it is the decision not to ship the model.";
    }
    if (ti === 0) {
      out = "At 0.00 you action every scored item, so precision collapses to the base rate of " + pct(s.prevalence) +
        " and recall is 100% by construction. " + fmt(s.fp) + " " + sc.unit + " are actioned wrongly, and the whole cost lands on " + sc.wrong + ".";
      if (sc.key === "ad") out += " For an auction this is doubly wrong: a hard cut throws away the very quantity the auction runs on \u2014 the probability itself.";
      return out;
    }
    out = "At " + t + " you auto-action " + fmt(s.actioned) + " " + sc.unit + " and hold " + fmt(s.band) + " in the band below the cut (" + sc.bandName + "). ";
    if (sc.floor <= 0) {
      out += "Precision of " + pct(s.precision) + " against recall of " + pct(s.recall) + " is the trade at this cut, and " +
        fmt(s.missed) + " " + sc.unit + " that would have paid off are dropped below the band entirely.";
    } else if (s.precision < sc.floor) {
      out += "Precision of " + pct(s.precision) + " is under the " + pct(sc.floor) + " floor policy asked for, so about " +
        fmt(s.fp) + " of what you actioned is wrong \u2014 that cost lands on " + sc.wrong + ", who did not opt into your error budget.";
    } else {
      out += "Precision of " + pct(s.precision) + " clears the floor, but recall is only " + pct(s.recall) + ": " +
        fmt(s.missed) + " truly positive " + sc.unit + " fall below the band and are never looked at, so " + sc.slip + ".";
    }
    if (sc.cap > 0) {
      ratio = Math.round((s.band / sc.cap) * 10) / 10;
      if (ratio >= 1.5) {
        out += " And the band is " + ratio + "\u00d7 the stated review capacity of " + fmt(sc.cap) +
          "/day, so most of it is queue theatre \u2014 items age out unreviewed.";
      } else if (s.band > sc.cap) {
        out += " The band is a little over the stated review capacity of " + fmt(sc.cap) + "/day, so its tail ages out unreviewed.";
      } else {
        out += " The band fits inside the stated review capacity of " + fmt(sc.cap) + "/day, so a human actually sees all of it.";
      }
    }
    ceil = ceilingPrecision(sc);
    if (sc.floor > 0 && sc.floor > ceil) {
      out += " Worth noticing: no threshold on this distribution reaches the " + pct(sc.floor) + " floor \u2014 the best this score can do is " +
        pct(ceil) + ". That is a finding, not a tuning problem: at this separation the harshest action is not automatable, and the top of the ladder has to be a challenge or a human.";
    }
    if (sc.key === "ad") {
      out += " Remember the framing though: an auction wants the calibrated probability, not a yes/no \u2014 a threshold here is a blunt instrument for a job that needs a number.";
    }
    return out;
  }

  Widgets.mlcaseThreshold = function (mount) {
    mount.classList.add("widget");

    mount.appendChild(h("div", { class: "widget-head" },
      h("span", { class: "w-pill" }, "policy lab"),
      h("h3", {}, "Where do you set the threshold?")));
    mount.appendChild(h("p", { class: "widget-desc" },
      "One fixed score distribution per scenario, roughly 100,000 scored items. Move the cut and watch who pays for it. " +
      "Items scoring within 0.15 below the cut go to the second tier; truly positive items below that band are seen by nobody."));

    var idx = 0, ti = 14; /* default scenario = harmful content, threshold 0.70 */

    var seg = h("div", { class: "w-seg" });
    var segBtns = [];
    var i;
    for (i = 0; i < SCENARIOS.length; i++) {
      (function (n) {
        var b = h("button", {
          class: "w-seg-btn" + (n === idx ? " active" : ""),
          type: "button",
          onclick: function () { idx = n; paint(); }
        }, SCENARIOS[n].tab);
        segBtns.push(b);
        seg.appendChild(b);
      })(i);
    }

    var slider = h("input", {
      type: "range", min: "0", max: "20", step: "1", value: String(ti),
      "aria-label": "decision threshold"
    });
    slider.addEventListener("input", function () { ti = parseInt(slider.value, 10) || 0; paint(); });
    slider.addEventListener("change", function () { ti = parseInt(slider.value, 10) || 0; paint(); });

    var tEcho = h("b", { style: "font-family:var(--font-mono);color:var(--accent-ink)" }, "0.70");
    var down = h("button", { class: "w-btn", type: "button", onclick: function () { ti = Math.max(0, ti - 1); paint(); } }, "\u2212 0.05");
    var up = h("button", { class: "w-btn", type: "button", onclick: function () { ti = Math.min(BINS, ti + 1); paint(); } }, "+ 0.05");

    mount.appendChild(h("div", { class: "widget-controls" },
      seg,
      h("label", { class: "w-field" }, "threshold ", slider, tEcho),
      down, up));

    var roPrec = h("div", { class: "ro" });
    var roRec = h("div", { class: "ro" });
    var roAct = h("div", { class: "ro" });
    var roBand = h("div", { class: "ro" });
    var roMiss = h("div", { class: "ro" });
    var readout = h("div", { class: "w-readout" }, roPrec, roRec, roAct, roBand, roMiss);
    var verdict = h("p", { style: "margin:14px 0 0;font-size:0.86rem;line-height:1.6;color:var(--text-dim)" });

    mount.appendChild(h("div", { class: "w-stage" }, readout, verdict));

    function paint() {
      var sc, s, j;
      try {
        if (ti < 0) ti = 0;
        if (ti > BINS) ti = BINS;
        if (idx < 0 || idx >= SCENARIOS.length) idx = 0;
        sc = SCENARIOS[idx];
        s = tally(sc, ti);

        for (j = 0; j < segBtns.length; j++) {
          segBtns[j].className = "w-seg-btn" + (j === idx ? " active" : "");
        }
        slider.value = String(ti);
        tEcho.textContent = (ti / BINS).toFixed(2);

        roPrec.innerHTML = "<b>" + (s.precision === null ? "n/a" : pct(s.precision)) + "</b> precision";
        roRec.innerHTML = "<b>" + pct(s.recall) + "</b> recall";
        roAct.innerHTML = "<b>" + fmt(s.actioned) + "</b> auto-actioned";
        roBand.innerHTML = "<b>" + fmt(s.band) + "</b> second tier";
        roMiss.innerHTML = "<b>" + fmt(s.missed) + "</b> missed, unseen";
        verdict.textContent = verdictFor(sc, ti, s);
      } catch (e) {
        verdict.textContent = "Threshold lab could not compute this setting.";
      }
    }

    paint();
  };

  window.Widgets = Object.assign(window.Widgets || {}, Widgets);

  /* ==================================================================
     QUIZZES OWNED BY THIS FILE
     ================================================================== */
  window.QUIZZES = Object.assign(window.QUIZZES || {}, {

    "mlcase-recsys": {
      title: "Recommendation & ranking checkpoint",
      sub: "Objectives, two-stage serving, cold start, multi-objective scores, and calibration.",
      questions: [
        {
          q: "You are recommending videos on a home surface. Why is total watch time a flawed objective even though it beats clicks?",
          options: [
            "It systematically favours long videos and under-rewards short content the viewer was completely satisfied by",
            "It cannot be logged reliably from mobile clients",
            "It is not differentiable, so no model can be trained against it",
            "It correlates too weakly with clicks to be a usable label"
          ],
          answer: 0,
          explain: "Watch time is measured in seconds, so a two-hour video that half-holds attention outscores a ninety-second clip that fully answered the viewer's need. "
            + "The objective therefore pushes the catalogue toward length rather than toward satisfaction. The fix is not to abandon watch time but to normalise it by duration "
            + "and combine it with explicit satisfaction signals."
        },
        {
          q: "In a two-tower retrieval model, why can the item tower not consume user\u00d7item cross features?",
          options: [
            "Cross features leak the label into the training set",
            "The item embedding has to be independent of the request so it can be computed in advance and loaded into an approximate-nearest-neighbour index",
            "Cross features make the towers too small to train stably",
            "The vector index only accepts sparse inputs"
          ],
          answer: 1,
          explain: "The whole economic argument for two towers is that the item side is precomputed once for the entire catalogue and searched with an ANN index in milliseconds. "
            + "A feature that depends on the requesting user would force you to recompute item vectors per request, which is exactly the cost the architecture exists to avoid. "
            + "Cross features belong in the ranker, which only scores a few hundred candidates."
        },
        {
          q: "A creator uploads a video with zero engagement history. Which mechanism actually gets it into recommendations?",
          options: [
            "Hold it out of the candidate pool until its engagement statistics are stable",
            "Increase the ranker's regularisation so sparse-history items are not penalised",
            "Embed it from content and creator features so it is retrievable immediately, and reserve an exploration budget so it can earn engagement signal",
            "Serve it only to users who opted into seeing new uploads"
          ],
          answer: 2,
          explain: "Cold start is two problems: the item must be representable without behavioural features, and it must receive impressions before it can accumulate them. "
            + "Content and creator features solve the first; a deliberately reserved slice of traffic solves the second. Waiting for engagement to stabilise is circular \u2014 "
            + "engagement never arrives if the item is never shown."
        },
        {
          q: "Your feed ranker scores items as a weighted sum of several predicted actions. What determines the weights?",
          options: [
            "Fitting them by minimising log loss on the training set",
            "Choosing them so the predicted action probabilities sum to one",
            "Copying them from the retrieval stage's scoring function",
            "They encode product policy, so you set them deliberately and validate them in an online experiment"
          ],
          answer: 3,
          explain: "Engagement logs can tell you how likely each action is, but they contain no information about how much each action is worth \u2014 that is a judgement about what the "
            + "product is for. So the weights are a policy artefact, argued for explicitly and then tested online. Fitting them to the same logs just re-derives whatever the "
            + "current system already rewards."
        },
        {
          q: "A feed must be able to rank items created seconds ago. What does that do to the serving design?",
          options: [
            "Heavy precomputation of ranked feeds is incompatible with second-old items, so the fresh path has to compute features and score at request time",
            "Nothing, as long as ranked feeds are precomputed hourly for every user",
            "Freshness constrains retrieval only; ranking is unaffected",
            "Fresh items should be held out of ranking until their engagement features are dense"
          ],
          answer: 0,
          explain: "Precomputation and freshness pull in opposite directions: anything you computed an hour ago cannot know about an item that is one minute old. "
            + "Systems that need both typically precompute the slow, stable part of the candidate set and merge a request-time fresh path on top. "
            + "Holding fresh items back is the same cold-start trap in a different costume."
        },
        {
          q: "Why does an ad auction need a calibrated click probability, when a ranker only needs the right order?",
          options: [
            "Because a ranker's ordering is unstable unless the scores are calibrated",
            "Because expected value is bid \u00d7 predicted click probability, so a mis-scaled probability misprices every auction even when the ordering is perfect",
            "Because uncalibrated models cannot meet a low latency budget",
            "Because calibration is required in order to compute ROC-AUC"
          ],
          answer: 1,
          explain: "Ranking cares only about relative order, so any monotone transform of the scores is harmless. An auction multiplies the probability by a bid and charges money "
            + "against the result, so the number itself has to mean what it says. This is why negative downsampling has to be corrected for, and why calibration error is tracked "
            + "as an operational metric rather than an afterthought."
        },
        {
          q: "Clicks on ads are rare \u2014 well under a few percent of impressions. Why is PR-AUC (average precision) more informative than ROC-AUC here?",
          options: [
            "ROC-AUC cannot be computed when classes are imbalanced",
            "PR-AUC has a fixed baseline of 0.5, which makes comparison easier",
            "The false-positive rate has an enormous denominator, so thousands of extra false positives barely move ROC-AUC, while precision reacts to them directly",
            "PR-AUC is threshold-free whereas ROC-AUC requires a chosen threshold"
          ],
          answer: 2,
          explain: "ROC-AUC pairs recall against FP/(all negatives). When negatives outnumber positives by a hundred to one, a huge absolute number of false positives is a tiny "
            + "fraction of that denominator, so the curve looks flattering. Precision divides by the predictions you actually made, so it tracks the cost you actually pay. "
            + "Note the baselines invert the claim in option 2: PR-AUC's baseline is the prevalence, ROC-AUC's is 0.5."
        }
      ]
    },

    "mlcase-trust": {
      title: "Trust & safety checkpoint",
      sub: "Exposure-weighted objectives, threshold policy, label noise, and adversaries that retrain against you.",
      questions: [
        {
          q: "Which objective is the strongest framing for a harmful-content system?",
          options: [
            "Maximise classification accuracy on a class-balanced sample",
            "Remove as much harmful content as the model can find",
            "Maximise recall at whatever review-queue size the team can staff",
            "Minimise views of harmful content subject to a precision floor"
          ],
          answer: 3,
          explain: "Accuracy is close to meaningless at low prevalence, and unbounded removal has an unbounded false-positive bill. The precision floor is what bounds the harm you "
            + "do to innocent authors, and weighting by views is what aligns the objective with the actual damage, which is proportional to exposure rather than to item count. "
            + "Option 4 is a real improvement over the first two but still treats a viral post and an unseen one as equals."
        },
        {
          q: "You raise the auto-action threshold on a well-behaved score. What happens?",
          options: [
            "Precision rises and recall falls",
            "Precision falls and recall rises",
            "Both rise, because you are actioning fewer items",
            "Both fall, because the model has fewer examples to learn from"
          ],
          answer: 0,
          explain: "A higher bar means you only act on items the model is more confident about, so a larger share of what you action is genuinely positive \u2014 precision goes up. "
            + "But the items you no longer action include true positives, so recall goes down. Recall is monotone in the threshold by definition; precision rises whenever "
            + "higher scores really do carry a higher positive rate, which is what a usefully ranked score means."
        },
        {
          q: "Who should own the value of the removal threshold?",
          options: [
            "The model \u2014 whatever value maximises F1 on the validation set",
            "Policy and legal, because the threshold sets the exchange rate between posts removed in error and harmful posts left up",
            "The on-call engineer, tuned per incident",
            "The annotation vendor, derived from inter-rater agreement"
          ],
          answer: 1,
          explain: "The model supplies a ranked score; choosing where to cut is a statement about how many wrongful removals one prevented harm is worth, and that is a policy "
            + "judgement with legal and regional dimensions. F1 silently asserts that precision and recall matter equally, which is almost never the policy anyone would defend "
            + "out loud. Your job is to hand policy an honest precision/recall curve and implement whatever they choose."
        },
        {
          q: "What is the honest characterisation of labels in a moderation system?",
          options: [
            "Reports arrive essentially instantly, so label delay is not a real concern",
            "Reviewer disagreement disappears under majority vote, after which labels are exact",
            "Labels arrive late and skew toward content that got attention, so a naive recent-window training set over-represents viral items and barely sees unreported harm",
            "Enforcement actions have no effect on future training data"
          ],
          answer: 2,
          explain: "A post has to be seen before it is reported and reviewed before it is labelled, so your freshest data is also your least complete, and what does get labelled is "
            + "biased toward whatever was distributed widely. Majority vote reduces variance but cannot fix a genuinely ambiguous policy boundary. And enforcement truncates the "
            + "signal: content you removed generates no further engagement, which changes the distribution your next model trains on."
        },
        {
          q: "Your bot classifier's precision decays steadily after each deploy. What is the correct reading?",
          options: [
            "A model that generalises properly would not decay, because account behaviour is stationary",
            "Decay is a data-quality defect and should be fixed by cleaning the training set",
            "Decay is avoided by freezing the model so attackers cannot probe it",
            "The opponent adapts to whatever you ship, so the distribution moves because you deployed \u2014 retraining cadence and drift monitoring are design requirements, not maintenance chores"
          ],
          answer: 3,
          explain: "In an adversarial setting your deployment is an intervention on the data-generating process: the cheapest evasions are the ones your current model punishes, so "
            + "operators move off them first. That means measured decay is expected behaviour, not a bug, and the design has to include how fast you can retrain and how you detect "
            + "the shift. Freezing the model only guarantees that the evasion, once found, works forever."
        },
        {
          q: "How should the asymmetric cost of false positives shape a bot-detection design?",
          options: [
            "Because a false positive locks a real person out, hard actions need a high precision floor, softer challenges can run at lower confidence, and appeals both remedy errors and supply hard labels",
            "An appeals path is a support-team concern and sits outside the ML design",
            "Appeals should be routed back to the model that made the decision, for consistency",
            "False positives and false negatives cost the same, so a symmetric cut at 0.5 is the neutral choice"
          ],
          answer: 0,
          explain: "Losing an account is a severe, personal harm, while a missed bot is a diffuse cost \u2014 so the action ladder should match confidence: challenge in the middle band, "
            + "suspend only at the top. Appeals matter twice over: they are the remedy that makes a high-severity action defensible, and overturned decisions are precisely the hard "
            + "negatives your next training round needs most."
        }
      ]
    },

    "mlcase-retrieval": {
      title: "Search & retrieval checkpoint",
      sub: "Hybrid retrieval, click bias, chunking, groundedness, and where the latency actually goes.",
      questions: [
        {
          q: "Why does hybrid lexical + dense retrieval usually beat either one alone?",
          options: [
            "Dense retrieval is strictly better; hybrid survives only because inverted indexes are already deployed",
            "Lexical matching nails rare exact tokens like error codes and part numbers, dense retrieval handles paraphrase and intent, and their failure modes are largely uncorrelated",
            "Running both halves the latency of running either",
            "Lexical retrieval is a prerequisite for computing the embeddings"
          ],
          answer: 1,
          explain: "A dense encoder maps meaning, which is exactly why an unusual literal string can get smeared into a neighbourhood of vaguely similar text. "
            + "An inverted index has the opposite profile: perfect on the literal token, blind to a synonym. Fusing them recovers most of both, at the cost of running and tuning "
            + "two retrieval systems and a fusion step."
        },
        {
          q: "What is position bias in click logs?",
          options: [
            "Users click lower results more often because they scan the whole page before deciding",
            "Clicks are a fair sample of relevance provided the sample is large enough",
            "A result is clicked partly because it was placed high, so training on raw clicks teaches the model to reproduce the ranking it was shown",
            "It affects paid results only, never organic ones"
          ],
          answer: 2,
          explain: "Click probability factors roughly into whether the user examined the result and whether they found it relevant, and examination falls steeply with rank. "
            + "So a click on position one is weak evidence of relevance and no click on position nine is weak evidence of irrelevance. Trained naively, the model learns the "
            + "incumbent ranking, and the loop closes."
        },
        {
          q: "Which mechanism actually debiases click training data?",
          options: [
            "Discard every click below position three",
            "Train on impressions rather than clicks",
            "Normalise click counts by query frequency",
            "Weight each click by the inverse of the estimated probability that its position was examined, with those propensities estimated from deliberate randomisation"
          ],
          answer: 3,
          explain: "Inverse-propensity weighting treats the log as a biased sample and reweights it: a click at a rarely examined position counts for more than one at the top. "
            + "The propensities have to come from somewhere, which is why teams run small randomised swaps or interleaving experiments to measure examination by position. "
            + "Truncating positions throws away the very tail that carries the new information."
        },
        {
          q: "How does chunk size affect a retrieval-augmented assistant?",
          options: [
            "It trades retrieval precision against answer completeness: too small and the passage loses the context that made it answerable, too large and one vector averages several topics",
            "Smaller is always better, because shorter text produces a more precise embedding",
            "It affects storage cost only, never retrieval quality",
            "Chunks must land on a fixed token count or the reranker cannot score them"
          ],
          answer: 0,
          explain: "A chunk is simultaneously the unit you match against and the unit you hand to the generator, and those two jobs want different sizes. "
            + "Fragments retrieve sharply but arrive without the surrounding definition or caveat; long chunks are semantically muddy and burn context. "
            + "Splitting on document structure and expanding a retrieved fragment to its parent section is the usual way to stop choosing."
        },
        {
          q: "You have to report a hallucination rate. What is the workable approach?",
          options: [
            "Use fluency or helpfulness scores as a proxy for groundedness",
            "Break the answer into individual claims and check each against the retrieved passages, then human-audit a sample to calibrate whatever automatic judge you use",
            "Accept that it is unmeasurable and reduce it with prompt instructions instead",
            "Compare the answer against the same model's answer without retrieval"
          ],
          answer: 1,
          explain: "Groundedness is a property of individual assertions, so the unit of evaluation has to be the claim, not the response. An automated judge makes this affordable, "
            + "but a judge is a model with its own error rate, so you need a human-labelled slice to know how much to trust it. Fluency is actively misleading here: the most "
            + "dangerous hallucinations are the well-written ones."
        },
        {
          q: "Where does the latency budget in a RAG request usually go?",
          options: [
            "Retrieval dominates, so the reranker is the first thing to cut",
            "Latency is fixed by the vector index and cannot meaningfully be budgeted",
            "Generation usually dominates end to end, so you budget retrieval and reranking tightly and stream tokens so time-to-first-token is what the user feels",
            "Adding a reranker lowers total latency, because it shortens the prompt"
          ],
          answer: 2,
          explain: "Vector search over a well-built index is fast, and a cross-encoder over a few dozen candidates is bounded; producing a few hundred tokens is not. "
            + "That is why the useful target is time-to-first-token plus a streaming rate, rather than a single end-to-end number. A reranker can shorten the prompt, but it adds "
            + "its own serial hop \u2014 the win is quality, not speed."
        }
      ]
    }
  });

  /* ==================================================================
     TRACK
     ================================================================== */
  window.TRACKS = window.TRACKS || {};
  window.TRACKS.mlcase = {
    id: "mlcase",
    name: "ML Problem Breakdowns",
    short: "CASES",
    tagline: "Seven problems, worked end to end",
    color: "#f472b6",
    blurb: "Seven full ML system design walkthroughs \u2014 video recommendations, feed ranking, ad click prediction, harmful-content detection, bot detection, search ranking, and a retrieval-augmented assistant. Every page runs the same eight beats: the clarifying questions, requirements as measurable targets, a graded Naive/Solid/Standout ladder for the objective and for the model, the offline and online paths, the label definition and its traps, evaluation with the deep dives you will be pushed on, and what the Mid, Senior, and Staff bar looks like on that specific problem.",
    modules: [

      /* ==================== RECSYS ==================== */
      {
        id: "recsys",
        name: "Recommendation & Ranking",
        icon: "trend",
        lessons: [

          /* ---------- 1. video recommendations ---------- */
          {
            id: "video-recommendations",
            title: "Recommending videos on a home surface",
            summary: "The canonical two-stage recommender, and the objective ladder from clicks to a satisfaction-weighted score with guardrails.",
            minutes: 11,
            tags: ["recommendation", "two-tower", "objective", "cold-start"],
            blocks: [
              { t: "p", html: "The prompt is one sentence: <em>build the home surface for a video app</em>. Everything that matters is hidden in what nobody said \u2014 which surface, what the catalogue looks like, and above all what \"good\" means. You already have the machinery for this from <a href='#/mlsd/framework/phase-plan'>the six-phase framework</a>; this page is about spending it on a real problem. The mental model to hold: a home surface is a <strong>funnel</strong>. Millions of items become hundreds cheaply, hundreds become twenty expensively, and a policy layer has the final say \u2014 and every decision below is really a decision about which stage absorbs which cost." },

              { t: "h", text: "The ask, and the questions worth the first five minutes" },
              { t: "ul", items: [
                "<strong>Which surface, exactly?</strong> A cold home grid, an up-next rail, or a search results page? <em>Assume:</em> the logged-in home grid, roughly 20 slots, refreshed on each visit.",
                "<strong>What is the catalogue?</strong> Long-form only, short-form only, or mixed? <em>Assume:</em> mixed durations from 30 seconds to two hours \u2014 which, as you will see, is the single most consequential answer for the objective.",
                "<strong>Who is the customer?</strong> Only viewers, or viewers and creators? <em>Assume:</em> both. A design that starves new creators kills its own supply.",
                "<strong>Is there a business metric already?</strong> <em>Assume:</em> daily active viewers and next-day return, so the ML objective has to ladder up to retention rather than to a session number.",
                "<strong>How fresh must new uploads be?</strong> <em>Assume:</em> recommendable within minutes, not hours. This is a hard architectural constraint, not a nice-to-have.",
                "<strong>What is out of scope?</strong> <em>Assume:</em> search, subscriptions ranking, notifications, and ads. Say this out loud so nobody thinks you forgot them."
              ] },

              { t: "h", text: "Requirements" },
              { t: "ul", items: [
                "<strong>Functional:</strong> given a viewer and a context, return a ranked, deduplicated set of about 20 videos; support a \"not interested\" signal; make a brand-new upload eligible for retrieval within minutes; never show the same item twice in a session.",
                "<strong>Non-functional:</strong> the numbers below. State them as assumptions, then design against them."
              ] },
              { t: "table",
                headers: ["Dimension", "Assumed target (order of magnitude)", "Why it binds the design"],
                rows: [
                  ["Catalogue", "~10<sup>8</sup> retrievable items", "Too large to score item-by-item \u2014 forces a cheap retrieval stage"],
                  ["Daily viewers", "~10<sup>8</sup>, a few sessions each", "Peak request rate in the tens of thousands per second; per-request compute is a budget, not an afterthought"],
                  ["End-to-end latency", "p99 in the low hundreds of milliseconds for the whole surface", "Leaves the ranker roughly tens of milliseconds after feature fetch and network"],
                  ["Ranking depth", "a few hundred candidates scored per request", "Sets how heavy the ranker is allowed to be"],
                  ["New-item freshness", "minutes from upload to retrievable", "Rules out designs that only refresh the index nightly"],
                  ["Model refresh", "ranker retrained daily; embeddings refreshed on a similar cadence", "Slower than this and you drift; faster and the cost curve bites"]
                ]
              },
              { t: "note", variant: "tip", html: "Say the words \"<strong>these are assumptions</strong>\" and write them on the board. An interviewer who wanted 10<sup>6</sup> items rather than 10<sup>8</sup> will correct you in ten seconds, and you will have saved yourself a design built on the wrong scale. Inventing a suspiciously precise number is worse than admitting a range." },

              { t: "h", text: "Framing the objective \u2014 Naive, Solid, Standout" },
              { t: "p", html: "This is the part of the answer that actually differentiates candidates, so slow down here. The question is not \"which loss function\" but \"<strong>what does this product want more of</strong>, and what does that proxy break when you push on it?\"" },
              { t: "table",
                headers: ["Tier", "Objective", "What it does to the product"],
                rows: [
                  ["<strong>Naive</strong>", "Maximise clicks: predict <code class='tok'>p(click)</code> and rank on it", "Optimises the thumbnail and the title, not the video. You get a home page full of content that was compelling to open and disappointing to watch, and the model has no way to know the difference \u2014 the reward arrives before the experience does."],
                  ["<strong>Naive</strong>", "Maximise total watch time in seconds", "Fixes the clickbait hole and opens a bigger one. Seconds are absolute, so a two-hour video that half-holds attention beats a 90-second clip that fully satisfied the viewer. You end up rewarding duration, and creators respond to that within weeks."],
                  ["<strong>Solid</strong>", "Maximise a satisfaction-weighted engagement score: predict several actions \u2014 completion-normalised watch, like, share, subscribe, \"not interested\" \u2014 and combine them with explicit weights", "Now length is normalised away and negative feedback can actually push a score down. The weights are a policy statement, so they are arguable in public rather than buried in a loss function."],
                  ["<strong>Standout</strong>", "The same weighted score, but <em>subject to guardrails</em> \u2014 topic diversity, integrity filters, a creator-supply floor \u2014 and validated against next-day return rather than in-session engagement", "This is the answer that survives contact with reality: it names the metric it optimises, the metrics it refuses to regress, and the longer-horizon metric that decides whether the whole thing worked. Guardrails are what stop a proxy win from becoming a product loss."]
                ]
              },
              { t: "p", html: "The mechanism behind the Great row is boring and important: you predict each action separately, then combine. Score = <code class='tok'>&Sigma; w<sub>a</sub> &middot; p(action<sub>a</sub>)</code>, with negative weights on negative actions. The weights are <em>not</em> learned from engagement logs \u2014 logs know how likely an action is, not how much it is worth \u2014 so they get set deliberately and validated with <a href='#/mlsd/concepts/ab-testing'>an online experiment</a>. Read the full metric ladder in <a href='#/mlsd/concepts/evaluation'>evaluation</a>." },

              { t: "h", text: "Model choice \u2014 Naive, Solid, Standout" },
              { t: "table",
                headers: ["Tier", "Choice", "Buys / costs"],
                rows: [
                  ["<strong>Naive</strong>", "Global popularity list, lightly personalised by country", "Buys you a working page in a day and a genuinely useful baseline number. Costs you all personalisation, and it is a <a href='#/mlsd/serving/feedback-loops'>feedback loop</a> in its purest form: popular gets shown, shown gets popular, the tail never surfaces."],
                  ["<strong>Naive</strong>", "One heavy model that scores the whole catalogue per request", "Buys perfect ranking in theory. Costs you the request \u2014 10<sup>8</sup> scorings inside tens of milliseconds is not an engineering problem you can optimise your way out of, it is the wrong shape."],
                  ["<strong>Solid</strong>", "<a href='#/mlsd/concepts/embeddings'>Two-tower</a> retrieval into an <a href='#/mlsd/concepts/ann-serving'>ANN index</a>, then a gradient-boosted ranker over a few hundred candidates with rich cross features", "Buys the funnel: cheap recall, expensive precision, each where it belongs. Costs you a second system to keep consistent, and the towers cannot use user\u00d7item cross features by construction \u2014 the item side must be request-independent to be precomputable."],
                  ["<strong>Standout</strong>", "Several retrieval sources unioned (two-tower, co-watch neighbours, fresh/trending, subscribed creators) \u2192 multi-task neural ranker with a shared trunk and one head per predicted action \u2192 policy layer for dedupe, diversity, and exploration", "Buys per-objective heads that share representation, plus a place to put product rules that do not belong in a model. Costs real complexity: more sources to monitor, and a shared trunk means one bad training run degrades every head at once."]
                ]
              },
              { t: "p", html: "Why a tree model is a perfectly respectable Good ranker: on a few hundred rows of dense tabular features it is fast, cheap to retrain, and hard to beat. You move to the neural ranker when you want <em>multi-task heads</em> and sequence features, not because trees ran out of accuracy." },

              { t: "h", text: "High-level design" },
              { t: "code", lang: "text", code:
                "OFFLINE  (hours \u2192 daily)                ONLINE  (per request)\n" +
                "-------------------------------------   -----------------------------------\n" +
                "impression + watch + action logs        request(viewer, context, surface)\n" +
                "        |                                          |\n" +
                "        v                                          v\n" +
                "label & feature jobs ---> FEATURE STORE <--- feature fetch (viewer, context)\n" +
                "        |                     ^                    |\n" +
                "        v                     |                    v\n" +
                "two-tower training            |            CANDIDATE SOURCES (union, ~1k)\n" +
                "  |            |              |            two-tower | co-watch | fresh\n" +
                "  |            v              |                     |\n" +
                "  |    item tower -> embed     |                     v\n" +
                "  |    whole catalogue ---> ANN INDEX ------> RANKER (multi-task, ~500)\n" +
                "  v                                                  |\n" +
                "ranker training --------> model registry ---------->  v\n" +
                "                                            POLICY LAYER\n" +
                "                                    dedupe | diversity | integrity\n" +
                "                                    freshness boost | exploration slot\n" +
                "                                                     |\n" +
                "                                                     v\n" +
                "                                            ~20 items + logging\n"
              },
              { t: "p", html: "Two arrows carry most of the weight. First, <strong>feature store \u2192 both training and serving</strong>: that shared box is the only reason your offline metrics predict anything online, because it is what keeps the two feature computations identical (<a href='#/mlsd/concepts/feature-stores'>training-serving skew</a>). Second, <strong>policy layer \u2192 client</strong>: it comes after the model on purpose. Diversity rules, integrity filters, and the exploration slot are product decisions with legal and editorial owners, and burying them in a loss function makes them unauditable. The rest of the shape is the standard <a href='#/mlsd/serving/retrieval-ranking'>retrieve-then-rank</a> pattern; the box-and-arrow reasoning about caches, replicas, and fan-out is Blueprint territory." },

              { t: "h", text: "Data, features, and the label" },
              { t: "ul", items: [
                "<strong>Log</strong> every impression with its position and the ranker score, every watch with duration and the video's length, every explicit action, and the model version that produced the slate. Without position and model version in the log you cannot debias later and you cannot attribute a regression.",
                "<strong>Features</strong> come from the <a href='#/mlsd/concepts/feature-engineering'>five usual sources</a>: viewer profile, item content and metadata, viewer\u00d7item history (watched this creator before), context (device, hour, network), and aggregates (item completion rate over the last hour).",
                "<strong>The label</strong> is where the real thinking is. \"Watched\" needs a definition: seconds watched is duration-biased, so use <em>fraction completed</em>, or better, watch time relative to what is typical for videos of that length. Both are choices you must defend.",
                "<strong>Negatives</strong> are the other half of the label. Un-clicked impressions are weak negatives (maybe unseen); random catalogue items are easy negatives useful for the towers; in-batch sampled negatives are the standard trick for training retrieval. Mixing them changes what the model learns."
              ] },
              { t: "note", variant: "trap", html: "<strong>The leak that gets shipped most often here is aggregate features computed over the full training window.</strong> \"Item completion rate\" computed across all of last month, then used to predict an event from the middle of that month, has quietly told the model the future. Every aggregate must be computed as of the prediction timestamp \u2014 point-in-time correctness \u2014 or your offline numbers will be beautiful and your online numbers will not move. More failure shapes in <a href='#/mlsd/concepts/feature-pitfalls'>feature pitfalls</a>." },

              { t: "h", text: "Evaluation and the deep dives you will be pushed on" },
              { t: "ul", items: [
                "<strong>Offline, retrieval:</strong> recall@k against the items the viewer actually engaged with \u2014 the retrieval stage's only job is to not lose the good item.",
                "<strong>Offline, ranking:</strong> NDCG or a similar ordering metric on held-out sessions, plus per-head calibration and log loss so you can tell whether a head broke.",
                "<strong>Offline, always:</strong> split by time, never at random. Random splits on interaction data leak the future and inflate everything (see <a href='#/mlsd/concepts/training-pipelines'>splits</a>).",
                "<strong>Online:</strong> the weighted objective as the primary metric; guardrails on integrity actions, topic diversity, creator coverage, and \"not interested\" rate; next-day return as the decision metric.",
                "<strong>Guardrail worth naming out loud:</strong> report negative feedback per thousand impressions. A proxy win with a negative-feedback regression is a product loss wearing a win's clothes."
              ] },
              { t: "ol", items: [
                "<strong>Cold start for new uploads.</strong> Two separate problems: the item must be <em>representable</em> without behavioural features (embed it from title, transcript, thumbnail, and creator priors) and it must be <em>shown</em> before it can accumulate any (a reserved exploration slice). Waiting for engagement to stabilise is circular. The ANN index also has to accept inserts continuously rather than only at rebuild time.",
                "<strong>Presentation and position bias.</strong> The item at slot one gets engagement partly because it was at slot one. Train naively and you learn your own ranking. Feed position into training and drop it at serving, or reweight by examination propensity \u2014 the same machinery as <a href='#/mlcase/retrieval/search-ranking'>search ranking</a>.",
                "<strong>The feedback loop.</strong> Your model chooses what gets logged, and the logs train your next model. Without a deliberate exploration budget the candidate space collapses toward whatever the first model liked. See <a href='#/mlsd/serving/feedback-loops'>feedback loops</a>."
              ] },
              { t: "cue", html: "Say this and you sound like you have shipped one: \u201cI'd rank on a weighted combination of predicted actions rather than a single engagement number, because any single proxy has a known pathology \u2014 clicks reward thumbnails, raw watch time rewards length. The weights are a product decision, so I'd make them explicit and A/B test them, and I'd hold diversity and negative-feedback rate as guardrails.\u201d" },

              { t: "h", text: "How this scores at each level" },
              { t: "table",
                headers: ["Bar", "On this problem, that means"],
                rows: [
                  ["<strong>Mid</strong>", "Gets to two stages: cheap retrieval, then a ranker. Names <code class='tok'>p(click)</code> or watch time as the objective and can describe features and a train/serve split. May not spot the pathologies in the objective until prompted."],
                  ["<strong>Senior</strong>", "Volunteers the objective ladder unprompted and explains why watch time rewards length. Designs the two-tower plus ranker split for a stated latency budget, handles cold start with content features plus exploration, and names a specific leakage risk with the point-in-time fix."],
                  ["<strong>Staff</strong>", "Treats the whole thing as a closed loop: the objective is defined so it ladders to retention, guardrails and their owners are named, the exploration budget is justified as the cost of keeping the loop from collapsing, and the creator-supply side is designed for rather than assumed. Can say which parts they would <em>not</em> build in v1 and why."]
                ]
              },
              { t: "note", variant: "key", html: "<strong>The objective is the design.</strong> Retrieval and ranking are a solved shape you can draw in two minutes; what you are actually being assessed on is whether you can name what a proxy metric will do to the product when the whole system pushes on it \u2014 and whether you set guardrails before, not after, the experiment." }
            ]
          },

          /* ---------- 2. feed ranking ---------- */
          {
            id: "feed-ranking",
            title: "Ranking a social feed of mixed item types",
            summary: "Multi-objective ranking over heterogeneous items, the engagement-versus-quality tension, and how freshness fights precomputation.",
            minutes: 11,
            tags: ["ranking", "multi-objective", "freshness", "quality"],
            blocks: [
              { t: "p", html: "A feed is harder than a video surface for one structural reason: the items are not comparable. A photo from a close friend, a long text post from a group, a live video, and a suggested account all compete for the same slot, and they generate completely different engagement signals. Ranking them means putting them on <strong>one scale that you invented</strong> \u2014 and defending it. So the mental model is that a feed ranker is a <strong>value function</strong>, not a relevance model: relevance asks \"does this match?\", a feed asks \"what is this worth to this person right now, net of what it costs them?\" Everything below follows from taking that seriously." },

              { t: "h", text: "The ask, and the questions worth the first five minutes" },
              { t: "ul", items: [
                "<strong>What is in the feed?</strong> Only content from connections, or connections plus recommended content? <em>Assume:</em> mostly connections, with a bounded share of recommended items \u2014 which means two candidate sources with different cold-start profiles.",
                "<strong>How heterogeneous?</strong> <em>Assume:</em> five or six item types (photo, text, video, link, live, suggested-account). Their base rates for every action differ by an order of magnitude, which is the whole difficulty.",
                "<strong>Is chronology a product promise?</strong> <em>Assume:</em> no, but recency is a strong feature and users notice when something from three days ago is at the top.",
                "<strong>What counts as quality?</strong> <em>Assume:</em> there is an integrity classifier stack already, plus a notion of low-quality-but-legal content (engagement bait, borderline). <em>You do not get to define policy, but you must consume it.</em>",
                "<strong>Session shape?</strong> <em>Assume:</em> viewers open the app several times a day and consume tens of items per session, so the unit that matters is the session, not the single impression.",
                "<strong>Out of scope:</strong> the storage and fan-out architecture for the underlying timeline. That is a system design question and Blueprint covers it; here it appears only as a constraint on what you can compute per request."
              ] },

              { t: "h", text: "Requirements" },
              { t: "ul", items: [
                "<strong>Functional:</strong> return a ranked page of items on each fetch; support infinite scroll with no repeats; honour explicit controls (mute, follow, \"show less like this\"); apply integrity filtering before ranking; be able to rank an item created seconds ago.",
                "<strong>Non-functional:</strong> targets below \u2014 orders of magnitude, stated as assumptions."
              ] },
              { t: "table",
                headers: ["Dimension", "Assumed target", "Consequence"],
                rows: [
                  ["Candidates per request", "~10<sup>3</sup> after retrieval and integrity filtering", "Small enough for a heavy ranker; large enough that per-candidate cost matters"],
                  ["Ranking latency", "tens of milliseconds p99 for the ranking stage", "One model pass over ~10<sup>3</sup> candidates, batched; no per-candidate network calls"],
                  ["Freshness", "an item posted seconds ago must be rankable", "Kills any design that precomputes finished ranked feeds"],
                  ["Actions predicted", "~6\u201310 heads (dwell, like, comment, share, hide, report, follow)", "Multi-task is a requirement, not a refinement"],
                  ["Model refresh", "ranker retrained at least daily; near-real-time counters for engagement aggregates", "Behaviour on a feed shifts within hours during news events"]
                ]
              },

              { t: "h", text: "Framing the objective \u2014 Naive, Solid, Standout" },
              { t: "table",
                headers: ["Tier", "Objective", "What it does to the product"],
                rows: [
                  ["<strong>Naive</strong>", "Maximise time spent in the feed", "The one objective that is almost never what the business means. It rewards anything sticky, cannot distinguish absorbed from stuck, and is trivially satisfied by making the product harder to leave. It also actively fights any effort to make the feed more efficient."],
                  ["<strong>Naive</strong>", "Maximise total engagement events", "Treats a report and a like as both \"engagement\", and treats item types as comparable when their base rates are not. Content that provokes gets a structural advantage, because outrage generates cheap comments. Push on this for two quarters and the feed changes character."],
                  ["<strong>Solid</strong>", "Maximise a weighted sum of predicted actions, with explicit negative weights on hide, report, and \"show less\"", "Now the trade-off is written down: a share is worth <em>n</em> likes because someone decided so. Negative actions can lower a score, which is the mechanism that lets quality push back on engagement at all."],
                  ["<strong>Standout</strong>", "Maximise predicted <em>session value</em> \u2014 the weighted action sum, minus a quality penalty from the integrity and low-quality classifiers, subject to diversity and per-source-share guardrails \u2014 with retention as the decision metric", "Optimises the unit the user actually experiences, prices quality into the score rather than bolting it on as a filter, and admits that the metric you can measure today (session engagement) is a proxy for the one you care about (they come back next week)."]
                ]
              },
              { t: "p", html: "The engagement-versus-quality tension is not resolvable by a better model, and saying so is a strength. Engagement signals are dense, fast, and cheap; quality signals are sparse, slow, and contested. Any weighting you pick is a position on that trade. The two mechanisms that make it tractable: <strong>negative-feedback heads</strong> (predicting hide and report, so unpleasant content is penalised by the same score that rewards likes) and <strong>a quality term</strong> whose weight is a product parameter you can turn up during an incident." },

              { t: "h", text: "Model choice \u2014 Naive, Solid, Standout" },
              { t: "table",
                headers: ["Tier", "Choice", "Buys / costs"],
                rows: [
                  ["<strong>Naive</strong>", "Reverse chronological, no model", "Genuinely buys a lot: perfect freshness, zero ranking latency, trivially explainable, no feedback loop. Costs you relevance at any real follow count \u2014 with hundreds of connections the good item is on page four. Worth naming as your baseline rather than dismissing."],
                  ["<strong>Naive</strong>", "One binary classifier for <code class='tok'>p(any engagement)</code>", "Buys simplicity. Costs you the entire problem: one head cannot express that a report is bad and a share is good, and it will be dominated by whichever item type has the highest base rate."],
                  ["<strong>Solid</strong>", "One model per predicted action (trees or a small network), combined by weights at serving time", "Buys independent heads you can debug, retrain, and calibrate separately, and weights you can change without retraining. Costs you <em>n</em> models to serve inside one latency budget, plus no shared representation."],
                  ["<strong>Standout</strong>", "Multi-task network: shared trunk over user, item, and sequence features, one head per action, per-item-type calibration on the outputs, negative-feedback heads trained on the same trunk", "Buys shared representation (rare actions like \"report\" borrow strength from dense ones), one forward pass for all heads, and a place to put user history as a sequence. Costs coupling \u2014 a bad trunk update degrades every head simultaneously \u2014 and per-type calibration becomes a maintained artefact."]
                ]
              },
              { t: "note", variant: "warn", html: "<strong>Heterogeneous items need per-type calibration, not just per-type features.</strong> If <code class='tok'>p(comment)</code> is systematically over-predicted for text posts and under-predicted for video, then your weighted sum is comparing two differently-scaled numbers and the whole ranking tilts \u2014 silently, and in a way no single-model metric will show you. Calibrate each head within each item type and monitor the calibration error per slice." },

              { t: "h", text: "High-level design" },
              { t: "code", lang: "text", code:
                "OFFLINE                                 ONLINE  (per fetch)\n" +
                "-----------------------------------     -----------------------------------\n" +
                "engagement + negative-action logs        request(user, cursor, context)\n" +
                "        |                                          |\n" +
                "        v                                          v\n" +
                "point-in-time label join                  CANDIDATE SOURCES\n" +
                "        |                                  connections timeline (stored)\n" +
                "        v                                  recommended pool (ANN)\n" +
                "multi-task trunk training                  FRESH PATH (seconds old)\n" +
                "        |                                          |\n" +
                "        v                                          v\n" +
                "model registry ------------------->       integrity filter (hard)\n" +
                "                                                   |\n" +
                "FEATURE STORE  <----- streaming counters ---------> |  feature fetch\n" +
                "  (same definitions both sides)                     v\n" +
                "                                          MULTI-TASK RANKER\n" +
                "                                          p(dwell) p(like) p(share)\n" +
                "                                          p(hide)  p(report) ...\n" +
                "                                                   |\n" +
                "                                                   v\n" +
                "                                          VALUE COMBINER\n" +
                "                                          Sum w_a * p_a  -  quality penalty\n" +
                "                                                   |\n" +
                "                                                   v\n" +
                "                                          diversity / source-share caps\n" +
                "                                          dedupe against seen-set\n" +
                "                                                   |\n" +
                "                                                   v\n" +
                "                                          page of items + impression log\n"
              },
              { t: "p", html: "The load-bearing arrow is <strong>FRESH PATH \u2192 ranker</strong>. Everything else in the diagram could be precomputed; that one branch cannot. An item posted forty seconds ago has no engagement aggregates, no impression history, and possibly no embedding yet, so the ranker must be able to score it from author, type, text, and context alone \u2014 which means those features have to be sufficient for a reasonable prediction, and it means your feature store needs a streaming path with second-scale freshness rather than an hourly batch. The second arrow worth talking about: <strong>integrity filter before ranking</strong>. Filtering is a hard yes/no owned by policy; ranking is a soft score owned by you. Putting the filter first keeps that boundary clean and shrinks what the ranker has to score. Underneath all of it sits the fan-out question \u2014 whether a timeline is assembled on write or on read. Push-based assembly gives you a ready list but makes very-high-follower authors expensive; pull-based gives you freshness but pays at read time. Blueprint works that trade-off properly; what matters here is that <em>whichever you inherit sets the size and staleness of your candidate set</em>, and therefore what your ranker is allowed to assume." },

              { t: "h", text: "Data, features, and the label" },
              { t: "ul", items: [
                "<strong>Log</strong> the full slate with positions, dwell time per item (with a viewport signal so you know it was actually on screen), every positive and negative action, and the item type. Impressions without a viewport signal make dwell labels meaningless.",
                "<strong>Features:</strong> author\u2013viewer affinity (past interactions, mutual connections), item content and type, item age, viewer's recent action sequence, near-real-time item aggregates, and context. Affinity features are usually the strongest single family.",
                "<strong>The label is genuinely hard here.</strong> \"Engaged\" is not one event. Dwell needs a threshold and that threshold differs by item type \u2014 three seconds on a photo is engagement, three seconds on a long text post is a bounce. Every head needs its own defensible definition, and \"no action\" has to be distinguished from \"never actually seen\".",
                "<strong>Negative actions are labels too</strong>, and they are rare enough that class weighting or explicit oversampling is usually required for those heads to learn anything."
              ] },
              { t: "note", variant: "trap", html: "<strong>The bias specific to feeds is exposure bias compounded by the social graph.</strong> You only observe engagement on items you showed, and what you showed was chosen by the previous model from a candidate set the fan-out already narrowed. So popular authors accumulate evidence of being engaging, and a new or low-reach author has no path to accumulating any. Left alone this concentrates the feed on a shrinking set of authors \u2014 measure author coverage as a guardrail and reserve exploration for low-reach candidates." },

              { t: "h", text: "Evaluation and the deep dives you will be pushed on" },
              { t: "ul", items: [
                "<strong>Offline:</strong> per-head AUC and log loss (each head is its own classifier), calibration error per item type, and a ranking metric on held-out sessions. Time-based splits only.",
                "<strong>Offline caution:</strong> offline ranking metrics on logged feeds are optimistic by construction \u2014 you can only score the items the old model chose to show. Treat them as regression detectors, not as predictions of online lift.",
                "<strong>Online primary:</strong> the value score itself, plus per-action rates so you can see <em>which</em> term moved.",
                "<strong>Online guardrails:</strong> negative feedback per thousand impressions, integrity action rate, item-type mix, author coverage, and a low-quality exposure metric. Retention as the slower decision metric \u2014 see <a href='#/mlsd/concepts/ab-testing'>A/B testing</a> for why session metrics and retention often disagree."
              ] },
              { t: "ol", items: [
                "<strong>How do you set the weights?</strong> The honest answer has three parts: start from a rough exchange rate elicited from product owners, run an experiment sweeping a few weight vectors, and re-derive them when the metric definitions change. Do not claim you can learn them from engagement logs \u2014 the logs cannot tell you what a share <em>ought</em> to be worth.",
                "<strong>Freshness versus precomputation.</strong> Precompute the stable slice and merge a request-time fresh path, or precompute nothing and pay per request. This is the trade you will be asked to defend, and the answer depends entirely on the latency and freshness numbers you assumed at the start.",
                "<strong>Diversity and the seen-set.</strong> Infinite scroll means the ranker is called repeatedly with overlapping candidates, so \"already shown\" is state you must carry. Doing this as a post-ranking pass is fine and much easier to reason about than trying to express it inside the model."
              ] },
              { t: "cue", html: "The sentence that earns credit: \u201cI'd predict each action separately and combine them into one value score with explicit weights, because the items aren't comparable and a single engagement label would just rank whichever type has the highest base rate. Negative-action heads are how quality pushes back on engagement inside the same score, and I'd calibrate per item type before trusting the sum.\u201d" },

              { t: "h", text: "How this scores at each level" },
              { t: "table",
                headers: ["Bar", "On this problem, that means"],
                rows: [
                  ["<strong>Mid</strong>", "Ranks with a single engagement model and can list sensible features including author affinity. Knows integrity filtering happens somewhere. Usually misses that heterogeneous item types break a single-label formulation."],
                  ["<strong>Senior</strong>", "Goes multi-objective without being asked, with negative-feedback heads and explicit weights, and can explain why the weights are a product decision. Handles the freshness-versus-precomputation trade with reference to the stated latency budget, and names per-type calibration as a real risk."],
                  ["<strong>Staff</strong>", "Frames the objective as session value laddering to retention, prices quality into the score rather than filtering after it, names the exposure-bias dynamic on the author side and designs a guardrail for it, and is explicit about which offline metrics they do <em>not</em> trust and why. Also says what they would ship first."]
                ]
              },
              { t: "note", variant: "key", html: "<strong>When items are not comparable, the score has to be invented \u2014 so invent it in the open.</strong> Predict each action, weight the actions explicitly, calibrate per item type before summing, and put negative feedback in the same score rather than in a separate report nobody reads." }
            ]
          },

          /* ---------- 3. ad click prediction ---------- */
          {
            id: "ad-click-prediction",
            title: "Predicting click-through for an ad auction",
            summary: "The one ranking problem where the probability itself has to be true: calibration, extreme imbalance, hashing, and a brutal latency budget.",
            minutes: 11,
            tags: ["ctr", "calibration", "imbalance", "latency"],
            blocks: [
              { t: "p", html: "Every other problem in this track wants a <em>good order</em>. This one wants a <strong>true number</strong>. In an auction, the platform ranks candidate ads by expected value \u2014 roughly <code class='tok'>bid &times; p(click)</code> \u2014 and then charges money based on the result. If your probabilities are uniformly twice too high, the ordering is untouched and the marketplace is broken: budgets burn at the wrong rate, and pricing is wrong for everyone. Hold that distinction firmly, because it is the whole lesson. <strong>Ranking is invariant to monotone transforms of the score; pricing is not.</strong> Everything below \u2014 the objective, the model, the loss, the monitoring \u2014 falls out of needing calibration as a first-class requirement rather than a nice property." },

              { t: "h", text: "The ask, and the questions worth the first five minutes" },
              { t: "ul", items: [
                "<strong>What is the auction mechanism?</strong> <em>Assume:</em> a second-price-style auction ranking on expected value, so <code class='tok'>p(click)</code> feeds both ranking and pricing. This is the answer that makes calibration mandatory \u2014 ask it first.",
                "<strong>What is the surface?</strong> <em>Assume:</em> one in-feed placement, one ad per request. Multi-slot introduces cross-slot effects; say you are excluding them deliberately.",
                "<strong>Which prediction, exactly?</strong> Click only, or click and downstream conversion? <em>Assume:</em> click is the primary model, with conversion as a separate, sparser model referenced but not designed here.",
                "<strong>What is the latency budget?</strong> <em>Assume:</em> the ad request must return within a few tens of milliseconds, and the CTR model gets a slice of that measured in single-digit to low-tens of milliseconds. This is far tighter than any other problem in this track and it constrains the model class directly.",
                "<strong>What is the base rate?</strong> <em>Assume:</em> clicks are a low single-digit percentage of impressions or less. Order of magnitude is enough; the point is that you are firmly in imbalanced territory.",
                "<strong>Out of scope:</strong> budget pacing, bid optimisation, fraud, and the billing pipeline \u2014 all real, all adjacent, none of them this model."
              ] },

              { t: "h", text: "Requirements" },
              { t: "ul", items: [
                "<strong>Functional:</strong> given a request context and a candidate ad, return a calibrated <code class='tok'>p(click)</code>; handle ads and advertisers never seen in training; support fast rollback of a model version; log every scored candidate for later training and auditing.",
                "<strong>Non-functional:</strong> below. Note that one of these targets is a <em>quality</em> requirement rather than a speed one, which is unusual and is the point."
              ] },
              { t: "table",
                headers: ["Dimension", "Assumed target", "Why it binds"],
                rows: [
                  ["Model latency", "single-digit to low-tens of ms p99 for scoring a batch of candidates", "Rules out deep multi-hop models without distillation or quantisation; favours one batched forward pass"],
                  ["Throughput", "~10<sup>5</sup>\u201310<sup>6</sup> scored candidates per second at peak", "Per-candidate cost is a hard budget; feature fetch must be batched"],
                  ["Calibration", "expected calibration error small in absolute terms, tracked per major slice", "A first-class SLO, not a diagnostic. Slice-level matters: overall calibration can look fine while a segment is badly off"],
                  ["Feature cardinality", "~10<sup>8</sup>\u201310<sup>9</sup> distinct ids across users, ads, creatives, publishers", "Forces hashing or learned embeddings with a fixed parameter budget"],
                  ["Freshness", "new creatives priced sensibly within minutes; model refreshed at least daily, often continuously", "Ad content turns over far faster than a video catalogue"]
                ]
              },

              { t: "h", text: "Framing the objective \u2014 Naive, Solid, Standout" },
              { t: "table",
                headers: ["Tier", "Objective", "What it does to the marketplace"],
                rows: [
                  ["<strong>Naive</strong>", "Maximise clicks on ads", "Sounds aligned and is not. It ignores that different advertisers pay different amounts, so it happily fills the slot with cheap high-CTR inventory and destroys revenue. It also ignores the user entirely."],
                  ["<strong>Naive</strong>", "Maximise short-term revenue by ranking on bid", "Removes the model from the loop and sells the slot to whoever shouts loudest, regardless of whether anyone will click. Expected revenue is bid \u00d7 probability; dropping the probability is not a simplification, it is a different and worse business."],
                  ["<strong>Solid</strong>", "Rank by expected value \u2014 <code class='tok'>bid &times; p(click)</code> \u2014 with <code class='tok'>p(click)</code> trained on log loss and explicitly calibrated", "The right shape. Log loss (rather than a ranking loss) because it is a proper scoring rule: it is minimised by the true probability, which is exactly the property an auction needs."],
                  ["<strong>Standout</strong>", "Maximise long-run marketplace value: expected value including post-click quality signals, minus a user-experience term, with calibration error as a monitored SLO and per-slice calibration enforced", "Prices in the fact that a click on a bad landing page is worth less than the auction thinks, and that ad load has a cost the auction never sees. Names calibration as an operational commitment rather than an offline metric."]
                ]
              },
              { t: "note", variant: "tip", html: "<strong>Use a proper scoring rule and do not squash it.</strong> Log loss is minimised when your predicted probability equals the true probability, which is why it is the right training loss here and why a pairwise ranking loss \u2014 perfectly sensible in <a href='#/mlcase/retrieval/search-ranking'>search</a> \u2014 is the wrong choice for an auction. If you optimise only for order, you have thrown away the number you are about to charge money against." },

              { t: "h", text: "Model choice \u2014 Naive, Solid, Standout" },
              { t: "table",
                headers: ["Tier", "Choice", "Buys / costs"],
                rows: [
                  ["<strong>Naive</strong>", "Historical CTR per ad id, smoothed", "Buys a legitimate baseline and a useful feature forever. Costs you all context \u2014 the same ad has very different CTR by placement, hour, and audience \u2014 and it has nothing to say about a creative launched an hour ago."],
                  ["<strong>Naive</strong>", "A tree ensemble over raw high-cardinality ids", "Buys strong performance on the dense numeric features. Costs you the sparse side: trees split on values they saw, so hundreds of millions of ids either get dropped, blow up the model, or arrive at serving as unseen categories with no representation."],
                  ["<strong>Solid</strong>", "Regularised logistic regression on hashed sparse features plus hand-built crosses, with an explicit calibration stage", "Buys exactly what an auction wants: a naturally probabilistic output, trivial and predictable latency, cheap frequent retraining, and easy debugging by feature weight. Costs you interaction modelling \u2014 crosses have to be authored, and you will not capture what you did not think of."],
                  ["<strong>Standout</strong>", "Sparse-embedding network: hashed id embeddings plus dense features, an explicit interaction layer, distilled or quantised to hit the latency budget, with an isotonic or Platt calibration layer fitted per major slice", "Buys learned interactions and shared strength across sparse ids. Costs the hardest engineering in this track \u2014 embedding tables are large, the latency budget is unforgiving, and every training-pipeline change risks the calibration you were relying on."]
                ]
              },
              { t: "h2", text: "Extreme imbalance: what actually changes" },
              { t: "ul", items: [
                "<strong>Metric choice.</strong> ROC-AUC compares recall against FP/(all negatives), and with a hundred negatives per positive an enormous absolute number of false positives is a rounding error in that denominator \u2014 so ROC-AUC looks flattering and moves sluggishly. PR-AUC (average precision) divides by the predictions you made, so it reacts to the cost you pay. Note that PR-AUC's no-skill baseline is the prevalence, while ROC-AUC's is 0.5, so PR numbers look low and are not comparable across datasets with different base rates.",
                "<strong>Log loss stays central</strong> regardless, because it is the metric that penalises being confidently wrong about the probability, which is the failure mode that costs money.",
                "<strong>Negative downsampling</strong> is the standard cost control: keep all positives and a fraction <em>w</em> of negatives, and you cut training data volume dramatically. But it shifts the base rate, so the model's output is calibrated to the sampled world, not the real one.",
                "<strong>You must undo it.</strong> With negatives kept at rate <em>w</em>, recover the true probability from the model's output <em>p<sub>s</sub></em> with <code class='tok'>p = p<sub>s</sub> / (p<sub>s</sub> + (1 &minus; p<sub>s</sub>)/w)</code>. Skip this and every prediction is inflated by roughly 1/<em>w</em> at low probabilities \u2014 the single most common calibration bug in ad systems."
              ] },
              { t: "h2", text: "Feature hashing, honestly" },
              { t: "p", html: "You cannot hold a parameter per user id, per creative, per publisher, and per cross of those. Hashing solves it by mapping every id into a fixed number of buckets: <code class='tok'>bucket = hash(field_name + \":\" + value) mod m</code>. You get a fixed memory footprint chosen in advance, no vocabulary to maintain, and \u2014 the underrated part \u2014 a defined behaviour for ids that did not exist at training time, which for a stream of new creatives is not a corner case but the normal state. The cost is collisions: two unrelated ids land in one bucket and share a weight, so their signals blur. That is a real accuracy loss and you trade it directly against memory by choosing <em>m</em>. Two things make it survivable: including the field name in the hash input so a user id cannot collide with a publisher id, and the fact that the ids most likely to collide are rare ones whose weights were weakly estimated anyway. Hash the id, keep the frequency-based features separately, and monitor the collision rate as a real quantity rather than assuming it away." },

              { t: "h", text: "High-level design" },
              { t: "code", lang: "text", code:
                "OFFLINE                                 ONLINE  (inside the ad request)\n" +
                "-----------------------------------     -----------------------------------\n" +
                "impression + click join                  request(user, context, placement)\n" +
                "  (wait out the attribution window)                 |\n" +
                "        |                                           v\n" +
                "        v                                  candidate ads (targeting +\n" +
                "negative downsampling (rate w)              budget/pacing eligible)\n" +
                "        |                                           |\n" +
                "        v                                           v\n" +
                "hashing + feature assembly  <--- FEATURE STORE ---> batched feature fetch\n" +
                "        |                        (same hashing code)         |\n" +
                "        v                                                    v\n" +
                "train (log loss)                                    CTR MODEL, one batched\n" +
                "        |                                           forward pass\n" +
                "        v                                                    |\n" +
                "CALIBRATION FIT                                              v\n" +
                "  undo downsampling: p = ps/(ps+(1-ps)/w)            CALIBRATION LAYER\n" +
                "  isotonic/Platt per slice ------------------------>  (per slice)\n" +
                "        |                                                    |\n" +
                "        v                                                    v\n" +
                "model registry (versioned, fast rollback)             AUCTION\n" +
                "        ^                                        rank by bid * p(click)\n" +
                "        |                                        price the winner\n" +
                "calibration + drift monitors <--- scored-candidate log <------+\n"
              },
              { t: "p", html: "Three arrows do the work. <strong>Impression\u2013click join waits out the attribution window</strong>: a click can arrive after the impression, so your freshest impressions have provisional labels and a naive \"last hour\" training set is full of false negatives. <strong>The calibration layer sits after the model and before the auction</strong>, as a separately fitted, separately monitored artefact \u2014 keeping it separate is what lets you refit calibration without retraining, which is the fix you will want at 3am. And <strong>scored-candidate log \u2192 monitors</strong> closes the loop: predicted versus realised CTR per slice is the alarm that catches a broken deploy long before revenue reporting does. Wider treatment in <a href='#/mlsd/serving/inference-architecture'>inference architecture</a> and <a href='#/mlsd/serving/drift-monitoring'>drift monitoring</a>." },

              { t: "h", text: "Data, features, and the label" },
              { t: "ul", items: [
                "<strong>Log</strong> every <em>scored candidate</em>, not just the winner \u2014 otherwise you only ever train on ads the current model already liked, and the selection bias is baked in permanently.",
                "<strong>Features:</strong> ad and creative (id, format, advertiser, category, text), user (long-run interest aggregates, recent behaviour), context (placement, position, device, hour), and crosses (advertiser \u00d7 user interest, creative \u00d7 placement). Crosses are usually where the accuracy is.",
                "<strong>The label</strong> is a click, and it is less obvious than it sounds: accidental clicks, immediate back-navigation, and bot traffic all look like positives. A defensible definition filters invalid traffic and often requires a minimum post-click dwell.",
                "<strong>Frequency features are a leakage minefield.</strong> \"Times this user saw this ad\" must be as-of the impression, never computed over the whole training window."
              ] },
              { t: "note", variant: "trap", html: "<strong>The classic leak: an aggregate that includes the outcome you are predicting.</strong> Build \"creative CTR over the last 7 days\" from a window that overlaps your label period and the feature partly <em>is</em> the label. Offline AUC jumps, the team celebrates, and online performance is flat because at serving time the future half of that window does not exist. Every count and rate feature needs a point-in-time cutoff and a serving path that computes it the same way \u2014 see <a href='#/mlsd/concepts/feature-pitfalls'>feature pitfalls</a> and <a href='#/mlsd/concepts/feature-stores'>feature stores</a>." },

              { t: "h", text: "Evaluation and the deep dives you will be pushed on" },
              { t: "ul", items: [
                "<strong>Offline:</strong> log loss as primary (proper scoring rule), PR-AUC for discrimination under imbalance, ROC-AUC only as a familiar secondary, and calibration measured as a curve \u2014 predicted probability versus realised rate per bucket \u2014 not as a single scalar.",
                "<strong>Calibration per slice</strong> is the check people skip: overall calibration can look excellent while new advertisers are over-predicted by 40% and one placement is under-predicted. Slice by placement, advertiser tenure, device, and predicted-probability decile.",
                "<strong>Online:</strong> revenue per thousand requests and realised CTR versus predicted CTR as the calibration monitor. Guardrails on user-side metrics and on advertiser-side delivery, because a calibration shift silently reallocates spend between advertisers.",
                "<strong>Latency</strong> is an evaluation metric here, not an ops detail. A model that is 1% better on log loss and blows the p99 budget is not better."
              ] },
              { t: "ol", items: [
                "<strong>\"Your AUC is 0.85 but revenue dropped. What happened?\"</strong> The expected answer names calibration: ordering intact, probabilities shifted, so expected-value ranking against fixed bids reallocated spend and mispriced. Check predicted-versus-realised CTR by slice first, and check whether a downsampling rate changed.",
                "<strong>Position and selection effects.</strong> The ad you observed was in a slot, and the slot affects clicks. If your placement or position is a feature, it is doing double duty as a bias term \u2014 handle it the way search handles <a href='#/mlcase/retrieval/search-ranking'>position bias</a>, and be careful that it stays fixed at serving time.",
                "<strong>Cold-start creatives.</strong> A brand-new creative has no history, so it leans on advertiser, category, and format priors, and it needs a small exploration allowance to earn its own estimate. Under-predict it and it never gets shown; over-predict it and the advertiser's budget is spent on a guess. This is the same shape as new-item cold start in <a href='#/mlcase/recsys/video-recommendations'>video recommendations</a>, but the mistake costs someone money immediately."
              ] },
              { t: "cue", html: "The sentence that separates this problem from every other ranker: \u201cThis is the one place where the probability has to be numerically true, not just correctly ordered \u2014 the auction multiplies it by a bid and charges against the result. So I'd train with log loss, correct for negative downsampling explicitly, keep calibration as a separate fitted layer I can refit without retraining, and monitor predicted versus realised CTR per slice as an SLO.\u201d" },

              { t: "h", text: "How this scores at each level" },
              { t: "table",
                headers: ["Bar", "On this problem, that means"],
                rows: [
                  ["<strong>Mid</strong>", "Builds a binary classifier with sensible features, knows the classes are imbalanced, and mentions AUC. Typically treats the output as a score to rank with and does not distinguish ranking from pricing."],
                  ["<strong>Senior</strong>", "Leads with calibration as a requirement and can justify log loss as a proper scoring rule. Handles cardinality with hashing and states the collision trade-off. Applies the downsampling correction, uses PR-AUC under imbalance for the right reason, and designs to the latency budget explicitly."],
                  ["<strong>Staff</strong>", "Treats calibration as an operational SLO with per-slice monitoring and a refit path independent of retraining. Reasons about marketplace effects \u2014 how a calibration shift reallocates advertiser spend \u2014 names the delayed-label problem in the training join, and can debug the \"AUC up, revenue down\" scenario from first principles."]
                ]
              },
              { t: "quiz", id: "mlcase-recsys" },
              { t: "note", variant: "key", html: "<strong>A ranker needs order; an auction needs truth.</strong> Every unusual choice on this page \u2014 log loss over a ranking loss, a separate calibration layer, the <code class='tok'>p = p<sub>s</sub>/(p<sub>s</sub>+(1&minus;p<sub>s</sub>)/w)</code> correction after downsampling, per-slice calibration monitoring \u2014 exists because a monotone rescaling of your scores changes nothing about the ranking and everything about the money." }
            ]
          }
        ]
      },

      /* ==================== TRUST ==================== */
      {
        id: "trust",
        name: "Trust & Safety",
        icon: "shield",
        lessons: [

          /* ---------- 4. harmful content ---------- */
          {
            id: "harmful-content",
            title: "Detecting and acting on harmful content",
            summary: "The objective ladder that ends at views rather than items, the human queue as part of the system, and why the threshold is not yours to choose.",
            minutes: 12,
            tags: ["moderation", "precision-floor", "multimodal", "human-in-the-loop"],
            blocks: [
              { t: "p", html: "This problem looks like classification and is really <strong>resource allocation under an asymmetric cost</strong>. You have a firehose of content, a model that produces a score, a small number of human reviewers, and two very different ways to be wrong: you can silence someone who did nothing, or you can leave something up that hurts people. The design is mostly about where you put that trade. So the mental model is that <strong>the model does not make decisions, it makes a queue</strong> \u2014 ranking, thresholds, actions, and appeals are the system, and the classifier is one component inside it. Candidates who see only the classifier plateau at mid-level on this problem." },

              { t: "h", text: "The ask, and the questions worth the first five minutes" },
              { t: "ul", items: [
                "<strong>Which policies?</strong> \"Harmful\" is not one class \u2014 violent threats, self-harm, spam, and misinformation have different severities, different legal exposure, and different evidence. <em>Assume:</em> several policy areas, modelled separately, with severity tiers.",
                "<strong>What actions are available?</strong> <em>Assume:</em> a ladder \u2014 remove, restrict distribution, add a warning interstitial, or queue for human review. Having more than one action is what makes the design tractable.",
                "<strong>Is there human review capacity?</strong> <em>Assume:</em> yes, and it is small relative to volume \u2014 thousands of reviews per day against millions of posts. Its size is a hard constraint on the whole design.",
                "<strong>Where do labels come from?</strong> <em>Assume:</em> user reports, reviewer decisions, and a small deliberately-sampled audit set. All three are biased differently, which matters more than their volume.",
                "<strong>Proactive or reactive?</strong> <em>Assume:</em> proactive \u2014 score at upload, before distribution. That is what makes exposure reducible, and it puts a latency budget on the ingest path.",
                "<strong>Out of scope:</strong> writing policy, regional legal variation, and the reviewer tooling itself. Name them so it is clear you know they exist."
              ] },

              { t: "h", text: "Requirements" },
              { t: "ul", items: [
                "<strong>Functional:</strong> score every new post against each policy at upload; auto-action above a per-policy threshold; produce a <em>ranked</em> review queue sized to actual reviewer capacity; support appeal and reversal; keep an audit trail of every automated decision.",
                "<strong>Non-functional:</strong> below."
              ] },
              { t: "table",
                headers: ["Dimension", "Assumed target", "Why it binds"],
                rows: [
                  ["Ingest volume", "~10<sup>6</sup>\u201310<sup>7</sup> new items/day", "Cheap pre-filter tier is mandatory; you cannot run the heavy multimodal model on everything"],
                  ["Scoring latency", "fast enough to decide before distribution \u2014 sub-second for the cheap tier, seconds acceptable for the heavy tier", "Two-tier design: cheap model on everything, heavy model on the uncertain slice"],
                  ["Prevalence", "well under 1% for most policies", "Accuracy is a meaningless metric; PR-based metrics only"],
                  ["Precision floor on removal", "high, set by policy per severity tier \u2014 the number is theirs, not yours", "Determines the operating point and therefore recall"],
                  ["Review capacity", "~10<sup>3</sup> reviews/day", "The queue must be ranked, and its length is capped by people, not by compute"],
                  ["Label latency", "hours to days for reported content", "Recent data is the least complete data; training windows must account for it"]
                ]
              },

              { t: "h", text: "Framing the objective \u2014 Naive, Solid, Standout" },
              { t: "p", html: "This ladder is the best example in the whole track of why the objective deserves your first five minutes rather than your last." },
              { t: "table",
                headers: ["Tier", "Objective", "Why it lands there"],
                rows: [
                  ["<strong>Naive</strong>", "Remove the most harmful content possible", "Unbounded on the wrong side. Taken literally, removing everything scores perfectly. There is no term for the people you silenced, so the objective cannot tell a good system from a censorship machine."],
                  ["<strong>Naive</strong>", "Maximise classification accuracy", "At sub-1% prevalence, predicting \"safe\" for everything scores above 99%. The metric is dominated by the majority class and is essentially blind to the thing you care about. This one is worth naming explicitly because it is the default instinct."],
                  ["<strong>Solid</strong>", "Maximise the volume of harmful content removed, subject to a precision floor on removals", "Now both errors are represented: the floor bounds the harm you do to innocent authors, and within that constraint you maximise the harm you prevent. This is a defensible production objective."],
                  ["<strong>Standout</strong>", "Minimise <em>views</em> of harmful content, subject to that same precision floor", "The insight that separates senior from staff on this problem: harm is proportional to exposure, not to item count. A post seen by two people and a post seen by two million are not equal, so weight each candidate by its expected future views and let the queue and the actions follow that ordering. Same precision guarantee, far more harm prevented per unit of review capacity."]
                ]
              },
              { t: "p", html: "The Great row has a concrete mechanism, and you should give it: order the review queue and the borderline-action decisions by <code class='tok'>p(violates policy) &times; E[future views]</code>, not by <code class='tok'>p</code> alone. Predicted virality is itself a model, which you should admit \u2014 but even a crude version (author reach, early engagement velocity, item type) reorders the queue dramatically in favour of the items that actually matter. It also changes what \"recall\" should mean: report <strong>view-weighted recall</strong> alongside item recall, because the two can move in opposite directions." },

              { t: "h", text: "Model choice \u2014 Naive, Solid, Standout" },
              { t: "table",
                headers: ["Tier", "Choice", "Buys / costs"],
                rows: [
                  ["<strong>Naive</strong>", "Keyword and hash blocklists", "Buys instant, auditable, zero-latency enforcement, and for known-bad media hashes it remains genuinely correct forever \u2014 keep it as a tier. Costs you everything requiring context: it cannot distinguish a slur used as an attack from the same word quoted in a news report, and evasion is a single character substitution away."],
                  ["<strong>Naive</strong>", "One text classifier over the post body", "Buys a real improvement and handles the largest single modality. Costs you the majority of hard cases: harm arrives in images, video, audio, in the interaction between a benign caption and a violating image, and in coordinated behaviour that no single post reveals."],
                  ["<strong>Solid</strong>", "Per-policy multimodal classifiers (text + image/video frames + metadata) with severity-aware thresholds and routing into the review queue", "Buys per-policy operating points \u2014 essential, because a violent-threat threshold and a spam threshold should not be the same number \u2014 and the routing that turns scores into decisions. Costs you many models to train, monitor, and keep calibrated."],
                  ["<strong>Standout</strong>", "Shared multimodal encoder with per-policy heads, a cheap pre-filter tier in front of it, weak supervision for new policies, exposure-weighted queueing, and a fast path for hash-matched known media", "Buys sample efficiency where it is scarcest (rare policies borrow representation from common ones), the ability to stand up a new policy in days rather than months, and a compute profile that fits the ingest volume. Costs coupling and a genuinely complex evaluation surface \u2014 you now need per-policy, per-modality, per-language slices."]
                ]
              },
              { t: "note", variant: "warn", html: "<strong>The threshold is not an ML decision.</strong> It is the exchange rate between wrongful removals and prevented harm, and it has legal, regional, and editorial dimensions. Your job is to hand policy an honest precision/recall curve per policy area and implement whatever point they pick \u2014 then measure whether reality matched the curve. Choosing it yourself by maximising F1 silently asserts that precision and recall matter equally, which nobody would defend out loud." },
              { t: "widget", id: "mlcaseThreshold" },
              { t: "p", html: "Move the threshold in the lab above and watch what is actually happening: <strong>precision rises and recall falls, always, in that direction</strong>. Recall is monotone by definition \u2014 raising the bar can only remove items from the actioned set. Precision rises because a usefully ranked score means higher scores carry a higher true-positive rate, so discarding the lowest-scoring slice discards the worst-purity slice. Two things worth noticing: the review band is frequently many times larger than any plausible reviewer headcount, and at a threshold of 1.00 you have not built a cautious system, you have built no system." },

              { t: "h", text: "High-level design" },
              { t: "code", lang: "text", code:
                "INGEST (per new item)                    OFFLINE\n" +
                "-----------------------------------      ---------------------------------\n" +
                "new post\n" +
                "   |\n" +
                "   v\n" +
                "hash match / blocklist  --yes-->  act immediately, log\n" +
                "   | no\n" +
                "   v\n" +
                "CHEAP TIER (small model, all items)\n" +
                "   |                                     reviewer decisions ---+\n" +
                "   | uncertain slice only                 user reports --------+--> LABEL\n" +
                "   v                                      audit sample -------+     STORE\n" +
                "HEAVY TIER (multimodal, per-policy heads)                            |\n" +
                "   |                                                                v\n" +
                "   v                             training (per-policy heads,  shared encoder)\n" +
                "score_p  +  E[future views]                                        |\n" +
                "   |                                                                v\n" +
                "   +--> above auto-action threshold ---> ACTION (remove / restrict /\n" +
                "   |                                              interstitial) --> appeal\n" +
                "   +--> in review band ---> RANKED QUEUE (by p * views, capped at\n" +
                "   |                        reviewer capacity) --> reviewer --> label\n" +
                "   +--> below band ---> allow  (sampled for audit)\n" +
                "\n" +
                "appeal --> human re-review --> reversal + hard-negative label\n"
              },
              { t: "p", html: "The arrows that matter are the ones going <em>back</em>. <strong>Reviewer \u2192 label store</strong> is your highest-quality label source, which means the queue you build determines the training data you get \u2014 rank only by score and you will systematically never label the ambiguous low-score region, and your model will stay blind there. Reserve a slice of review capacity for <em>random</em> sampling specifically to get unbiased labels, even though it feels like wasting scarce reviewers. <strong>Appeal \u2192 hard-negative label</strong> is the other one: overturned decisions are exactly the examples your model is most confidently wrong about. And the <strong>below-band audit sample</strong> is the only way you can ever estimate what you are missing, since by construction nobody looks at that region." },

              { t: "h", text: "Data, features, and the label" },
              { t: "ul", items: [
                "<strong>Signals are multimodal and behavioural:</strong> post text (and its language), image and video frames, audio transcript, OCR text inside images \u2014 which is where a lot of evasion goes \u2014 plus author history, early engagement pattern, and the reaction of the audience (mass reporting, comment sentiment).",
                "<strong>Cross-modal cases are the hard ones.</strong> A benign caption over a violating image, or a violating caption over a benign image, are both invisible to any single-modality model. This is the strongest technical argument for a shared encoder over independent per-modality classifiers.",
                "<strong>The label definition is the hardest part of this problem.</strong> \"Harmful\" is a policy judgement, so the label is a human decision with real inter-rater disagreement on exactly the boundary cases you most need to learn. Treat reviewer agreement as data: items with split votes are genuinely ambiguous and should be trained on as soft labels rather than forced to 0 or 1.",
                "<strong>Label sources are biased in different directions.</strong> Reports over-represent content that got distribution and content that offended a vocal audience; reviewer decisions only exist for items you queued; the audit sample is the only unbiased source and it is small. Weight accordingly and never treat the union as one clean dataset."
              ] },
              { t: "note", variant: "trap", html: "<strong>Two failure modes specific to this problem.</strong> First, <em>label delay</em>: reports and reviews arrive hours to days late, so your most recent training window is systematically missing positives and looks deceptively clean. Second, <em>enforcement truncation</em>: content you removed generated no further engagement, so the behavioural features of positives in your training data are shaped by your own past interventions \u2014 the model partly learns \"what my predecessor removed\" instead of \"what is harmful\". Both are <a href='#/mlsd/serving/feedback-loops'>feedback loops</a>, and both are why the random audit sample is worth its cost." },

              { t: "h", text: "Evaluation and the deep dives you will be pushed on" },
              { t: "ul", items: [
                "<strong>Offline:</strong> precision at the policy-mandated recall, recall at the policy-mandated precision, and PR curves per policy. Never accuracy, and never a single global number across policies with different prevalences.",
                "<strong>Offline, the metric people forget:</strong> view-weighted recall. Item recall of 60% could mean you caught the two-view posts and missed the viral one, or the reverse. Only the view-weighted number tells you whether you reduced exposure.",
                "<strong>Slices are not optional here:</strong> per language, per region, per item type, per author-follower band. A model that performs well on average and badly in one language is a fairness problem and a policy incident waiting to happen.",
                "<strong>Online:</strong> prevalence of harmful content measured on a randomly sampled and human-reviewed slice of what users actually saw \u2014 that is the north-star number, because it is measured on the output of the whole system rather than on the classifier. Plus appeal rate and appeal-overturn rate as your false-positive alarm, and review-queue utilisation and age."
              ] },
              { t: "ol", items: [
                "<strong>\"You have capacity for 1,000 reviews a day and 50,000 uncertain items. What do you do?\"</strong> The expected answer: rank the queue by expected harm prevented, not by score; spend a fixed fraction on random sampling for unbiased labels; use the action ladder so the middle band gets a cheap reversible action (reduced distribution, interstitial) rather than waiting for a human; and be explicit that items which age out are a measured loss, not an invisible one.",
                "<strong>Adversarial evasion.</strong> Operators probe your thresholds and adapt \u2014 character substitution, cropping, re-encoding, text baked into images. Same dynamic as <a href='#/mlcase/trust/bot-detection'>bot detection</a>: your model decays because you deployed it, so retraining cadence and drift detection are design requirements. Never explain in the user-facing message exactly which signal fired.",
                "<strong>Precision floors and small policies.</strong> For a rare, high-severity policy you may have only hundreds of positive examples. Weak supervision, transfer from the shared encoder, and human-in-the-loop for everything above a low threshold are the realistic answers \u2014 and sometimes the honest answer is that a policy is not automatable yet and should be routed entirely to humans."
              ] },
              { t: "cue", html: "The framing that lands: \u201cI'd optimise for reducing <em>views</em> of violating content subject to a precision floor that policy sets, not for the count of items removed \u2014 harm scales with exposure. The classifier's real output is a ranked queue against a fixed review capacity, so the queue order and the action ladder are as much of the design as the model is.\u201d" },

              { t: "h", text: "How this scores at each level" },
              { t: "table",
                headers: ["Bar", "On this problem, that means"],
                rows: [
                  ["<strong>Mid</strong>", "Builds a text classifier, knows accuracy is wrong under imbalance and reaches for precision/recall. Mentions human review as a fallback. Usually picks the threshold themselves and does not distinguish item count from exposure."],
                  ["<strong>Senior</strong>", "States the objective as bounded removal under a precision floor, hands threshold selection to policy explicitly, designs the two-tier cheap/heavy architecture for the stated volume, treats the review queue as capacity-constrained and ranked, and names label delay and noise with concrete handling."],
                  ["<strong>Staff</strong>", "Optimises exposure rather than item count and can justify the view-weighting. Designs the label-generation loop deliberately \u2014 including spending scarce review capacity on random samples for unbiased evaluation \u2014 names enforcement truncation as a feedback loop, reasons about per-language and per-region fairness slices, and knows which policies should not be automated at all."]
                ]
              },
              { t: "note", variant: "key", html: "<strong>Harm scales with exposure, so the objective should too.</strong> Minimise views of violating content subject to a precision floor that somebody else owns; treat the ranked human-review queue and the graduated action ladder as first-class parts of the system; and spend some of your scarcest resource \u2014 reviewer time \u2014 on random samples, because it is the only way you ever learn what you missed." }
            ]
          },

          /* ---------- 5. bot detection ---------- */
          {
            id: "bot-detection",
            title: "Detecting automated accounts",
            summary: "The problem where your opponent retrains against you: graph and behavioural signals, asymmetric false-positive cost, and why appeals are part of the architecture.",
            minutes: 11,
            tags: ["abuse", "adversarial", "graph-features", "appeals"],
            blocks: [
              { t: "p", html: "Every other problem on this track assumes the world is indifferent to your model. This one does not. Behind the accounts you are classifying is someone with a budget, a feedback signal (their accounts got banned), and an incentive to find the cheapest change that stops that happening. <strong>Your deployment is an intervention on the data-generating process.</strong> A model that decays after launch is not broken; it is working, and the opponent is responding. The consequence to internalise up front: <strong>a static model is a wrong answer here regardless of its accuracy.</strong> The deliverable is a system with a retraining cadence, drift detection, an action ladder graded by confidence, and a reversal path \u2014 not a classifier with a good validation score." },

              { t: "h", text: "The ask, and the questions worth the first five minutes" },
              { t: "ul", items: [
                "<strong>What counts as a bot?</strong> <em>Assume:</em> automation used for abuse \u2014 spam, fake engagement, scraping, credential stuffing. Note explicitly that plenty of automation is legitimate (publishing tools, accessibility clients, sanctioned APIs), so \"automated\" is not the label; \"abusive automation\" is.",
                "<strong>What actions are available?</strong> <em>Assume:</em> a ladder \u2014 silent rate limit, challenge (verification step), feature restriction, suspension. Multiple actions at different confidences is the single most important design lever you have.",
                "<strong>What is the decision latency?</strong> <em>Assume:</em> two paths. A real-time path at signup and login (milliseconds, thin features) and an asynchronous path that re-scores accounts on a schedule with rich history and graph features. Trying to do everything in one path is a common wrong turn.",
                "<strong>Where do labels come from?</strong> <em>Assume:</em> confirmed abuse (spam reports, payment fraud), manual investigations, appeal outcomes, and honeypots. All are sparse and delayed.",
                "<strong>How bad is a false positive?</strong> <em>Assume:</em> severe and personal \u2014 a real person locked out of their account, sometimes their livelihood. This asymmetry drives the whole operating-point discussion.",
                "<strong>Out of scope:</strong> account recovery flows, the challenge implementation itself, and the payments-fraud model. Adjacent, not this."
              ] },

              { t: "h", text: "Requirements" },
              { t: "ul", items: [
                "<strong>Functional:</strong> score accounts and key actions for abusive automation; apply graduated actions by confidence; detect coordinated groups, not just individuals; support appeal with human review and full reversal; keep an audit trail of which signals drove each action.",
                "<strong>Non-functional:</strong> below, and note that one of them is about <em>decay</em>, which is unusual and is the point."
              ] },
              { t: "table",
                headers: ["Dimension", "Assumed target", "Why it binds"],
                rows: [
                  ["Real-time path latency", "tens of milliseconds at signup/login", "Only thin features available; no graph traversal, no long history"],
                  ["Async re-scoring", "all active accounts re-scored on a schedule (hours\u2013daily)", "Where the graph and behavioural-history features live"],
                  ["Precision floor, hard actions", "very high \u2014 suspension is the most expensive mistake in the system", "Sets the suspension threshold; everything below it gets a softer action"],
                  ["Model decay", "measurable within weeks of a deploy; retrain cadence must beat it", "Retraining and monitoring are requirements, not maintenance"],
                  ["Coverage", "must catch coordinated rings, not only individually-suspicious accounts", "Forces a graph or clustering component alongside the per-account classifier"],
                  ["Appeal turnaround", "bounded, and reversal must be complete", "An appeals path with a queue is part of the architecture"]
                ]
              },

              { t: "h", text: "Framing the objective \u2014 Naive, Solid, Standout" },
              { t: "table",
                headers: ["Tier", "Objective", "Why it lands there"],
                rows: [
                  ["<strong>Naive</strong>", "Block all bots", "Two failures in three words. It has no term for the real users you lock out, and it targets the wrong class \u2014 much automation is legitimate, so \"all bots\" would break sanctioned integrations on day one."],
                  ["<strong>Naive</strong>", "Maximise the classifier's AUC", "A metric masquerading as an objective. It says nothing about which errors cost what, nothing about the action taken, and \u2014 critically here \u2014 nothing about holding up over time against an adapting opponent. A model can have excellent AUC on last month's attack and be useless on this month's."],
                  ["<strong>Solid</strong>", "Maximise abusive accounts actioned, subject to a precision floor on hard actions", "Correct shape: bounded harm to real users, maximise enforcement inside that bound. Enough to run a real system."],
                  ["<strong>Standout</strong>", "Minimise <em>abuse delivered</em> \u2014 spam sent, fake engagement served, scraped volume \u2014 subject to a false-positive ceiling on authentic accounts, with a graduated action ladder and measured resistance to evasion", "Optimises the damage rather than the account count (the same exposure insight as <a href='#/mlcase/trust/harmful-content'>harmful content</a>: a dormant fake account causes nothing, a high-volume one causes a lot). Adds the two things this problem uniquely needs: the action ladder, so confidence maps to severity, and evasion resistance as an explicit objective rather than a hope."]
                ]
              },
              { t: "p", html: "Why the action ladder deserves to be in the objective and not in an appendix: a single threshold forces one decision for every confidence level, which means you either suspend on weak evidence or do nothing about a whole population of probably-abusive accounts. With a ladder you can rate-limit at 0.6, challenge at 0.8, and suspend at 0.97 \u2014 and challenges are especially valuable because they are <em>cheap for a real user and expensive for an operator running ten thousand accounts</em>. That asymmetry is a design tool, not an inconvenience." },

              { t: "h", text: "Model choice \u2014 Naive, Solid, Standout" },
              { t: "table",
                headers: ["Tier", "Choice", "Buys / costs"],
                rows: [
                  ["<strong>Naive</strong>", "Static rules and rate limits", "Buys instant, explainable, cheap enforcement and stays useful forever as a floor \u2014 keep it. Costs you adaptivity: a fixed rule is a published specification of exactly what to stay under, and operators find the edge within days."],
                  ["<strong>Naive</strong>", "Supervised classifier on static account attributes (age, followers, profile completeness)", "Buys a quick win on lazy automation. Costs you everything else: these are the cheapest features to fake, so the model's lifetime is short and it disproportionately flags legitimate new users, who look exactly like fresh fake accounts."],
                  ["<strong>Solid</strong>", "Gradient-boosted model over behavioural, device, and graph-aggregate features, retrained frequently, feeding a graduated action ladder", "Buys features that are expensive to fake \u2014 timing regularity, device consistency, network structure \u2014 plus fast retraining, which is the property that matters most in an adversarial setting. Costs feature-pipeline complexity and a hard dependency on labels that arrive late."],
                  ["<strong>Standout</strong>", "Ensemble of three complementary detectors: the supervised model; an unsupervised graph/clustering tier that finds coordinated rings without labels; and an anomaly tier for behaviour that is simply unlike anything human \u2014 plus adversarial evaluation and staged rollout", "Buys robustness through diversity: evading all three simultaneously is much more expensive than evading one, and the unsupervised tier can catch a novel campaign before any label exists for it. Costs operational weight \u2014 three things to tune, plus a fusion policy \u2014 and unsupervised tiers need careful precision control before they touch anything."]
                ]
              },
              { t: "note", variant: "tip", html: "<strong>The most valuable feature family here is the one the opponent cannot cheaply change.</strong> A profile photo is free to change; a coherent device, network, and social-graph footprint across ten thousand accounts is not. That is why graph and behavioural-consistency features outlive attribute features \u2014 you are not looking for suspicious accounts, you are looking for accounts that are suspiciously <em>similar to each other</em>." },

              { t: "h", text: "High-level design" },
              { t: "code", lang: "text", code:
                "REAL-TIME PATH                          ASYNC PATH  (hours \u2192 daily)\n" +
                "-----------------------------------     -----------------------------------\n" +
                "signup / login / post action            all active accounts\n" +
                "        |                                       |\n" +
                "        v                                        v\n" +
                "thin features (device, IP,              behavioural history (timing\n" +
                "  velocity counters)                    regularity, session entropy)\n" +
                "        |                               device + network footprint\n" +
                "        v                               GRAPH FEATURES (shared device/IP,\n" +
                "  fast model (ms)                        co-follow, creation bursts)\n" +
                "        |                                       |\n" +
                "        v                                        v\n" +
                "  ACTION LADDER  <--------------------  ensemble: supervised +\n" +
                "  0.6 rate limit                        clustering + anomaly\n" +
                "  0.8 challenge                                  |\n" +
                "  0.97 suspend                                   v\n" +
                "        |                               cluster-level decisions\n" +
                "        v                               (action a ring together)\n" +
                "  user-facing outcome\n" +
                "        |\n" +
                "        v\n" +
                "  APPEAL --> human investigation --> reverse? --> LABEL STORE\n" +
                "                                                     |\n" +
                "  honeypots + confirmed abuse + investigations ------>+\n" +
                "                                                     v\n" +
                "                                        retrain (frequent) + DRIFT MONITOR\n" +
                "                                        (precision decay per attack family)\n"
              },
              { t: "p", html: "Three arrows are load-bearing. <strong>Graph features \u2192 cluster-level decisions</strong>: the unit of enforcement should sometimes be the ring rather than the account, because a coordinated campaign is far easier to identify collectively than member-by-member. <strong>Appeal \u2192 label store</strong>: overturned suspensions are your most informative training examples, since they are precisely where the model was confidently wrong; an appeals path is therefore both an ethical requirement and your best hard-negative mining pipeline. <strong>Drift monitor \u2192 retrain</strong>: track precision <em>per attack family</em> over time, because aggregate precision can look stable while one family collapses. See <a href='#/mlsd/serving/drift-monitoring'>drift monitoring</a> for the general machinery." },

              { t: "h", text: "Data, features, and the label" },
              { t: "ul", items: [
                "<strong>Behavioural:</strong> inter-action timing (humans are irregular; scripts often are not), session length distribution, action mix, activity across the 24-hour clock, typing and interaction cadence where available. Regularity itself is the signal.",
                "<strong>Graph:</strong> accounts sharing device fingerprints or IP ranges, co-follow and co-engagement overlap, creation-time clustering, and the shape of the local follow graph. Aggregate these into per-account features, and also cluster on them directly.",
                "<strong>Device and network:</strong> fingerprint stability, emulator and datacentre-IP indicators, consistency between claimed and observed platform.",
                "<strong>The label is genuinely hard, in a different way from moderation.</strong> There is no ground truth about intent. \"Confirmed abuse\" is high-precision but low-recall and biased toward attacks you already detect; unlabelled is not negative, it is unknown. Treating unlabelled accounts as clean negatives will teach the model that anything your current detectors miss is fine \u2014 which is exactly backwards. Positive-unlabelled framing, honeypots, and human investigations are how you get out of this.",
                "<strong>Honeypots</strong> deserve a mention: deliberately attractive targets that only automation would engage with give you clean positives that are not selected by your existing model."
              ] },
              { t: "note", variant: "trap", html: "<strong>The fairness trap here is specific and common: new legitimate users look exactly like new fake accounts.</strong> Little history, sparse graph, default profile, unusual device \u2014 every attribute-based model penalises them. Left unchecked, your abuse system becomes a bad onboarding experience concentrated on people joining from newer devices, cheaper networks, or regions with heavy carrier NAT (where many real users genuinely share an IP). Slice precision and false-positive rate by account age, region, and network type before you ship, and prefer behavioural evidence over attribute priors for young accounts." },

              { t: "h", text: "Evaluation and the deep dives you will be pushed on" },
              { t: "ul", items: [
                "<strong>Offline:</strong> precision and recall on confirmed-abuse labels, but read them knowing recall is unmeasurable in absolute terms \u2014 you cannot compute the denominator for abuse nobody detected. Report recall against <em>known</em> abuse and say so.",
                "<strong>Time-forward evaluation is mandatory:</strong> train on one period, test on the next, and report how much precision decays across the gap. A model evaluated on a random split of an adversarial dataset is measuring nothing useful.",
                "<strong>Online primary:</strong> abuse delivered \u2014 spam messages received per user, fake engagement served, scrape volume \u2014 because that is the damage. Account counts are an activity metric, not an outcome metric.",
                "<strong>Online guardrails:</strong> appeal rate and appeal-overturn rate as the false-positive proxy you actually get to observe; challenge pass rate; and false-positive rate sliced by account age and region. A rising overturn rate is the alarm that matters most.",
                "<strong>Adversarial evaluation:</strong> red-team your own model. If a small team can find a cheap evasion in a week, the opponent will find it faster."
              ] },
              { t: "ol", items: [
                "<strong>\"Precision drops 15% two weeks after every deploy. Is your model bad?\"</strong> No \u2014 that is the expected signature of an adapting opponent, and the design question is whether your retraining cadence and drift alarms are faster than the decay. Distinguish this from ordinary <a href='#/mlsd/serving/drift-monitoring'>drift</a>: here the shift is caused by your own deployment, so it will not stop.",
                "<strong>Why the appeals path is architecture, not customer support.</strong> It bounds the worst-case harm of a false positive, which is what makes a high-severity automated action defensible at all; it produces your best labels; and its overturn rate is a live estimate of your real precision on hard actions. Design its queue and turnaround like you would design any other component.",
                "<strong>Information leakage to the adversary.</strong> Every message you show and every threshold you expose teaches the opponent. Keep user-facing explanations generic, avoid deterministic thresholds an operator can binary-search, and consider randomised enforcement delays so the mapping from behaviour to action is not trivially learnable."
              ] },
              { t: "cue", html: "The sentence that shows you have thought about the adversary: \u201cThe opponent retrains against me, so the model decays <em>because</em> I deployed it \u2014 that makes retraining cadence, per-attack-family drift monitoring, and hard-to-fake graph features part of the design rather than operational follow-up. And because a false positive locks out a real person, I'd use an action ladder with a very high precision floor on suspension and treat appeals as both the remedy and my hard-negative pipeline.\u201d" },

              { t: "h", text: "How this scores at each level" },
              { t: "table",
                headers: ["Bar", "On this problem, that means"],
                rows: [
                  ["<strong>Mid</strong>", "Builds a supervised classifier on account and behavioural features and knows false positives are costly. Usually treats unlabelled accounts as negatives and evaluates on a random split, missing the adversarial dynamic entirely."],
                  ["<strong>Senior</strong>", "Leads with the adversarial framing and designs for decay: frequent retraining, time-forward evaluation, drift monitoring. Uses graph and behavioural features because they are expensive to fake, splits real-time from async scoring, and maps confidence to a graduated action ladder rather than one threshold."],
                  ["<strong>Staff</strong>", "Optimises abuse delivered rather than accounts caught, treats the appeals loop as architecture (remedy, label source, and live precision estimate), handles the positive-unlabelled label problem explicitly with honeypots and investigations, reasons about information leakage back to the adversary, and slices false positives by account age and region as a fairness requirement."]
                ]
              },
              { t: "quiz", id: "mlcase-trust" },
              { t: "note", variant: "key", html: "<strong>You are not classifying a fixed distribution \u2014 you are playing a repeated game.</strong> Design for decay (retrain fast, monitor per attack family, prefer features that are expensive to fake), grade actions by confidence so weak evidence never produces a severe outcome, and treat the appeals path as a first-class component: it is the remedy, the label source, and your only honest read on precision." }
            ]
          }
        ]
      },

      /* ==================== RETRIEVAL ==================== */
      {
        id: "retrieval",
        name: "Search & Retrieval",
        icon: "database",
        lessons: [

          /* ---------- 6. search ranking ---------- */
          {
            id: "search-ranking",
            title: "Ranking results for a text query",
            summary: "Lexical versus dense retrieval and why hybrid wins, learning-to-rank, debiasing click logs, and the freshness-relevance tension.",
            minutes: 11,
            tags: ["search", "hybrid-retrieval", "learning-to-rank", "position-bias"],
            blocks: [
              { t: "p", html: "Search differs from recommendation in one decisive way: <strong>the user told you what they want.</strong> That query is the strongest feature you will ever get, and it changes the shape of the problem \u2014 intent is explicit, sessions are short and goal-directed, and success has a crisp definition (they found it and stopped looking) that recommendation never gets. The mental model is still a funnel, but with a twist worth stating: <strong>retrieval decides your ceiling, ranking decides how close you get to it.</strong> No amount of reranking recovers a document that retrieval never returned, which is why the retrieval design gets real attention here rather than being waved through." },

              { t: "h", text: "The ask, and the questions worth the first five minutes" },
              { t: "ul", items: [
                "<strong>What corpus?</strong> <em>Assume:</em> a large document collection \u2014 order 10<sup>8</sup> documents \u2014 of mixed length and quality. Web-scale versus enterprise-scale changes the infrastructure but not the reasoning.",
                "<strong>What do queries look like?</strong> <em>Assume:</em> a heavy head of repeated queries and a long tail of rare ones, mostly short (a few words), a mix of navigational, informational, and time-sensitive intents. The head/tail split matters: the head can be cached and hand-tuned, the tail is where your model earns its keep.",
                "<strong>Is there existing traffic?</strong> <em>Assume:</em> yes \u2014 you have click logs. This is good news and a trap, and half this lesson is about the trap.",
                "<strong>What is success?</strong> <em>Assume:</em> the user's need is met without reformulating or abandoning. Not \"they clicked\".",
                "<strong>Latency budget?</strong> <em>Assume:</em> a couple of hundred milliseconds p99 for the whole result page. That is generous compared with an ad auction and tight compared with an offline pipeline \u2014 enough for a two-pass ranker over a small top-k, not enough for an unbounded one.",
                "<strong>Out of scope:</strong> crawling, indexing infrastructure, spelling correction, and query autocomplete. The inverted-index machinery is Blueprint's territory; here it is a component you consume."
              ] },

              { t: "h", text: "Requirements" },
              { t: "ul", items: [
                "<strong>Functional:</strong> given a query and a user context, return a ranked page of results; handle rare exact-match tokens (error codes, part numbers, names) as well as paraphrase; incorporate freshness where the intent calls for it; log impressions with positions so the system can learn without teaching itself its own bias.",
                "<strong>Non-functional:</strong> below."
              ] },
              { t: "table",
                headers: ["Dimension", "Assumed target", "Why it binds"],
                rows: [
                  ["Corpus", "~10<sup>8</sup> documents", "Retrieval must be sublinear \u2014 inverted index and/or ANN, never a scan"],
                  ["Page latency", "~200 ms p99 end to end", "Retrieval tens of ms, first-pass ranking tens of ms, reranker limited to a small top-k"],
                  ["Retrieval depth", "~10<sup>3</sup> candidates to first-pass ranking; ~10<sup>2</sup> to the reranker", "Sets the compute budget per stage and therefore the model class at each stage"],
                  ["Recall@1000", "as high as you can get it \u2014 this is the ceiling on everything downstream", "Justifies hybrid retrieval on its own"],
                  ["Index freshness", "new and updated documents searchable in minutes for time-sensitive intents", "Forces an incremental index path alongside periodic rebuilds"]
                ]
              },

              { t: "h", text: "Framing the objective \u2014 Naive, Solid, Standout" },
              { t: "table",
                headers: ["Tier", "Objective", "What it does to the product"],
                rows: [
                  ["<strong>Naive</strong>", "Maximise clicks on results", "Optimises the title and the snippet, not the answer, and rewards documents engineered to look clickable. Worse, it is measured on a log that your own ranking produced, so it partly rewards \"was already ranked highly\"."],
                  ["<strong>Naive</strong>", "Maximise click-through rate at position one", "Superficially sharper and still wrong. It punishes queries that legitimately have no single good answer, ignores abandonment entirely, and says nothing about the user who clicked, bounced, and reformulated \u2014 the clearest possible failure, scored as a success."],
                  ["<strong>Solid</strong>", "Maximise NDCG against graded human relevance judgements", "A real objective with a real signal. Human judgements are unbiased by your ranking, gradeable rather than binary, and stable enough to compare models across quarters. Costs money and does not scale to the tail."],
                  ["<strong>Standout</strong>", "Maximise successful sessions \u2014 the share of queries resolved without reformulation or abandonment \u2014 using debiased clicks as the dense training signal and NDCG on judgements as the trustworthy offline check", "Names the outcome (need met), the scalable signal (clicks, corrected for position bias), and the honest referee (judgements). Each covers the others' weakness: clicks are plentiful and biased, judgements are clean and scarce, sessions are what the product is for."]
                ]
              },
              { t: "note", variant: "tip", html: "The three-signal structure is worth saying explicitly because it generalises: <strong>a dense biased signal for training, a sparse clean signal for validation, and a business outcome for the decision.</strong> Whenever you have plentiful behavioural data and expensive ground truth, that is usually the right arrangement \u2014 not a choice between them. See <a href='#/mlsd/concepts/evaluation'>the metric ladder</a>." },

              { t: "h", text: "Model choice \u2014 Naive, Solid, Standout" },
              { t: "table",
                headers: ["Tier", "Choice", "Buys / costs"],
                rows: [
                  ["<strong>Naive</strong>", "Lexical retrieval only (inverted index with a term-weighting score), ranked by that score", "Buys a genuinely strong baseline: exact matching, near-zero cost, complete interpretability, no training data required, and it never embarrasses you on a rare literal string. Costs you the vocabulary gap \u2014 a query and a document that mean the same thing in different words simply do not match."],
                  ["<strong>Naive</strong>", "Dense retrieval only (bi-encoder plus ANN), ranked by vector similarity", "Buys semantic matching and paraphrase robustness. Costs you precision on exactly the queries where users are least forgiving: rare tokens, identifiers, and names get smeared into a neighbourhood of plausible-looking text. Also needs training data and a full re-embedding whenever the encoder changes."],
                  ["<strong>Solid</strong>", "Hybrid retrieval (lexical \u222a dense, fused) into a learning-to-rank first pass over hundreds of features, trained on debiased clicks and judgements", "Buys most of the available recall and a strong, fast, well-understood ranker \u2014 a gradient-boosted ranking model over feature vectors is still an excellent choice here. Costs two retrieval systems, a fusion step to tune, and a feature pipeline."],
                  ["<strong>Standout</strong>", "Hybrid retrieval \u2192 LTR first pass \u2192 cross-encoder reranker on the top ~100, distilled to hit the latency budget, with freshness weighting conditioned on predicted query intent", "Buys the biggest single quality jump available \u2014 a cross-encoder reads query and document <em>together</em>, so it can judge relationships a bi-encoder's independent vectors cannot represent. Costs latency (it is a serial hop over ~100 documents), a distillation step, and an intent model that can itself be wrong."]
                ]
              },
              { t: "p", html: "Why hybrid genuinely wins rather than being a hedge: the two methods fail on <em>different</em> queries. Lexical retrieval fails when the words differ and the meaning matches; dense retrieval fails when the words matter more than the meaning. Because those failure sets barely overlap, the union recovers far more than either alone \u2014 and fusion can be as simple as combining each system's rank positions rather than trying to make two incomparable score scales agree. The bi-encoder/cross-encoder distinction is the same independence trade-off as the two towers in <a href='#/mlcase/recsys/video-recommendations'>video recommendations</a>: precomputable and cheap, or joint and expensive. See <a href='#/mlsd/concepts/embeddings'>embeddings</a> and <a href='#/mlsd/concepts/ann-serving'>ANN serving</a>." },

              { t: "h", text: "High-level design" },
              { t: "code", lang: "text", code:
                "OFFLINE                                 ONLINE  (per query)\n" +
                "-----------------------------------     -----------------------------------\n" +
                "documents                                query\n" +
                "   |                                        |\n" +
                "   +--> tokenize ---> INVERTED INDEX        v\n" +
                "   |                       ^          query understanding\n" +
                "   +--> encode -----> ANN INDEX ^      (intent, freshness need, entities)\n" +
                "                              | |            |\n" +
                "click logs                    | |            v\n" +
                "   |                          | +----- LEXICAL RETRIEVAL  ---+\n" +
                "   v                          |                              |\n" +
                "propensity estimation          +------ DENSE RETRIEVAL  -----+\n" +
                "  (from randomized swaps)                                    |\n" +
                "   |                                                          v\n" +
                "   v                                                    FUSION (~1000)\n" +
                "IPW-weighted training set                                     |\n" +
                "   +  human judgements                                        v\n" +
                "   |                                                LTR FIRST PASS (~100)\n" +
                "   v                                                          |\n" +
                "LTR + reranker training ---> model registry --------->         v\n" +
                "                                                     CROSS-ENCODER RERANK\n" +
                "                                                              |\n" +
                "                                                              v\n" +
                "                                                     freshness / diversity\n" +
                "                                                     blend by intent\n" +
                "                                                              |\n" +
                "                                                              v\n" +
                "                                                     page + position log\n"
              },
              { t: "p", html: "Two arrows carry the lesson. <strong>Randomised swaps \u2192 propensity estimation \u2192 training set</strong>: you deliberately perturb a small fraction of live traffic so you can measure how examination falls with position, and that measurement is what makes the click log usable. It costs a little relevance on that traffic slice and it is worth it. <strong>Query understanding \u2192 freshness blend</strong>: freshness is not a global weight, it is intent-conditioned, so the branch that predicts intent has to run before the blend. Everything about the index itself \u2014 sharding, replication, caching the head queries \u2014 is Blueprint's subject, and you should say so rather than re-deriving it." },

              { t: "h", text: "Data, features, and the label" },
              { t: "ul", items: [
                "<strong>Log</strong> every result's position, the full slate, dwell after click, whether the user reformulated, and whether the session ended without a click. Abandonment is a label, and it is invisible if you only log clicks.",
                "<strong>Features</strong> span four families: query (length, intent, rarity), document (quality, length, freshness, authority), query\u2013document match (term overlap, field matches, dense similarity, cross-encoder score), and behavioural (historical CTR for this query\u2013document pair \u2014 powerful for the head, useless for the tail, and a leakage risk if computed carelessly).",
                "<strong>The label is the hard part, and it is hard in an interesting way:</strong> the plentiful signal is systematically wrong. A click is <em>evidence of relevance conditioned on having been examined</em>, and examination collapses with rank. So raw clicks encode your previous ranking as much as they encode relevance.",
                "<strong>Better click labels</strong> come from combining signals: a click with long dwell and no reformulation is a strong positive; a click followed by an immediate return and a reworded query is a negative; the last click in a session often marks the satisfying result."
              ] },
              { t: "h2", text: "Position bias, and how to actually fix it" },
              { t: "p", html: "Model a click as roughly two things happening: the user <em>examined</em> the result, and the result was <em>relevant</em>. Examination depends mostly on position; relevance is what you want. Since you only observe the product, a naive model trained on raw clicks learns \"things at the top get clicked\" and reproduces the ranking it was trained on \u2014 a closed loop that is stable, self-confirming, and wrong." },
              { t: "ul", items: [
                "<strong>Inverse propensity weighting.</strong> Weight each observed click by 1/(probability that its position was examined). A click at position nine, where examination is rare, then counts for much more than one at position one. This makes the biased log an unbiased estimator, at the cost of higher variance on the rarely-examined tail \u2014 which is why you clip the weights.",
                "<strong>Estimating the propensities</strong> is the part that requires design, not just math: you need an intervention. Randomly swapping adjacent result pairs, or interleaving two rankings, on a small traffic slice lets you observe the same document at different positions and read examination off directly.",
                "<strong>Alternatively, model the bias explicitly.</strong> Train a two-part model where one component consumes position and the other consumes relevance features, then drop the position component at serving time. Cheaper than running randomisation, but it leans on the assumption that position affects examination and nothing else.",
                "<strong>What does not work:</strong> dropping low positions (throws away the tail you most need), or normalising by query frequency (fixes a different problem entirely)."
              ] },
              { t: "note", variant: "trap", html: "<strong>Freshness versus relevance is not one global dial.</strong> Boost recency everywhere and you degrade every timeless query \u2014 documentation, reference material, definitions. Ignore it and you fail every time-sensitive query, badly and visibly. The resolution is that <em>the freshness weight is itself a prediction</em>: some intents demand recency and most do not, so predict the query's time sensitivity (from query terms, from how result CTR by document age varies for that query, from spikes in query volume) and blend accordingly. Getting this wrong is one of the most user-visible failures in search." },

              { t: "h", text: "Evaluation and the deep dives you will be pushed on" },
              { t: "ul", items: [
                "<strong>Offline, trustworthy:</strong> NDCG on a human-judged query set, stratified across head and tail and across intent types. This is your referee because it is independent of your current ranking.",
                "<strong>Offline, scalable:</strong> IPW-corrected click metrics on held-out logged traffic. Cheap, plentiful, and only as good as your propensity estimates \u2014 report both these and NDCG, and worry when they disagree.",
                "<strong>Retrieval separately from ranking:</strong> recall@1000 for the retrieval stage. It is the ceiling, it is easy to measure, and it is where hybrid retrieval proves its value.",
                "<strong>Online:</strong> successful-session rate, reformulation rate, abandonment rate, and clicks at position one. Interleaving experiments are especially valuable in search \u2014 they compare two rankings on the same user and are far more sensitive than a split test, though they measure preference rather than absolute outcome. Standard A/B for the final call (<a href='#/mlsd/concepts/ab-testing'>A/B testing</a>).",
                "<strong>Slice by query frequency band.</strong> A model that wins on average by improving the head while degrading the tail is usually the wrong trade, and the average will not tell you."
              ] },
              { t: "ol", items: [
                "<strong>\"Your offline click metric improved and the online test was flat. Why?\"</strong> Leading suspect: your offline metric is computed on logs your old ranker produced, so it rewards agreeing with the incumbent. Second suspect: propensity estimates are stale or wrong. Third: you improved the head and the online metric is dominated by the tail. Naming all three and how to distinguish them is a strong answer.",
                "<strong>Head versus tail strategy.</strong> Head queries are repeated enough to cache, hand-audit, and learn query-specific behavioural features for. Tail queries have no behavioural signal at all, so they depend entirely on content matching \u2014 which is exactly where dense retrieval and the cross-encoder earn their cost. Saying that these are two different problems sharing one pipeline is a senior observation.",
                "<strong>Where the cross-encoder goes and why it is last.</strong> It is the most accurate and most expensive component, so it runs on the smallest candidate set. If latency will not permit it, distil it into the first-pass ranker \u2014 train the cheap model to imitate the expensive one's scores \u2014 which recovers a real share of the quality at first-pass cost."
              ] },
              { t: "cue", html: "The two sentences that earn credit here: \u201cI'd retrieve hybrid \u2014 lexical for rare exact tokens, dense for paraphrase \u2014 because their failure modes are largely uncorrelated, and retrieval recall is the ceiling on everything downstream. And I would not train on raw clicks: a click is relevance <em>times</em> examination, and examination collapses with position, so I'd reweight by estimated propensity with propensities measured from a small randomised slice, and keep human judgements as the referee.\u201d" },

              { t: "h", text: "How this scores at each level" },
              { t: "table",
                headers: ["Bar", "On this problem, that means"],
                rows: [
                  ["<strong>Mid</strong>", "Retrieves with an inverted index or embeddings, ranks with a trained model on sensible query\u2013document features, and evaluates with NDCG. Usually trains on raw clicks without flagging position bias."],
                  ["<strong>Senior</strong>", "Argues hybrid retrieval from uncorrelated failure modes, separates retrieval recall from ranking quality as distinct metrics, raises position bias unprompted and proposes IPW with a concrete way to estimate propensities, and places the cross-encoder correctly against the latency budget."],
                  ["<strong>Staff</strong>", "Frames the objective as successful sessions and explains the three-signal arrangement (biased-dense for training, clean-sparse for validation, business outcome for the decision). Treats freshness as an intent-conditioned prediction rather than a dial, distinguishes head and tail as different problems, and can debug offline-improves/online-flat from first principles."]
                ]
              },
              { t: "note", variant: "key", html: "<strong>Retrieval sets your ceiling; click logs lie in a predictable direction.</strong> Go hybrid because lexical and dense fail on different queries, and never train on raw clicks \u2014 a click is relevance times examination, so reweight by measured propensity and keep a small human-judged set as the referee your logs cannot be." }
            ]
          },

          /* ---------- 7. RAG assistant ---------- */
          {
            id: "rag-assistant",
            title: "A retrieval-augmented assistant over a document corpus",
            summary: "Chunking, hybrid retrieve-then-rerank, grounding and citations, measuring hallucination, and splitting a latency and cost budget across the pipeline.",
            minutes: 12,
            tags: ["rag", "grounding", "hallucination", "latency-budget", "cost"],
            blocks: [
              { t: "p", html: "The ask: users type a question in natural language and get an answer grounded in your corpus, with citations. The temptation is to treat this as a prompt-engineering exercise. Resist it \u2014 <strong>this is a retrieval system with a generator on the end</strong>, and almost every failure you will debug is a retrieval failure wearing a generation costume. The mental model that keeps you honest: <strong>the generator can only be as correct as what you put in its context, and it will produce a confident, fluent answer either way.</strong> That asymmetry \u2014 quality varies, confidence does not \u2014 is why hallucination has to be measured rather than hoped away, and why an abstention path is a feature and not an admission of defeat." },

              { t: "h", text: "The ask, and the questions worth the first five minutes" },
              { t: "ul", items: [
                "<strong>What corpus, and how does it change?</strong> <em>Assume:</em> order 10<sup>6</sup> documents of internal reference material \u2014 policies, runbooks, product docs \u2014 updated continuously, with real version churn. Stale answers are a correctness bug here, not an inconvenience.",
                "<strong>What kinds of questions?</strong> <em>Assume:</em> mostly single-fact lookups and short procedural how-tos, with a minority needing synthesis across documents. Multi-hop reasoning is a different and much harder system; scope it out loud.",
                "<strong>Does access control apply?</strong> <em>Assume:</em> yes \u2014 users may only see what they are entitled to. This is the one requirement that cannot be approximated, and it constrains the retrieval path directly.",
                "<strong>What happens when the answer is not in the corpus?</strong> <em>Assume:</em> the assistant must say so. Getting explicit agreement that <em>abstention counts as success</em> reshapes the entire evaluation design.",
                "<strong>Latency and cost targets?</strong> <em>Assume:</em> first token within about a second, complete answer within a few seconds, and a per-query cost budget tight enough that you cannot rerank a thousand candidates with a large model.",
                "<strong>Out of scope:</strong> training or fine-tuning the generator, multi-turn dialogue state, and tool use or actions. Say it, then design the retrieval system properly."
              ] },

              { t: "h", text: "Requirements" },
              { t: "ul", items: [
                "<strong>Functional:</strong> answer a natural-language question using only retrieved corpus content; cite the passages used; abstain when support is insufficient; respect per-user access control at retrieval time; reflect document updates within minutes; stream the answer.",
                "<strong>Non-functional:</strong> below \u2014 and note that the latency line is a <em>decomposition</em>, because a single end-to-end number tells you nothing about where to optimise."
              ] },
              { t: "table",
                headers: ["Stage", "Assumed budget (order of magnitude)", "What it constrains"],
                rows: [
                  ["Query understanding / embedding", "a few ms to low tens of ms", "One small encoder pass; no room for a large model here"],
                  ["Hybrid retrieval (lexical + dense)", "tens of ms", "ANN index plus inverted index, run in parallel, not in series"],
                  ["Reranking", "tens of ms for ~20\u201350 candidates", "Caps candidate count and reranker size \u2014 this is the main quality/latency dial"],
                  ["Generation, first token", "the dominant term \u2014 hundreds of ms and up", "Why time-to-first-token plus streaming is the target rather than total latency"],
                  ["Generation, full answer", "grows with output length", "Answer length is a cost and latency parameter, so bound it deliberately"],
                  ["Corpus freshness", "minutes from document update to retrievable", "Incremental indexing and re-embedding of changed chunks only"]
                ]
              },
              { t: "note", variant: "tip", html: "<strong>Decomposing the latency budget is itself the senior move.</strong> \u201cUnder two seconds\u201d is a wish; \u201c30 ms retrieval, 40 ms rerank, first token by 800 ms, streamed thereafter\u201d is a design you can hold each component accountable to. It also immediately shows you where the money is: generation dominates, so retrieval and reranking should be tuned for quality within a tight fixed budget rather than shaved for speed." },

              { t: "h", text: "Framing the objective \u2014 Naive, Solid, Standout" },
              { t: "table",
                headers: ["Tier", "Objective", "Why it lands there"],
                rows: [
                  ["<strong>Naive</strong>", "Answer every question the user asks", "Guarantees hallucination. Coverage as an objective means the system is rewarded for producing something when the corpus contains nothing, and a fluent wrong answer about a policy is worse than no answer at all \u2014 it will be acted on."],
                  ["<strong>Naive</strong>", "Maximise a model-rated helpfulness score", "Cheap and dangerous. An automated judge rewards fluency, structure, and confidence, all of which a hallucination has in abundance. Optimise against it directly and you get answers that read beautifully and are unsupported \u2014 you have taught the system to satisfy the referee."],
                  ["<strong>Solid</strong>", "Maximise the rate of grounded, correct answers subject to a hallucination ceiling", "Correct shape. It makes unsupported claims a bounded budget rather than an unmeasured externality, which is exactly what a precision floor does for moderation."],
                  ["<strong>Standout</strong>", "Maximise resolved questions per session subject to a hallucination ceiling <em>and</em> a per-query cost/latency budget \u2014 with a correct abstention counted as a resolution", "Optimises the user's actual outcome, prices in the constraint that makes production RAG hard (cost and latency, not accuracy alone), and encodes the crucial policy that saying \u201cthis isn't in the corpus, here's who owns it\u201d is a <em>win</em>. Without that last clause the system is structurally pushed toward guessing."]
                ]
              },

              { t: "h", text: "Model choice \u2014 Naive, Solid, Standout" },
              { t: "table",
                headers: ["Tier", "Choice", "Buys / costs"],
                rows: [
                  ["<strong>Naive</strong>", "No retrieval \u2014 rely on the generator's parametric knowledge, or dump as much of the corpus into the context as fits", "Buys a demo in an hour. Costs you correctness (nothing is grounded, nothing is citable, updates never propagate) and, for the context-dump variant, cost and latency that scale with the corpus while attention to any single relevant passage gets diluted."],
                  ["<strong>Naive</strong>", "Dense-only retrieval, top-k straight into the prompt", "Buys the standard tutorial pipeline, and it works on easy questions. Costs you the queries that matter most in a reference corpus: exact identifiers, error codes, policy numbers, and version strings, all of which dense retrieval smears. It also has no way to reorder a mediocre top-k."],
                  ["<strong>Solid</strong>", "Hybrid retrieval \u2192 cross-encoder rerank of ~20\u201350 candidates \u2192 grounded generation with per-claim citations", "Buys the largest available quality jump for a bounded latency cost. The reranker matters more here than in search, because you are not showing ten results \u2014 you are choosing the handful of passages the answer will be built from, so precision at the very top is everything."],
                  ["<strong>Standout</strong>", "Query understanding and routing \u2192 structure-aware chunking with parent expansion \u2192 hybrid retrieval with access filtering \u2192 rerank \u2192 grounded generation with citations and an abstention path \u2192 caching plus a cheap/expensive route split", "Buys production viability: routing sends easy questions down a cheap path and keeps the expensive one for questions that need it, parent expansion decouples the retrieval unit from the reading unit, and abstention bounds the worst case. Costs a genuinely multi-component system where each part needs its own evaluation."]
                ]
              },

              { t: "h", text: "Chunking: the decision that quietly sets your ceiling" },
              { t: "p", html: "A chunk plays two roles that want opposite things. As the <em>retrieval unit</em> it wants to be small and topically pure, because one embedding has to represent the whole thing and a vector averaging four topics matches none of them well. As the <em>reading unit</em> it wants to be large enough to be self-contained, because a paragraph that says \u201cthis does not apply to enterprise accounts\u201d is worse than useless without the sentence defining what \u201cthis\u201d is." },
              { t: "ul", items: [
                "<strong>Too small:</strong> sharp retrieval, fragmentary context. The generator gets a true sentence stripped of its caveat and produces an answer that is technically sourced and practically wrong.",
                "<strong>Too large:</strong> muddy embeddings, diluted matches, wasted context and cost. Recall degrades in a way that is hard to see because you are still retrieving <em>something</em> plausible.",
                "<strong>Split on structure, not on character count.</strong> Headings, sections, list boundaries, and table rows carry the author's own semantics \u2014 use them, and keep tables intact rather than slicing them mid-row.",
                "<strong>Decouple the two roles.</strong> Retrieve on small chunks, then expand the winner to its parent section before handing it to the generator. This is the single highest-leverage change most RAG pipelines are missing.",
                "<strong>Carry metadata on every chunk:</strong> source document, section path, version, effective date, and access-control labels. Citations, freshness filtering, and access enforcement all depend on it, and retrofitting it later means re-indexing everything.",
                "<strong>Modest overlap</strong> between adjacent chunks stops facts from being severed at a boundary, at a proportional cost in index size."
              ] },
              { t: "note", variant: "warn", html: "<strong>Access control cannot be a post-filter.</strong> If you retrieve the top-k and then remove what the user may not see, you have already leaked the shape of the corpus through result counts and, worse, you may hand the generator a passage that gets summarised into the answer. Filter <em>during</em> retrieval by carrying access labels on the chunk and constraining the query. This is the requirement in this design with the least room for approximation." },

              { t: "h", text: "High-level design" },
              { t: "code", lang: "text", code:
                "INDEXING PIPELINE                       QUERY PATH\n" +
                "-----------------------------------     -----------------------------------\n" +
                "documents (continuous updates)          question + user identity\n" +
                "   |                                            |\n" +
                "   v                                            v\n" +
                "parse -> structure-aware chunk          query understanding\n" +
                "   |     (+ metadata: source,           (intent, route, entities,\n" +
                "   |      section, version, ACL)          answerable-from-corpus?)\n" +
                "   v                                            |\n" +
                "   +--> lexical index                           v\n" +
                "   |                                   cache hit? --yes--> stream cached\n" +
                "   +--> embed -> vector index                    | no\n" +
                "   |      (re-embed changed chunks only)         v\n" +
                "   v                                     HYBRID RETRIEVAL (parallel)\n" +
                "eval sets:                               lexical || dense, ACL-filtered\n" +
                "  golden Q/A, claim-level                        |\n" +
                "  groundedness, abstention set                   v\n" +
                "   |                                     FUSE -> ~50 candidates\n" +
                "   v                                             |\n" +
                "offline eval  <--- sampled traffic               v\n" +
                "   |                                     CROSS-ENCODER RERANK -> top ~5\n" +
                "   v                                             |\n" +
                "human audit of judge  ------------->             v\n" +
                "                                         parent expansion\n" +
                "                                                 |\n" +
                "                                                 v\n" +
                "                                         enough support? --no--> ABSTAIN\n" +
                "                                                 | yes             (+ route\n" +
                "                                                 v                  to owner)\n" +
                "                                         GROUNDED GENERATION\n" +
                "                                         cite per claim, stream tokens\n" +
                "                                                 |\n" +
                "                                                 v\n" +
                "                                         log: retrieved set, citations,\n" +
                "                                         abstention, latency per stage\n"
              },
              { t: "p", html: "Three arrows are doing real work. <strong>\u201cEnough support?\u201d \u2192 abstain</strong> is the branch most implementations omit, and it is the one that bounds your worst case: if the reranked top passages score poorly, no prompt instruction will conjure grounding, so refuse and route the user to a human owner. <strong>Re-embed changed chunks only</strong> is what makes continuous corpus updates affordable \u2014 re-embedding a million documents because forty changed is the kind of cost mistake that gets a project cancelled. <strong>Log the retrieved set and the citations</strong>, not just the answer: when someone reports a wrong answer, the first question is always whether the right passage was retrieved and, if it was, whether the generator ignored it \u2014 and you cannot answer that after the fact without the log." },

              { t: "h", text: "Measuring hallucination, properly" },
              { t: "p", html: "\u201cThe model hallucinates sometimes\u201d is not a metric, and you cannot improve what you have not instrumented. Groundedness is a property of <em>individual assertions</em>, so the unit of evaluation has to be the claim, not the response \u2014 an answer with four supported claims and one invented one is not 80% fine, it is wrong in the way that gets acted on." },
              { t: "ol", items: [
                "<strong>Decompose the answer into atomic claims.</strong> Automatable, and it forces the evaluation to be specific rather than a vibe.",
                "<strong>Check each claim against the retrieved passages</strong> \u2014 is it entailed, contradicted, or simply absent? Absent is the interesting category, because that is the hallucination.",
                "<strong>Use an automated judge for volume, and audit it with humans.</strong> A judge is a model with its own error rate, so maintain a human-labelled slice and report the judge's agreement with it. Without that number your hallucination rate is unfalsifiable.",
                "<strong>Track retrieval and generation failures separately.</strong> Recall@k on a golden query set tells you whether the answer was even reachable. Answers that were unsupported <em>despite</em> the right passage being present are a generation or prompting problem. Conflating them means you optimise the wrong half of the pipeline for a quarter.",
                "<strong>Keep an explicit abstention set:</strong> questions you know the corpus cannot answer. Measure how often the system correctly declines. A system that never abstains has not solved hallucination, it has hidden it."
              ] },
              { t: "note", variant: "trap", html: "<strong>Fluency is anti-correlated with your ability to notice the problem.</strong> The dangerous failure is not a garbled answer, it is a well-structured, appropriately-hedged, plausibly-cited answer whose third sentence is invented. This is why helpfulness ratings, readability scores, and user thumbs-up are all inadequate as groundedness measures \u2014 and why citations must be checked to actually support the claim they are attached to, rather than merely being present. A citation that does not support its claim is worse than none, because it manufactures trust." },

              { t: "h", text: "Cost control, and the deep dives you will be pushed on" },
              { t: "ul", items: [
                "<strong>Cache aggressively at two levels:</strong> exact-question cache for repeats, and a retrieval cache keyed on the normalised query, since retrieval is deterministic given a corpus version. Head questions repeat far more than people expect.",
                "<strong>Route by difficulty.</strong> Most questions are simple lookups that a small model answers correctly from two well-chosen passages. Reserve the expensive generator for questions the router flags as needing synthesis, and measure the router's error rate \u2014 it is a model too.",
                "<strong>Bound the context.</strong> Cost and latency scale with what you put in the prompt, and past a handful of well-ranked passages the marginal one usually adds noise rather than support. A better reranker is cheaper than a bigger context.",
                "<strong>Distil the reranker.</strong> Same move as in <a href='#/mlcase/retrieval/search-ranking'>search ranking</a>: train a small cross-encoder to imitate a large one, and keep most of the quality at a fraction of the latency.",
                "<strong>Bound the output.</strong> Answer length is the single easiest cost lever and it usually improves the product \u2014 for a reference corpus, short and cited beats long and discursive."
              ] },
              { t: "ol", items: [
                "<strong>\u201cUsers say answers are outdated. Where do you look?\u201d</strong> Walk the pipeline in order: is the document indexed, was the changed chunk re-embedded, is the stale version <em>also</em> still in the index (the most common cause \u2014 update-as-insert without delete), does the reranker prefer the old chunk, and does the prompt tell the generator to prefer the most recent effective date when passages conflict? Version metadata on chunks is what makes this debuggable at all.",
                "<strong>\u201cRetrieval recall is 95% but answers are still wrong.\u201d</strong> Then the failure is downstream: the right passage was retrieved but ranked below the context cut, or it was in context and the generator preferred its own parametric knowledge, or the passage was truncated away from the qualifier that changed its meaning. These have different fixes, which is exactly why you measure the stages separately.",
                "<strong>\u201cHow do you know it is getting better?\u201d</strong> A frozen golden set with claim-level groundedness labels, an abstention set, per-stage latency percentiles, and cost per resolved question \u2014 tracked over time, with the judge re-audited against humans each time you change it. Vibes-based iteration on RAG systems is how teams spend six months and cannot say whether they improved."
              ] },
              { t: "cue", html: "The framing that separates a designer from a prompt-tuner: \u201cAlmost every wrong answer here is a retrieval failure, so I'd invest in chunking, hybrid retrieval, and a reranker before touching the prompt \u2014 and I'd measure groundedness at the claim level against the retrieved passages, with an explicit abstention set, because a fluent unsupported answer is the failure mode that actually causes harm.\u201d" },

              { t: "h", text: "How this scores at each level" },
              { t: "table",
                headers: ["Bar", "On this problem, that means"],
                rows: [
                  ["<strong>Mid</strong>", "Builds chunk \u2192 embed \u2192 top-k \u2192 prompt, with citations. Knows hallucination is a risk and addresses it with prompt instructions. Typically has no measurement plan and no abstention path."],
                  ["<strong>Senior</strong>", "Argues hybrid retrieval and a reranker from the corpus's actual query mix, treats chunking as a real design decision with the retrieval/reading trade named, decomposes the latency budget per stage, and measures groundedness at the claim level rather than rating answers holistically."],
                  ["<strong>Staff</strong>", "Designs the evaluation before the pipeline: golden set, claim-level groundedness with a human-audited judge, abstention set, per-stage attribution of failures. Treats cost per resolved question as a first-class constraint with routing and caching to manage it, enforces access control inside retrieval, and makes abstention an explicitly successful outcome."]
                ]
              },

              { t: "h", text: "What generalises from all seven" },
              { t: "p", html: "You have now worked seven problems that look nothing alike \u2014 a video surface, a feed, an auction, two abuse systems, a search engine, an assistant. The same handful of moves did most of the work every time, and that transfer is the real deliverable of this track." },
              { t: "ul", items: [
                "<strong>The objective is the design.</strong> Every problem here turned on the objective ladder, and every ladder had the same shape: a naive proxy with a known pathology, a better proxy that bounds the harm, then a framing that optimises the thing you actually care about \u2014 exposure rather than item count, session value rather than clicks, resolved questions rather than answers produced.",
                "<strong>Constrained optimisation beats a single number.</strong> \u201cMaximise X subject to a floor on Y\u201d appeared in almost every Great row, because it is the only framing that represents both ways of being wrong. Whenever you catch yourself proposing one metric to maximise, ask what it lets you destroy.",
                "<strong>Two stages, cheap then expensive.</strong> Retrieval and ranking; cheap tier and heavy tier in moderation; first-pass ranker and cross-encoder; lookup route and synthesis route. Whenever candidates outnumber your compute budget, the answer is a funnel \u2014 and the cheap stage's only job is to not lose the good item.",
                "<strong>The label is usually the hard part.</strong> Watch time needs normalising; feed engagement is several labels with different thresholds; a click needs an attribution window; harm is a human judgement with real disagreement; \u201cbot\u201d has no ground truth at all; a click in search is relevance times examination. If a problem's label seems obvious, you have not looked at it yet.",
                "<strong>Your model chooses the data your successor trains on.</strong> Exposure bias, enforcement truncation, position bias, adversarial adaptation \u2014 four names for one dynamic. The countermeasures are always some mix of deliberate randomisation, exploration budget, and unbiased audit samples, and all three feel wasteful right up until you need them.",
                "<strong>Say the numbers, label them as assumptions.</strong> Every requirements table on these pages is an order of magnitude with the word \u201cassume\u201d attached. That is not hedging \u2014 it is what makes the design checkable, and it invites the correction that saves you fifteen minutes of designing for the wrong scale."
              ] },
              { t: "p", html: "Next: pressure-test the framework itself in <a href='#/mlsd/framework/assessment'>assessment</a>, and check your reading of the bar against <a href='#/mlsd/framework/level-expectations'>level expectations</a>. If any beat on these seven pages felt like recitation rather than reasoning, the concept behind it is in <a href='#/mlsd/framework/what-is-mlsd'>the mlsd track</a> \u2014 and the fastest way to find out which is to pick a problem nobody wrote up and run the eight beats on it yourself." },
              { t: "quiz", id: "mlcase-retrieval" },
              { t: "note", variant: "key", html: "<strong>RAG is a retrieval system with a generator attached, and hallucination is a measurement problem before it is a modelling one.</strong> Chunk on structure and retrieve small but read large, go hybrid then rerank, enforce access control inside retrieval, count abstention as success, and score groundedness claim by claim against the passages you actually retrieved \u2014 with a human-audited judge, or your hallucination rate is just a number you made up." }
            ]
          }
        ]
      }
    ]
  };
})();
