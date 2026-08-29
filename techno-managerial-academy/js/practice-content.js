/* TechLead practice reference — scenario packs, timed prompts, the scoring
   rubric, cheat sheets and glossary for the practice hub. Every `route` here
   must resolve to a real lesson in window.TRACKS.hld / .lld / .data. */
window.TechLeadPractice = {
  nav: [
    {
      id: "scenarios",
      route: "#/scenarios",
      title: "Scenario packs",
      label: "Model-answer outlines",
      color: "#f59e0b",
      icon: "map",
      summary: "Outlines you can talk through end to end for the situations this round keeps returning to \u2014 migrations, disagreements, slipping releases, and numbers nobody trusts."
    },
    {
      id: "interview",
      route: "#/interview",
      title: "Timed prompts",
      label: "Practice under a clock",
      color: "#22d3ee",
      icon: "quiz",
      summary: "Prompts with the signals a panel is listening for and the follow-ups they will push on once your first answer lands."
    },
    {
      id: "rubrics",
      route: "#/rubrics",
      title: "Rubric",
      label: "Score yourself",
      color: "#34d399",
      icon: "star",
      summary: "The five dimensions this round is scored on, and what each band actually sounds like out loud."
    },
    {
      id: "cheatsheets",
      route: "#/cheatsheets",
      title: "Cheat sheets",
      label: "Fast recall",
      color: "#a78bfa",
      icon: "md",
      summary: "The sequences worth having in memory: the answer skeleton, the executive update, the incident order, and the reconciliation bridge."
    },
    {
      id: "glossary",
      route: "#/glossary",
      title: "Glossary",
      label: "Say it precisely",
      color: "#fb7185",
      icon: "lesson",
      summary: "Terms you are expected to use exactly, each with the sentence that shows you mean it rather than recognise it."
    }
  ],

  scenarios: [
    {
      id: "platform-migration",
      title: "The migration you owned",
      subtitle: "The most common opening prompt, and the one where most candidates spend their whole budget on background.",
      timebox: "10 min",
      prompt: "Lead me through a migration you owned, from problem discovery to launch.",
      related: [
        { label: "What the round really tests", route: "#/hld/framing/round-decoder" },
        { label: "Phased delivery and migration", route: "#/hld/operations/migration-strategy" },
        { label: "Migration and cutover leadership", route: "#/data/governance/migration-cutover" }
      ],
      outline: [
        {
          title: "Open on the problem, not the plan",
          items: [
            "One sentence on who was hurting: a cost, a failure mode, or a commitment you could not meet on the old system.",
            "Name the constraint that made it hard \u2014 a freeze window, a contract date, a dataset nobody understood.",
            "Say explicitly what you were accountable for, so the rest of the answer has a subject."
          ]
        },
        {
          title: "Show that you sized the blast radius",
          items: [
            "State the rollout shape and why: strangler, canary cohort, parallel run, or a genuinely atomic cutover.",
            "Name the undo path and how long it took, because that is what made the plan reversible or not.",
            "Give the go/no-go criteria and say when they were agreed \u2014 before the pressure is the whole point."
          ]
        },
        {
          title: "Be specific about the correctness evidence",
          items: [
            "Counts, aggregates, sampled rows, business rules \u2014 say which of the four you had, and which you were missing.",
            "If there was a variance, say whether it was explainable and who accepted the residual risk.",
            "Volunteer the thing that went wrong; a migration with no surprises reads as a migration you were not close to."
          ]
        },
        {
          title: "Close on what outlived it",
          items: [
            "The metric that moved, with a number.",
            "The artifact that survived: a runbook, a reconciliation job, an alert, a decision record.",
            "One thing you would do differently, stated as a decision rather than a regret."
          ]
        }
      ]
    },
    {
      id: "architecture-disagreement",
      title: "A senior engineer disagrees with your design",
      subtitle: "A test of whether you can hold a position without using your title to settle it.",
      timebox: "8 min",
      prompt: "In review, a senior engineer argues strongly against your design. Walk me through what you do.",
      related: [
        { label: "Stakeholder mapping", route: "#/hld/framing/stakeholder-map" },
        { label: "Decisions that stay decided", route: "#/hld/execution/adr-leadership" },
        { label: "Code review leadership", route: "#/lld/leadership/code-review" }
      ],
      outline: [
        {
          title: "Separate the kind of disagreement",
          items: [
            "Correctness, risk, maintainability or preference \u2014 name which one, because only the first two are worth blocking on.",
            "Say out loud what would change your mind; if nothing would, admit that you are defending a preference.",
            "Restate their position accurately before you respond to it. People concede far more readily once they have been heard correctly."
          ]
        },
        {
          title: "Convert it into criteria",
          items: [
            "Agree the criteria before comparing options, so you are not negotiating the scoring and the score at once.",
            "Time-box a spike for the missing evidence rather than arguing from intuition on both sides.",
            "Name the decision owner explicitly \u2014 including when it is not you."
          ]
        },
        {
          title: "Record it and mean it",
          items: [
            "Write the decision record with their option in the rejected list, stated in terms they would recognise as fair.",
            "Include the revisit trigger, which is often what makes the losing side able to accept it.",
            "Follow up when the trigger fires, which is the only thing that makes the process credible next time."
          ]
        }
      ]
    },
    {
      id: "release-slip",
      title: "A committed launch is slipping",
      subtitle: "Where the temptation is to promise recovery. The panel is listening for whether you re-baseline honestly.",
      timebox: "8 min",
      prompt: "A committed launch is six weeks away and you are roughly 30% behind. What do you do?",
      related: [
        { label: "Executive-friendly storytelling", route: "#/hld/execution/executive-hld" },
        { label: "Phased delivery and migration", route: "#/hld/operations/migration-strategy" },
        { label: "Quality gates for delivery", route: "#/lld/leadership/quality-gates" }
      ],
      outline: [
        {
          title: "Re-baseline before you communicate",
          items: [
            "Separate the critical path from the parallel work; only the former moves the date.",
            "Look at the defect trend and the age of blocked items, not just remaining scope \u2014 they predict the next four weeks better than a burn-up.",
            "Distinguish 30% of scope from 30% of risk. They are frequently not the same 30%."
          ]
        },
        {
          title: "Bring options, not a status",
          items: [
            "Reduce scope behind flags, move the date, add a named risk acceptance, or change what \u2018launched\u2019 means \u2014 present at least two with costs.",
            "Say what you would cut first and why it is the cheapest thing to lose.",
            "Include the option you do not recommend, with the reason, so the choice is visibly informed."
          ]
        },
        {
          title: "Make the ask explicit",
          items: [
            "One recommendation, and the specific decision you need from the person you are speaking to.",
            "A decision date, because an unresolved slip costs more every week it stays open.",
            "The launch gates you will hold regardless of the date, so quality is not silently the variable."
          ]
        }
      ]
    },
    {
      id: "wrong-dashboard",
      title: "A VP says the numbers are wrong",
      subtitle: "The classic data-leadership prompt, and the one where the wrong first move is to open a query editor.",
      timebox: "8 min",
      prompt: "A VP says the dashboard numbers differ from the finance extract. Lead the response.",
      related: [
        { label: "Metrics that decisions are made on", route: "#/data/trust/metric-ownership" },
        { label: "Semantic layer and metric contracts", route: "#/data/governance/semantic-layer" },
        { label: "Communicating data confidence", route: "#/data/governance/data-communication" }
      ],
      outline: [
        {
          title: "Establish what each number counts",
          items: [
            "Grain, filters, time window and timezone, currency, late adjustments \u2014 in that order, before any SQL.",
            "Say plainly that both figures are probably correct answers to different questions, which lowers the temperature immediately.",
            "Name a temporary source of truth so the reconciliation has something to reconcile against."
          ]
        },
        {
          title: "Build the bridge",
          items: [
            "Walk from one figure to the other with a named delta per line and a residual at the bottom.",
            "Treat the residual as the only defect; everything above it needed explaining, not fixing.",
            "Preserve the audit trail \u2014 do not edit the semantic model while you are still explaining last month."
          ]
        },
        {
          title: "Close the class of problem",
          items: [
            "Assign an owner to the definition and version it if the meaning is genuinely changing.",
            "Add a regression fixture on a known figure so the next silent drift is caught by a test.",
            "Report confidence, not just the corrected number: what is reconciled, what is provisional."
          ]
        }
      ]
    },
    {
      id: "silent-data-drop",
      title: "A pipeline silently dropped records",
      subtitle: "Impact quantification under uncertainty, where the instinct to reassure does the most damage.",
      timebox: "8 min",
      prompt: "A pipeline has been silently dropping records for three days. Lead the response.",
      related: [
        { label: "Data SLAs and incident leadership", route: "#/data/trust/data-sla-incident" },
        { label: "Data quality as an operating model", route: "#/data/trust/quality-operating-model" },
        { label: "Lineage for trust and impact", route: "#/data/trust/lineage-impact" }
      ],
      outline: [
        {
          title: "Bound the window before promising anything",
          items: [
            "Establish when it started and whether it is still happening \u2014 those are two separate questions and both come before cause.",
            "Use lineage to list consumers and which decisions were made on the affected data.",
            "Quantify in records, money, tenants and blocked decisions. \u2018Some data was affected\u2019 is not impact."
          ]
        },
        {
          title: "Contain, then correct",
          items: [
            "Stop the loss first; a backfill over a still-broken pipeline is wasted work.",
            "Caveat what is already published rather than quietly replacing it.",
            "Backfill with a verification step, and reconcile before you announce recovery."
          ]
        },
        {
          title: "Fix the detection gap, not just the data",
          items: [
            "Three days undetected is the real finding \u2014 the missing control is completeness or consistency checking, with a threshold.",
            "Add the check with an owner and a runbook line, not just an alert.",
            "State plainly in the postmortem that the defect was invisible, and what now makes it visible."
          ]
        }
      ]
    },
    {
      id: "cost-overrun",
      title: "Platform spend jumped after a launch",
      subtitle: "Where the fastest-sounding answer is the one that damages the workloads you most wanted to protect.",
      timebox: "6 min",
      prompt: "Warehouse spend rose 40% the month after an analytics launch. Recommend a course of action.",
      related: [
        { label: "Cost leadership in data platforms", route: "#/data/platform/platform-cost" },
        { label: "Cost-aware high-level design", route: "#/hld/execution/cost-aware-hld" },
        { label: "Batch and streaming trade-offs", route: "#/data/platform/batch-streaming" }
      ],
      outline: [
        {
          title: "Attribute before you touch anything",
          items: [
            "Break the increase down by workload, warehouse, user group, schedule and query pattern.",
            "Expect a small number of patterns to explain most of it \u2014 refresh frequency and unpartitioned scans are the usual pair.",
            "Separate one-off costs such as a backfill from the new recurring baseline."
          ]
        },
        {
          title: "Name what you are protecting",
          items: [
            "List the workloads that must not slow down, before proposing any reduction.",
            "Say what a blanket warehouse downsize would have cost, since that is the option someone will suggest.",
            "Where freshness is the driver, go back to which decision needs it \u2014 most dashboards do not."
          ]
        },
        {
          title: "Make it stick",
          items: [
            "Showback before chargeback: visibility changes behaviour at far lower political cost.",
            "Report cost per decision, not just spend, so the business can judge value rather than size.",
            "Set a budget alert with a threshold and an owner, so the next increase is noticed in week one."
          ]
        }
      ]
    }
  ],

  interview: [
    {
      id: "deep-dive-3min",
      title: "Project deep dive in three minutes",
      timebox: "3 min",
      prompt: "Walk me through your most complex project. Keep it under three minutes.",
      expected: [
        "Opens on the business problem and the constraint, not the technology.",
        "Names at least one option considered and rejected, with the reason.",
        "States a decision the candidate personally made, not what the team decided.",
        "Gives a measured outcome rather than an adjective.",
        "Ends with an artifact that outlived the project."
      ],
      followups: [
        "Which part of that was your decision rather than the team's?",
        "What would you do differently, and what would you keep?",
        "What did that choice cost you \u2014 and who paid it?"
      ],
      links: [
        { label: "What the round really tests", route: "#/hld/framing/round-decoder" },
        { label: "Executive-friendly storytelling", route: "#/hld/execution/executive-hld" }
      ]
    },
    {
      id: "ambiguous-requirement",
      title: "Turning a complaint into requirements",
      timebox: "6 min",
      prompt: "A VP tells you the reporting dashboard is slow and needs to be enterprise ready. Take it from there.",
      expected: [
        "Refuses to design against adjectives and translates both into numbered drivers.",
        "Asks which decision the latency blocks, so the target has a justification.",
        "Separates functional scope from the non-functional targets and names the load.",
        "Restates the requirement back to the stakeholder before proposing anything.",
        "Flags what is an assumption and what would close it."
      ],
      followups: [
        "They say p95 under 200ms. What do you ask next?",
        "Enterprise ready turns out to mean one specific deal. Does your design change?",
        "You cannot hit the number in the time available. What do you say?"
      ],
      links: [
        { label: "Business goals to architecture drivers", route: "#/hld/framing/business-drivers" },
        { label: "Assumptions, risks and decision triggers", route: "#/hld/framing/assumptions-risks" }
      ]
    },
    {
      id: "cutover-call",
      title: "The go/no-go call",
      timebox: "6 min",
      prompt: "Parallel-run results still show mismatches two days before quarter close. Go or no-go, and why?",
      expected: [
        "Distinguishes explainable timing differences from unexplained monetary variance.",
        "Recognises that matching counts prove nothing about computed values.",
        "Treats the freeze window as a constraint rather than a preference.",
        "Names who owns the decision and what evidence would change it.",
        "States the cost of holding, rather than pretending the safe option is free."
      ],
      followups: [
        "The variance is 0.02%. Does that change your answer?",
        "The business says the date is immovable. What do you offer them?",
        "You hold, and it turns out the old system was the one that was wrong. What now?"
      ],
      links: [
        { label: "Migration and cutover leadership", route: "#/data/governance/migration-cutover" },
        { label: "Phased delivery and migration", route: "#/hld/operations/migration-strategy" }
      ]
    },
    {
      id: "incident-lead",
      title: "Leading a live incident",
      timebox: "6 min",
      prompt: "A deploy causes high latency but no hard errors, and customers are starting to notice. Walk the first ten minutes.",
      expected: [
        "Mitigates before diagnosing, and says so explicitly.",
        "Triages to a severity using user impact and reversibility rather than the shape of the graph.",
        "Sets a communication cadence with a next-update time.",
        "Verifies recovery on the journey and the data, not only the dashboard.",
        "Converts the finding into a control with an owner and a date."
      ],
      followups: [
        "Rolling back would lose a feature the CEO announced this morning. Now what?",
        "What exactly do you post to stakeholders at minute five?",
        "The change was made by a junior engineer. What do you do afterwards?"
      ],
      links: [
        { label: "Incident leadership", route: "#/hld/operations/incident-hld" },
        { label: "The operating model belongs in the design", route: "#/hld/operations/operating-model" }
      ]
    },
    {
      id: "tech-debt-case",
      title: "Making the case for tech debt",
      timebox: "5 min",
      prompt: "Product wants features. You believe accumulated debt is now slowing delivery. Make the case.",
      expected: [
        "Brings a trend \u2014 lead time, escaped defects, blocked-item age \u2014 rather than an adjective.",
        "Ties the work to a specific blocked commitment instead of future flexibility.",
        "Proposes a bounded slice with a stated success metric.",
        "Says what is explicitly out of scope.",
        "Names the point at which they would stop."
      ],
      followups: [
        "You get one week, not two. What do you do with it?",
        "How will you know in a month whether it worked?",
        "Product says the trend is caused by scope changes, not code. Respond."
      ],
      links: [
        { label: "Refactoring without losing trust", route: "#/lld/quality/safe-refactoring" },
        { label: "Extensibility without overengineering", route: "#/lld/leadership/extensibility" }
      ]
    },
    {
      id: "drop-a-level",
      title: "When the round drops a level",
      timebox: "8 min",
      prompt: "You have described the architecture. Now design the payout submission at the code level.",
      expected: [
        "Starts from states, transitions and invariants rather than class names.",
        "Identifies the side-effect boundary and makes it idempotent with a durable key.",
        "Chooses a transaction boundary from what must be true together.",
        "Names the tests by the risk each retires.",
        "Resists reciting patterns without naming the change pressure they absorb."
      ],
      followups: [
        "The provider times out and the client retries with a different amount. What happens?",
        "Which of those tests would you drop if you had half the time?",
        "Where would you not introduce an interface, and why?"
      ],
      links: [
        { label: "From architecture to maintainable code", route: "#/lld/modeling/hld-to-lld" },
        { label: "Idempotency in real systems", route: "#/lld/modeling/idempotency" },
        { label: "Transaction boundaries", route: "#/lld/quality/transactions" }
      ]
    }
  ],

  rubrics: {
    dimensions: [
      "Technical judgment \u2014 correctness, failure modes, and implementation realism",
      "Managerial reasoning \u2014 ownership, prioritization, dependencies, and stakeholders",
      "Communication \u2014 structure, altitude, and plain-language risk",
      "Decision quality \u2014 criteria, evidence, recommendation, and named triggers",
      "Leadership signal \u2014 accountability, conflict handling, coaching, and prevention"
    ],
    bands: [
      {
        id: "developing",
        title: "Developing",
        summary: "Describes the work accurately but leaves the constraint, the cost and the ownership unstated.",
        signals: [
          "Opens with technology and never reaches the business problem.",
          "Says \u201cwe decided\u201d throughout, so no personal decision is visible.",
          "Presents choices as though they were free.",
          "Mitigates an incident by first trying to understand it.",
          "Treats a requirement adjective as a requirement."
        ]
      },
      {
        id: "solid",
        title: "Solid",
        summary: "Names the constraint, compares options, and can defend the decision with a measured outcome.",
        signals: [
          "Translates business goals into numbered drivers before designing.",
          "States one option rejected and why it lost.",
          "Gives a number for the outcome rather than an adjective.",
          "Reduces user harm before diagnosing during an incident.",
          "Separates definitional differences from defects when numbers disagree."
        ]
      },
      {
        id: "senior",
        title: "Senior",
        summary: "Makes uncertainty explicit, assigns it, and holds the trade-off without flattening anyone's position.",
        signals: [
          "Attaches an owner and a measurable trigger to every material risk.",
          "Escalates one-way doors earlier than reversible ones, and says why.",
          "Names each stakeholder's cost accurately before recommending.",
          "Sets go/no-go criteria before the pressure arrives, and holds them.",
          "Volunteers the weakest part of their own proposal unprompted."
        ]
      },
      {
        id: "staff",
        title: "Staff",
        summary: "Changes the class of problem, and can say what they chose not to build.",
        signals: [
          "Sets cost and reliability budgets as design constraints before the design exists.",
            "Says what was deliberately not built, and what that bought.",
          "Leaves behind a control \u2014 a gate, a contract, a fixture \u2014 that outlives their involvement.",
          "Refuses a cutover, or supplies a number's confidence level, with the business consequence stated.",
          "Separates accountability from blame in a way that makes early escalation more likely, not less."
        ]
      }
    ]
  },

  cheatsheets: [
    {
      id: "answer-skeleton",
      title: "The three-minute answer",
      summary: "Time budget for a project deep dive, so you never run out before the outcome.",
      items: [
        "0:00 Problem \u2014 who was hurting, and why it mattered.",
        "0:20 Constraint \u2014 the thing that made it hard.",
        "0:45 Options \u2014 two considered, with what each cost.",
        "1:15 Decision \u2014 what you chose, and the criterion you chose on.",
        "2:00 Outcome \u2014 the number that moved, and how you knew.",
        "2:30 Aftermath \u2014 the artifact that outlived it.",
        "Anything past 3:00 belongs to their follow-up, not your monologue."
      ]
    },
    {
      id: "executive-update",
      title: "The five-line executive update",
      summary: "Consequence first, mechanism on request, and always an explicit ask.",
      items: [
        "Outcome \u2014 what will be true when this is done, in business terms.",
        "Impact \u2014 who is affected, and what it is worth or costs.",
        "Options \u2014 two, with what each buys and gives up.",
        "Recommendation \u2014 one, as a choice you are making.",
        "Ask \u2014 the specific decision you need, today.",
        "If you cannot produce the mechanism in the next sentence, you were guessing rather than summarising."
      ]
    },
    {
      id: "incident-order",
      title: "Incident order of operations",
      summary: "The sequence itself is the answer; getting it out of order is the tell.",
      items: [
        "Triage \u2014 impact, scope, reversibility; name a commander.",
        "Mitigate \u2014 roll back, flag off, fail over, or degrade.",
        "Communicate \u2014 impact, confidence, and the next update time.",
        "Diagnose \u2014 now, with the pressure off.",
        "Recover \u2014 verify the journey and the data, not just the graph.",
        "Prevent \u2014 a check with an owner and a date, not a finding."
      ]
    },
    {
      id: "reconciliation-bridge",
      title: "The reconciliation bridge",
      summary: "Work the gap in this order and the residual is your actual bug.",
      items: [
        "Timing \u2014 cut-off, timezone, business calendar.",
        "Definition and grain \u2014 what one row means on each side.",
        "Scope \u2014 filters applied on one side only, such as test tenants.",
        "Currency \u2014 which rate, applied at which date.",
        "Late adjustments \u2014 credits and corrections raised after the run.",
        "Residual \u2014 whatever is left is the defect. Nothing above it needed a code change."
      ]
    },
    {
      id: "risk-register-line",
      title: "One line of a risk register",
      summary: "The fields that turn a worry into governance.",
      items: [
        "Statement \u2014 the mechanism and the consequence, not just the worry.",
        "Likelihood and impact \u2014 enough to rank it against the others.",
        "Owner \u2014 a person, because teams do not notice thresholds.",
        "Trigger \u2014 the measurable condition that changes the plan.",
        "Action \u2014 what happens when the trigger fires, decided now.",
        "Closes when \u2014 the test, spike or clause that turns the belief into a fact."
      ]
    },
    {
      id: "cutover-evidence",
      title: "Cutover evidence, in order of strength",
      summary: "Any one of these alone will pass while something is wrong.",
      items: [
        "Row counts equal \u2014 proves nothing was lost; proves nothing about values.",
        "Aggregate variance within a stated tolerance on monetary columns.",
        "Sampled rows checked against business rules, by a person.",
        "Business-rule assertions \u2014 the rules you thought to encode.",
        "Rollback rehearsed, with a recorded duration.",
        "Two dashboards looking similar \u2014 not evidence. It is reassurance."
      ]
    }
  ],

  glossary: [
    {
      id: "architecture-driver",
      term: "Architecture driver",
      definition: "A business goal restated as a constraint a design can be built against and tested against \u2014 a percentile, a window, an isolation boundary, a recovery target.",
      useIt: "Use it the moment a requirement arrives as an adjective, to say what you are going to turn it into before you design anything.",
      links: [{ label: "Business goals to architecture drivers", route: "#/hld/framing/business-drivers" }]
    },
    {
      id: "one-way-door",
      term: "One-way door",
      definition: "A decision that cannot be undone without material cost \u2014 a data migration, a public contract, a vendor commitment, anything customers have built against.",
      useIt: "Use it to justify why one decision gets a week of evidence and another gets an afternoon; reversibility, not size, sets the governance level.",
      links: [{ label: "Assumptions, risks and decision triggers", route: "#/hld/framing/assumptions-risks" }]
    },
    {
      id: "decision-trigger",
      term: "Decision trigger",
      definition: "A measurable condition, agreed in advance, at which the plan changes \u2014 a mismatch rate, a latency ceiling, a cost cap, a date.",
      useIt: "Attach one to every risk you raise. It is what separates holding a risky plan deliberately from hoping.",
      links: [{ label: "Assumptions, risks and decision triggers", route: "#/hld/framing/assumptions-risks" }]
    },
    {
      id: "blast-radius",
      term: "Blast radius",
      definition: "How many users, tenants, rows or currency units a change can damage before anyone notices it has gone wrong.",
      useIt: "Use it to explain why a rollout shape is a design decision: a plan that does not shrink exposure or detection time is a schedule, not a risk control.",
      links: [{ label: "Phased delivery and migration", route: "#/hld/operations/migration-strategy" }]
    },
    {
      id: "degraded-mode",
      term: "Degraded mode",
      definition: "A deliberately designed reduced-capability state that preserves the core journey when a dependency is unavailable.",
      useIt: "Name one per dependency in a design review. Undesigned, every dependency failure becomes a full outage by default.",
      links: [{ label: "The operating model belongs in the design", route: "#/hld/operations/operating-model" }]
    },
    {
      id: "adr",
      term: "Decision record",
      definition: "A durable note carrying context, the decision, the options rejected and why, the consequences, an owner, and the trigger to revisit.",
      useIt: "Reach for it when a decision shapes teams, data, money or reversibility \u2014 and skip it for anything a linter should own.",
      links: [{ label: "Decisions that stay decided", route: "#/hld/execution/adr-leadership" }]
    },
    {
      id: "cost-per-journey",
      term: "Cost per journey",
      definition: "Infrastructure spend attributed to a user-visible action rather than to an invoice line.",
      useIt: "Use it to move a cost conversation from a blanket cut to a specific design decision you can change.",
      links: [{ label: "Cost-aware high-level design", route: "#/hld/execution/cost-aware-hld" }]
    },
    {
      id: "invariant",
      term: "Invariant",
      definition: "A statement about state that must never be false \u2014 one payout per period per payee, a balance that never goes negative, never paid before approved.",
      useIt: "Open a low-level design answer with these. They are true regardless of language, framework or class layout, so everything else derives from them.",
      links: [{ label: "From architecture to maintainable code", route: "#/lld/modeling/hld-to-lld" }]
    },
    {
      id: "idempotency-key",
      term: "Idempotency key",
      definition: "A caller-supplied identifier, stored durably at the side-effect boundary, that lets a retried request return the original result instead of causing a second effect.",
      useIt: "Use it whenever a timeout is possible, which is always. Add that a changed payload under the same key must be rejected rather than applied.",
      links: [{ label: "Idempotency in real systems", route: "#/lld/modeling/idempotency" }]
    },
    {
      id: "transactional-outbox",
      term: "Transactional outbox",
      definition: "Writing the state change and the intent to publish in one local transaction, then relaying the event separately.",
      useIt: "Use it to explain how you get atomicity between your own write and your event without pretending a transaction can span two services.",
      links: [{ label: "Transaction boundaries", route: "#/lld/quality/transactions" }]
    },
    {
      id: "characterization-test",
      term: "Characterization test",
      definition: "A test that pins current behaviour, bugs included, before a refactor starts.",
      useIt: "Cite it as the first step of any legacy refactor: you cannot preserve behaviour you have not captured.",
      links: [{ label: "Refactoring without losing trust", route: "#/lld/quality/safe-refactoring" }]
    },
    {
      id: "change-pressure",
      term: "Change pressure",
      definition: "Evidence that a particular axis of variation is real \u2014 a second tenant with different rules, a committed second channel, a conditional you have now edited three times.",
      useIt: "Use it as the test for whether an abstraction has earned its keep. Without named pressure, ship the concrete version.",
      links: [{ label: "Extensibility without overengineering", route: "#/lld/leadership/extensibility" }]
    },
    {
      id: "grain",
      term: "Grain",
      definition: "What exactly one row of a table, or one point of a metric, represents.",
      useIt: "Ask for it first whenever two numbers disagree. Most reconciliation escalations are two correct queries at two different grains.",
      links: [{ label: "Metrics that decisions are made on", route: "#/data/trust/metric-ownership" }]
    },
    {
      id: "reconciliation-bridge",
      term: "Reconciliation bridge",
      definition: "A line-by-line walk from one figure to another, naming each delta \u2014 timing, definition, scope, currency, late adjustments \u2014 and ending in a residual.",
      useIt: "Use it to separate what needed explaining from what needed fixing. The residual is the only part that is a bug.",
      links: [{ label: "Metrics that decisions are made on", route: "#/data/trust/metric-ownership" }]
    },
    {
      id: "metric-contract",
      term: "Metric contract",
      definition: "A definition together with its grain, its owner, its regression test, and the sign-off required to change its meaning.",
      useIt: "Propose it when the same dispute recurs. It is what stops a definition from living in several places at once.",
      links: [{ label: "Semantic layer and metric contracts", route: "#/data/governance/semantic-layer" }]
    },
    {
      id: "confidence-statement",
      term: "Confidence statement",
      definition: "An explicit account of which parts of a number are reconciled, which are provisional, and which decisions are therefore unsafe today.",
      useIt: "Publish it during any data incident. Withholding uncertainty to look composed costs far more trust than the incident does.",
      links: [{ label: "Communicating data confidence", route: "#/data/governance/data-communication" }]
    },
    {
      id: "showback",
      term: "Showback",
      definition: "Attributing platform spend to the team or workload that caused it, without necessarily billing for it.",
      useIt: "Offer it before chargeback. Visibility changes behaviour at a fraction of the political cost.",
      links: [{ label: "Cost leadership in data platforms", route: "#/data/platform/platform-cost" }]
    },
    {
      id: "readiness-gate",
      term: "Readiness gate",
      definition: "A measurable pre-launch condition, owned by a named person, that a stranger could verify \u2014 and that can be waived in writing.",
      useIt: "Use it to keep launch risk visible without turning into a subjective perfection review, which is how gates get bypassed.",
      links: [{ label: "Quality gates for delivery", route: "#/lld/leadership/quality-gates" }]
    }
  ]
};
