/* Synapse practice reference — scenario packs, interview prompts, rubrics,
   cheat sheets, and glossary for the practice hub. Every `route` here must
   resolve to a real lesson in window.TRACKS.mlsd / window.TRACKS.mlcase. */
window.SynapsePractice = {
  nav: [
    {
      id: "scenarios",
      route: "#/scenarios",
      title: "Scenario packs",
      label: "Model-answer outlines",
      color: "#a78bfa",
      icon: "map",
      summary: "Compact outlines you can talk through end to end for the ML design problems that come up most."
    },
    {
      id: "interview",
      route: "#/interview",
      title: "Interview prompts",
      label: "Timed practice",
      color: "#38bdf8",
      icon: "quiz",
      summary: "Timed prompts with the points an interviewer is listening for and the follow-ups they will push on."
    },
    {
      id: "rubrics",
      route: "#/rubrics",
      title: "Rubrics",
      label: "Score yourself",
      color: "#34d399",
      icon: "star",
      summary: "The dimensions an ML design round is scored on, and what each band actually sounds like."
    },
    {
      id: "cheatsheets",
      route: "#/cheatsheets",
      title: "Cheat sheets",
      label: "Fast recall",
      color: "#fbbf24",
      icon: "md",
      summary: "The sequences and numbers worth having in memory before you walk in."
    },
    {
      id: "glossary",
      route: "#/glossary",
      title: "Glossary",
      label: "Say it precisely",
      color: "#f472b6",
      icon: "lesson",
      summary: "The terms you will be expected to use correctly, with the sentence that shows you mean it."
    }
  ],

  scenarios: [
    {
      id: "recommendation-surface",
      title: "A recommendation surface, end to end",
      subtitle: "The most common ML design prompt, and the one where objective framing decides your score.",
      timebox: "45 min",
      prompt: "Design the system that decides what to show on a content home surface for tens of millions of daily users.",
      related: [
        { label: "Objective framing", route: "#/mlsd/framework/problem-framing" },
        { label: "Retrieval and ranking", route: "#/mlsd/serving/retrieval-ranking" },
        { label: "Video recommendations", route: "#/mlcase/recsys/video-recommendations" }
      ],
      outline: [
        {
          title: "Frame the objective before anything else",
          items: [
            "Say out loud that clicks are a proxy, and a bad one: optimizing them selects for misleading thumbnails.",
            "Walk the ladder deliberately — clicks, then watch time, then a satisfaction-weighted objective with quality guardrails.",
            "Name the guardrail metrics you would refuse to regress, so the objective is falsifiable."
          ]
        },
        {
          title: "Split retrieval from ranking",
          items: [
            "Cheap high-recall candidate generation narrows millions of items to a few hundred; an expensive ranker orders those.",
            "Justify the candidate-set size as a latency budget decision, not a round number.",
            "Cover multiple retrieval sources — recent, personalized, and popular — and why a single source under-serves new users."
          ]
        },
        {
          title: "Be concrete about features and labels",
          items: [
            "Name the five signal sources and which ones you would ship first given cold-start risk.",
            "Define the positive label precisely, including the dwell threshold that separates a real view from a bounce.",
            "Call out position bias in the logs and say how you would keep the training data honest."
          ]
        },
        {
          title: "Close with operations",
          items: [
            "State the offline metric, the online guardrails, and why an offline win often fails to replicate.",
            "Describe the feedback loop and the exploration budget that stops it degenerating.",
            "Give the monitoring signal that would fire before the business metric moved."
          ]
        }
      ]
    },
    {
      id: "moderation-pipeline",
      title: "A content moderation pipeline",
      subtitle: "Where the graded objective ladder matters most, and where the threshold is a policy decision.",
      timebox: "45 min",
      prompt: "Design a system that detects and acts on harmful content across a large user-generated platform.",
      related: [
        { label: "Harmful content breakdown", route: "#/mlcase/trust/harmful-content" },
        { label: "Evaluation metrics", route: "#/mlsd/concepts/evaluation" },
        { label: "Feature pitfalls", route: "#/mlsd/concepts/feature-pitfalls" }
      ],
      outline: [
        {
          title: "Get the objective right",
          items: [
            "Reject 'maximize accuracy' explicitly — with severe class imbalance a do-nothing model scores well.",
            "Move to removal subject to a precision floor, then to minimizing harmful views subject to that floor.",
            "Explain why exposure is the right target: a post removed after a million views is a failure the earlier framings score as success."
          ]
        },
        {
          title: "Design for two decisions, not one",
          items: [
            "Auto-action above a high threshold, human review in a band, ignore below — three regions, two thresholds.",
            "Treat the review queue as part of the system, with a capacity you must design against.",
            "State plainly that threshold selection is a policy call informed by cost, not an ML optimum."
          ]
        },
        {
          title: "Handle the label problem",
          items: [
            "Labels arrive late, disagree between reviewers, and shift as policy changes — say so.",
            "Describe how you would measure inter-reviewer agreement and treat it as a ceiling on model quality.",
            "Cover appeals as a labelled data source and as a fairness requirement."
          ]
        },
        {
          title: "Anticipate the deep dives",
          items: [
            "Multimodal signals, and why text alone under-performs on the hardest cases.",
            "Adversarial adaptation, and the retraining cadence it forces.",
            "What you would do when a single viral item is being missed right now."
          ]
        }
      ]
    },
    {
      id: "retrieval-assistant",
      title: "A grounded assistant over a document corpus",
      subtitle: "Retrieval quality dominates, and hallucination is an evaluation problem you must actually measure.",
      timebox: "45 min",
      prompt: "Design an assistant that answers questions over a large private document corpus with citations.",
      related: [
        { label: "RAG assistant breakdown", route: "#/mlcase/retrieval/rag-assistant" },
        { label: "Approximate nearest neighbour", route: "#/mlsd/concepts/ann-serving" },
        { label: "Inference architecture", route: "#/mlsd/serving/inference-architecture" }
      ],
      outline: [
        {
          title: "Start with retrieval, not generation",
          items: [
            "Say early that most answer-quality failures are retrieval failures, so that is where the design effort goes.",
            "Cover chunking as a real design decision with a measurable effect on recall.",
            "Argue for hybrid lexical plus dense retrieval, then a reranker over a small candidate set."
          ]
        },
        {
          title: "Make grounding checkable",
          items: [
            "Require citations back to retrieved spans so an answer can be audited.",
            "Define an evaluation set with known answers, and measure groundedness rather than asserting it.",
            "Describe the behaviour when retrieval returns nothing relevant — refusing is a feature."
          ]
        },
        {
          title: "Budget latency and cost explicitly",
          items: [
            "Decompose the request budget across retrieval, reranking, and generation.",
            "Stream tokens so perceived latency is the time to first token, not the total.",
            "Name the levers when cost is too high: smaller candidate sets, caching, a cheaper reranker."
          ]
        }
      ]
    }
  ],

  interview: [
    {
      id: "video-recs-45",
      title: "Video recommendations in 45 minutes",
      timebox: "45 min",
      prompt: "Design the ranking system for a video home feed serving 50 million daily users.",
      expected: [
        "Walks the objective ladder from clicks to watch time to a satisfaction-weighted target with guardrails.",
        "Separates candidate generation from ranking and justifies the candidate-set size against a latency budget.",
        "Defines the positive label precisely, including a dwell threshold.",
        "Names position bias in the logs and a concrete way to mitigate it.",
        "Closes with online guardrails and an exploration budget for the feedback loop."
      ],
      followups: [
        "A new creator uploads their first video. How does it ever get shown?",
        "Your offline metric improved but the online test was flat. What do you check first?",
        "Halve your serving budget. What comes out of the design?"
      ],
      links: [
        { label: "Video recommendations lesson", route: "#/mlcase/recsys/video-recommendations" },
        { label: "Objective framing", route: "#/mlsd/framework/problem-framing" }
      ]
    },
    {
      id: "ad-click-45",
      title: "Ad click prediction in 45 minutes",
      timebox: "45 min",
      prompt: "Design click-through prediction for an ad auction with a strict per-request latency budget.",
      expected: [
        "Recognizes that an auction needs calibrated probabilities, not just correct ordering.",
        "Handles extreme class imbalance and explains why ROC-AUC alone is misleading here.",
        "Covers very high-cardinality categorical features and a hashing or embedding strategy.",
        "Decomposes the latency budget and states what that rules out.",
        "Distinguishes the business metric from the ML metric and keeps both on the table."
      ],
      followups: [
        "Your model ranks well but the auction is over-charging. What is wrong?",
        "How would you detect that your calibration has drifted?",
        "Which feature would you remove first if it doubled your serving cost?"
      ],
      links: [
        { label: "Ad click breakdown", route: "#/mlcase/recsys/ad-click-prediction" },
        { label: "Evaluation metrics", route: "#/mlsd/concepts/evaluation" }
      ]
    },
    {
      id: "bot-detection-40",
      title: "Bot detection in 40 minutes",
      timebox: "40 min",
      prompt: "Design a system that identifies automated accounts on a large social platform.",
      expected: [
        "Treats the problem as adversarial and states that a static model decays by design.",
        "Uses graph and behavioural features, not just per-account attributes.",
        "Reasons about the asymmetric cost of false positives against real users.",
        "Includes an appeals path as part of the system design.",
        "Gives a retraining and monitoring cadence tied to the adversary's adaptation."
      ],
      followups: [
        "Your precision looks excellent. Why might that be misleading here?",
        "An attacker learns your main feature. What breaks and what do you do?",
        "How do you evaluate when your labels are themselves produced by an earlier version of the model?"
      ],
      links: [
        { label: "Bot detection breakdown", route: "#/mlcase/trust/bot-detection" },
        { label: "Feature pitfalls", route: "#/mlsd/concepts/feature-pitfalls" }
      ]
    },
    {
      id: "search-ranking-45",
      title: "Search ranking in 45 minutes",
      timebox: "45 min",
      prompt: "Design ranking for text search over a very large and frequently updated corpus.",
      expected: [
        "Compares lexical and dense retrieval and argues for a hybrid rather than picking one.",
        "Uses learning-to-rank over a candidate set rather than scoring the whole corpus.",
        "Identifies click logs as biased training data and names a debiasing approach.",
        "Handles the freshness-versus-relevance tension explicitly.",
        "Discusses tail latency from the slowest shard in a scatter-gather design."
      ],
      followups: [
        "A query with no clicks in your logs performs badly. How do you improve it?",
        "How would you keep the index near-real-time without wrecking query latency?",
        "Your ranker is great on head queries and poor on tail queries. Why, and what now?"
      ],
      links: [
        { label: "Search ranking breakdown", route: "#/mlcase/retrieval/search-ranking" },
        { label: "Retrieval and ranking", route: "#/mlsd/serving/retrieval-ranking" }
      ]
    }
  ],

  rubrics: {
    dimensions: [
      "Problem navigation and objective framing",
      "ML fundamentals — features, models, and their trade-offs",
      "System design sense — retrieval, serving, and latency budgets",
      "Evaluation rigour, offline and online",
      "Operational thinking — drift, feedback loops, and failure",
      "Communication and structured pacing"
    ],
    bands: [
      {
        id: "beginner",
        title: "Beginner",
        summary: "Names plausible models but leaves the objective vague and the evaluation story unspecified.",
        signals: [
          "Jumps to a model choice before defining what success means.",
          "Uses accuracy as the metric on a heavily imbalanced problem.",
          "Draws a training pipeline with no serving path, or the reverse.",
          "Does not mention how the system is monitored after launch."
        ]
      },
      {
        id: "competent",
        title: "Competent",
        summary: "Frames a measurable objective, designs a workable two-stage system, and evaluates it honestly.",
        signals: [
          "States a business metric, a product metric, and an ML metric, and connects them.",
          "Separates retrieval from ranking and justifies the split.",
          "Picks metrics appropriate to the task family and explains why.",
          "Identifies at least one real failure mode such as cold start or leakage."
        ]
      },
      {
        id: "strong",
        title: "Strong",
        summary: "Reaches the objective that actually captures the goal, and treats the feedback loop as part of the design.",
        signals: [
          "Walks the graded ladder out loud and explains why each earlier framing fails.",
          "Anticipates that offline gains may not replicate online, and plans for it.",
          "Designs exploration into the loop rather than bolting it on.",
          "Names the monitoring signal that fires before the business metric moves.",
          "Volunteers the trade-off they are least comfortable with instead of hiding it."
        ]
      }
    ]
  },

  cheatsheets: [
    {
      id: "mlsd-flow",
      title: "The 45-minute sequence",
      summary: "Phase order and time budget for an ML design round.",
      items: [
        "1. Requirements and scope — who uses it, what decision it makes, what scale (~5 min).",
        "2. Objective framing — business goal to ML objective, graded out loud (~3 min).",
        "3. High-level design — offline path and online path, including the logging arrow back (~10 min).",
        "4. Data and features — sources, label definition, leakage and bias risks (~10 min).",
        "5. Training and evaluation — splits, offline metrics, online guardrails (~7 min).",
        "6. Deep dives — follow the interviewer, and volunteer the weakest part of your own design."
      ]
    },
    {
      id: "metric-picker",
      title: "Which metric, and when",
      summary: "Task family to metric, with the trap attached to each.",
      items: [
        "Binary classification, balanced — accuracy is acceptable; state the base rate anyway.",
        "Binary classification, imbalanced — precision, recall, and PR-AUC. ROC-AUC flatters a weak model here.",
        "Ranking — recall@k for the retrieval stage, NDCG or MRR for the ordering stage.",
        "Probability estimation for auctions or thresholds — calibration, not just ordering.",
        "Regression — mean absolute error when outliers are noise, squared error when they are costly.",
        "Always pair the ML metric with the product metric it is a proxy for, and name the gap."
      ]
    },
    {
      id: "objective-ladder",
      title: "Grading an objective",
      summary: "The four rungs, and the question that moves you up each one.",
      items: [
        "Bad — optimizes a raw proxy. Ask: what does gaming this look like?",
        "Bad — optimizes an aggregate that imbalance makes meaningless. Ask: what does doing nothing score?",
        "Good — optimizes the goal subject to a stated guardrail. Ask: who bears the cost of the guardrail?",
        "Great — optimizes the quantity that actually causes the outcome, subject to the same guardrail.",
        "Sanity check: if a lazy system scores well on your objective, the objective is wrong."
      ]
    },
    {
      id: "failure-checklist",
      title: "Failure modes to volunteer",
      summary: "Say these before the interviewer has to ask.",
      items: [
        "Leakage — a feature that encodes the label, usually via timing.",
        "Cold start — new users and new items, and the fallback path for both.",
        "Training/serving skew — the same feature computed two different ways.",
        "Feedback loop — the model shapes the data that trains its successor.",
        "Position and presentation bias — logged clicks reflect what you showed, not what was best.",
        "Drift — inputs move, labels arrive late, and the business metric notices last."
      ]
    }
  ],

  glossary: [
    {
      id: "calibration",
      term: "Calibration",
      definition: "The property that a predicted probability matches the observed frequency — among items scored 0.3, roughly 30% are positive.",
      useIt: "Insist on it whenever the score feeds arithmetic, such as an auction bid or an expected-value threshold. A ranker only needs order; a price needs truth.",
      links: [
        { label: "Ad click prediction", route: "#/mlcase/recsys/ad-click-prediction" },
        { label: "Evaluation", route: "#/mlsd/concepts/evaluation" }
      ]
    },
    {
      id: "leakage",
      term: "Leakage",
      definition: "When a feature carries information about the label that would not be available at prediction time, usually because it was computed after the fact.",
      useIt: "Name it as the first thing you would audit when an offline metric looks implausibly good.",
      links: [{ label: "Feature pitfalls", route: "#/mlsd/concepts/feature-pitfalls" }]
    },
    {
      id: "training-serving-skew",
      term: "Training/serving skew",
      definition: "A mismatch between how a feature is computed during training and how it is computed at serving time, which silently degrades a model that tested well.",
      useIt: "Cite it as the concrete failure a feature store exists to prevent.",
      links: [{ label: "Feature stores", route: "#/mlsd/concepts/feature-stores" }]
    },
    {
      id: "two-stage-retrieval",
      term: "Two-stage retrieval",
      definition: "Cheap high-recall candidate generation followed by expensive high-precision ranking over the surviving candidates.",
      useIt: "Reach for it whenever the item catalogue is far larger than what you can afford to score per request.",
      links: [{ label: "Retrieval and ranking", route: "#/mlsd/serving/retrieval-ranking" }]
    },
    {
      id: "embedding",
      term: "Embedding",
      definition: "A dense vector representation learned so that geometric closeness corresponds to task-relevant similarity.",
      useIt: "Use it to explain how retrieval over millions of items becomes a nearest-neighbour lookup.",
      links: [{ label: "Embeddings", route: "#/mlsd/concepts/embeddings" }]
    },
    {
      id: "ann",
      term: "Approximate nearest neighbour",
      definition: "An index that trades a small amount of recall for a large reduction in search latency over high-dimensional vectors.",
      useIt: "State the recall/latency knob explicitly rather than treating the index as exact.",
      links: [{ label: "ANN serving", route: "#/mlsd/concepts/ann-serving" }]
    },
    {
      id: "cold-start",
      term: "Cold start",
      definition: "The absence of interaction history for a new user or a new item, which disables exactly the features that carry the most signal.",
      useIt: "Pair every interaction-history feature with the fallback you would use before that history exists.",
      links: [{ label: "Feature engineering", route: "#/mlsd/concepts/feature-engineering" }]
    },
    {
      id: "position-bias",
      term: "Position bias",
      definition: "The tendency of items shown higher in a list to be clicked more regardless of relevance, which corrupts click logs used as labels.",
      useIt: "Raise it whenever you propose training on logged clicks, and name a debiasing approach.",
      links: [{ label: "Search ranking", route: "#/mlcase/retrieval/search-ranking" }]
    },
    {
      id: "feedback-loop",
      term: "Feedback loop",
      definition: "The cycle in which a model's own outputs determine the data that trains its successor, narrowing what the system can ever learn.",
      useIt: "Propose an exploration budget as the standard mitigation, and say what it costs.",
      links: [{ label: "Feedback loops", route: "#/mlsd/serving/feedback-loops" }]
    },
    {
      id: "drift",
      term: "Drift",
      definition: "Change over time in input distributions, prediction distributions, or the relationship between them, degrading a model that was correct at launch.",
      useIt: "Distinguish input drift, which you can detect immediately, from label drift, which you cannot until ground truth arrives.",
      links: [{ label: "Drift monitoring", route: "#/mlsd/serving/drift-monitoring" }]
    },
    {
      id: "guardrail-metric",
      term: "Guardrail metric",
      definition: "A metric you commit not to regress, used to constrain an objective so that optimizing it cannot cause an unacceptable side effect.",
      useIt: "Attach one to every objective you propose; an unconstrained objective is how systems get gamed.",
      links: [{ label: "Problem framing", route: "#/mlsd/framework/problem-framing" }]
    },
    {
      id: "pr-auc",
      term: "PR-AUC",
      definition: "Area under the precision-recall curve, which unlike ROC-AUC stays sensitive to performance on the rare positive class.",
      useIt: "Prefer it whenever positives are a small fraction of the data, and say why ROC-AUC would mislead.",
      links: [{ label: "Evaluation", route: "#/mlsd/concepts/evaluation" }]
    }
  ]
};
