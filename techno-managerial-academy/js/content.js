(function () {
  "use strict";

  function lesson(id, title, summary, points, tableRows, drill) {
    return { id, title, summary, minutes: 8, tags: ["techno-managerial"], points, tableRows, drill };
  }
  function track(id, name, short, color, blurb, modules) {
    return { id, name, short, color, blurb, modules };
  }
  function module(id, name, lessons) {
    return { id, name, lessons };
  }
  function q(trackId, prompt, options, answer, explain) {
    return { track: trackId, prompt, options, answer, explain };
  }

  const hldLessons = [
    lesson("round-decoder", "What the Round Really Tests", "This round is not HR and not pure design. It tests whether technical judgment survives ambiguity, pressure, people constraints, and business consequences.", ["Name the business problem before naming components.", "Separate your personal ownership from the team's output.", "End with what changed after the project: runbook, metric, test, process, or decision record."], [["Strong signal", "Constraints, options, decision, impact, learning."], ["Weak signal", "Tool list, vague teamwork, no metrics, no trade-off."]], "Answer: Walk me through your most complex project. Keep it under three minutes."),
    lesson("business-drivers", "Business Goals to Architecture Drivers", "Convert stakeholder goals into scale, availability, latency, cost, compliance, and delivery constraints.", ["Translate 'fast' into p95/p99 targets.", "Translate 'enterprise ready' into audit, support, tenant isolation, and change management.", "Translate 'launch quickly' into reversible sequencing."], [["Business ask", "Architecture driver"], ["Launch in new regions", "Data residency, latency, operational coverage."], ["Reduce support load", "Observability, self-service, simpler failure modes."]], "A VP says the dashboard is slow. Ask five questions that turn that complaint into design targets."),
    lesson("stakeholder-map", "Stakeholder Mapping for HLD Decisions", "Architectural choices affect product, security, finance, support, operations, and customers differently.", ["Map stakeholder concern before recommendation.", "Show what each group needs to approve.", "Use artifacts: ADR, rollout plan, SLA, cost model, risk register."], [["Stakeholder", "Concern"], ["Security", "Authz, secrets, audit, tenancy."], ["Finance", "Cost, vendor lock-in, measurable ROI."], ["Support", "Runbooks, escalation, customer messaging."]], "Product wants speed while security wants more controls. Frame the decision without making either side the villain."),
    lesson("assumptions-risks", "Assumptions, Risks, and Decision Triggers", "Senior HLD answers make uncertainty explicit instead of pretending the future is known.", ["Separate assumption, risk, dependency, and open question.", "Assign an owner and trigger for each material risk.", "Escalate one-way-door decisions earlier."], [["Item", "Example"], ["Assumption", "Vendor API supports 1k QPS."], ["Risk", "Dual-write mismatch can affect finance close."], ["Trigger", "If mismatch exceeds 0.1%, pause cutover."]], "Write three risks for a vendor integration with unknown throughput."),
    lesson("cost-aware-hld", "Cost-Aware High-Level Design", "Cost is not a footnote. It is a product constraint that shapes architecture, operations, and delivery choices.", ["Account for compute, storage, network, observability, environments, and human operations.", "Compare cost per user journey, not only monthly bill.", "Preserve high-value workloads while removing waste."], [["Cost source", "Control lever"], ["Warehouse scans", "Partitioning, pruning, materialization."], ["Always-on compute", "Autoscaling, schedules, async work."], ["Operational toil", "Automation, runbooks, fewer failure modes."]], "A proposed system stores every event forever. What cost and compliance questions do you ask?"),
    lesson("executive-hld", "Executive-Friendly HLD Storytelling", "The same design needs different altitude for executives and engineers.", ["Lead with outcome, impact, options, recommendation, and ask.", "Move implementation detail into appendix-level explanation.", "Use plain-language risk: customer trust, revenue, SLA, compliance, support load."], [["Bad", "We need Kafka because event streaming is scalable."], ["Better", "The event pipeline lets us decouple payout calculations from user traffic and recover delayed processing without blocking checkout."]], "Explain why a phased migration needs two extra weeks to a non-technical leader."),
    lesson("adr-leadership", "Architecture Decision Records", "ADRs turn arguments into durable decisions by naming context, options, trade-offs, and revisit triggers.", ["Use ADRs for decisions that shape teams, data, cost, reliability, or reversibility.", "Record rejected options respectfully.", "Include what would change the decision."], [["ADR section", "Purpose"], ["Context", "Why now, what constraints."], ["Decision", "What we choose."], ["Consequences", "Cost, risks, owners, follow-up."]], "Draft an ADR title for choosing events over direct API calls."),
    lesson("operating-model", "Operating Model in HLD", "Production design includes ownership, alerts, escalation, rollback, support, and runbooks.", ["Define build-time and run-time owner.", "Pick alerts tied to user impact, not noisy internals.", "State rollback and degraded-mode behavior."], [["Failure mode", "Detection and response"], ["Dependency timeout", "p99/error alert, circuit breaker, fallback."], ["Bad data", "Reconciliation alert, pause publish, backfill path."]], "Your service depends on three downstream APIs. What operational model belongs in the HLD?"),
    lesson("migration-strategy", "Phased Delivery and Migration Strategy", "Good architecture can still fail if rollout is reckless.", ["Prefer thin slices, pilot cohorts, feature flags, parallel run, dual reads, and cleanup phases.", "Set go/no-go criteria before migration pressure arrives.", "Define rollback and data repair steps."], [["Pattern", "Use when"], ["Strangler", "Replace legacy behavior gradually."], ["Parallel run", "Validate data correctness before cutover."], ["Canary", "Limit customer blast radius."]], "Old and new systems disagree during parallel run. Decide whether to cut over."),
    lesson("incident-hld", "Incident Leadership in Design Rounds", "Incident answers reveal whether you protect users before protecting your ego.", ["Triage severity, blast radius, and owner.", "Mitigate before perfect root cause.", "Communicate cadence and convert findings into prevention."], [["Phase", "Move"], ["Mitigate", "Rollback, flag off, fail over, degrade."], ["Recover", "Verify journey and data correctness."], ["Prevent", "Postmortem actions with owners and dates."]], "A deploy causes high latency but no hard errors. Walk the response.")
  ];

  const lldLessons = [
    lesson("hld-to-lld", "From HLD to Maintainable LLD", "Translate architecture into boundaries, contracts, invariants, and tests without pattern theater.", ["Start with responsibilities and state, not class names.", "Explain what change pressure each abstraction absorbs.", "Walk one happy path and two failure paths."], [["Design move", "Leadership signal"], ["Boundary", "Clear owner and reason to change."], ["Interface", "Variation point with real future pressure."], ["Test", "Protects invariant or integration risk."]], "Turn a payout workflow into components and state transitions."),
    lesson("domain-modeling", "Domain Modeling for Delivery Leaders", "Ambiguous business language must become entities, values, aggregates, services, and policies.", ["Find overloaded nouns.", "Make illegal states impossible where practical.", "Keep invariants close to the data they protect."], [["Concept", "Interview explanation"], ["Entity", "Identity across time."], ["Value object", "Equality by value."], ["Policy", "Rule that varies by product/tenant/mode."]], "Model an approval workflow with explicit states."),
    lesson("api-contracts", "API Contracts That Survive Change", "A good contract protects consumers from churn and gives producers room to evolve.", ["Prefer additive changes.", "Version only when behavior or meaning changes.", "Return actionable errors and correlation IDs."], [["Concern", "Design move"], ["Validation", "Field-level errors with stable codes."], ["Pagination", "Cursor for mutable lists."], ["Deprecation", "Metrics, timeline, migration path."]], "Design an error response for partial validation failure."),
    lesson("idempotency", "Idempotency in Real Systems", "Retries are normal. Duplicate side effects are design bugs.", ["Use durable idempotency keys at side-effect boundaries.", "Detect same key with different payload.", "Define dedupe windows and replay behavior."], [["Case", "Risk"], ["Payment retry", "Double charge."], ["Webhook replay", "Duplicate state transition."], ["File ingest retry", "Duplicate rows."]], "A user submits checkout twice during timeout. Design safe handling."),
    lesson("transactions", "Transactions and Consistency Trade-Offs", "Transaction boundaries are business boundaries, not just database syntax.", ["Do not span transactions across services casually.", "Use optimistic locking for contested updates.", "Use outbox/compensation for cross-system side effects."], [["Pattern", "When"], ["Optimistic lock", "Low conflict updates."], ["Outbox", "DB write plus reliable event."], ["Compensation", "Business reversal after partial success."]], "Choose a transaction boundary for coupon redemption."),
    lesson("testing-design", "Testing LLD Decisions", "Tests are design feedback when they target invariants, contracts, and failure paths.", ["Unit-test domain rules.", "Contract-test APIs and events.", "Characterize legacy behavior before refactoring."], [["Risk", "Best test"], ["Rule correctness", "Unit."], ["Consumer compatibility", "Contract."], ["Persistence side effects", "Integration."]], "Pick tests for a refund workflow that calls payment, inventory, and notification systems."),
    lesson("safe-refactoring", "Refactoring Without Losing Trust", "Refactoring is a delivery strategy when it preserves behavior and reduces future risk.", ["Use seams, characterization tests, small commits, and feature flags.", "Communicate why refactor reduces risk or cycle time.", "Pause when risk exceeds value."], [["Step", "Reason"], ["Characterize", "Know current behavior."], ["Extract seam", "Enable safe replacement."], ["Measure", "Show risk reduction."]], "Order a safe refactor of a legacy rule engine."),
    lesson("code-review", "Code Review Leadership", "Strong reviews improve design and team judgment without turning into style fights.", ["Separate correctness, risk, maintainability, and preference.", "Ask questions that teach reusable principles.", "Prioritize high-impact comments."], [["Weak comment", "Better comment"], ["I dislike this.", "This bypasses the invariant; move the check into the domain service."], ["Too complex.", "Can we split orchestration from policy so tests target the rule?"]], "Rewrite a vague review comment into a design-level comment."),
    lesson("extensibility", "Extensibility Without Overengineering", "Design for likely change, not every imagined future.", ["Start simple; introduce abstractions when change pressure is proven.", "Use strategy/configuration for policy variation.", "Keep defaults obvious."], [["Abstraction earns keep when", "Example"], ["Rules vary", "Pricing or approval policy."], ["Integrations vary", "Notification channel strategy."], ["Tenants differ", "Config-driven limits."]], "Design an extension point for multiple payout rules."),
    lesson("llm-quality", "Quality Gates for LLD Delivery", "A technical leader uses readiness gates to keep code-level risk visible before launch.", ["Define code, test, security, operability, and migration gates.", "Make launch criteria measurable.", "Avoid blocking with subjective perfection."], [["Gate", "Signal"], ["Correctness", "Invariant tests pass."], ["Operability", "Dashboards and runbook ready."], ["Security", "Sensitive data paths reviewed."]], "Create readiness gates for a new approval workflow service.")
  ];

  const dataLessons = [
    lesson("metric-ownership", "Metrics That Drive Decisions", "Trusted metrics need grain, owner, source, freshness, and business meaning.", ["Separate vanity metrics from decision metrics.", "Define source of truth before writing fixes.", "Capture grain, filters, time window, and late adjustments."], [["Metric field", "Why it matters"], ["Grain", "Stops partner/order/customer mismatches."], ["Owner", "Prevents dashboard politics."], ["Freshness", "Separates stale from wrong."]], "Payout numbers differ across finance, sales, and analytics. Lead the reconciliation."),
    lesson("lineage-impact", "Lineage for Trust and Impact", "Lineage is useful when it helps debug, approve change, and assess impact.", ["Track source, transforms, consumers, owners, and SLAs.", "Prioritize critical paths over exhaustive diagrams.", "Use lineage in incident response and change review."], [["Lineage field", "Use"], ["Owner", "Escalation."], ["Consumer", "Impact blast radius."], ["SLA", "Priority and comms."]], "A schema change breaks an executive dashboard before quarterly review."),
    lesson("quality-operating-model", "Data Quality as Operating Model", "Quality checks need ownership, triage, thresholds, and remediation.", ["Check completeness, accuracy, freshness, uniqueness, validity.", "Balance false positives against missed defects.", "Place checks close to business meaning."], [["Dimension", "Example"], ["Completeness", "Expected partitions arrived."], ["Accuracy", "Amounts reconcile within tolerance."], ["Uniqueness", "No duplicate business keys."]], "Counts match but amounts are wrong for some partners. Design controls."),
    lesson("data-sla-incident", "SLA and Data Incident Leadership", "Data incidents need recovery and stakeholder communication, not only reruns.", ["Classify freshness, accuracy, availability, and notification expectations.", "Communicate confidence and next update time.", "Add prevention after recovery."], [["Situation", "Leadership move"], ["Job delayed", "Workaround and ETA."], ["Bad publish", "Pause, caveat, backfill."], ["Unknown impact", "Quantify window and consumers."]], "Daily revenue table is delayed four hours. Write the first update."),
    lesson("batch-streaming", "Batch and Streaming Trade-Offs", "Challenge vague real-time requirements and match processing mode to business value.", ["Use streaming for decisions that expire quickly.", "Use batch when correctness, cost, and replay matter more than seconds.", "Plan late data and replay either way."], [["Need", "Fit"], ["Fraud alert", "Streaming or micro-batch."], ["Quarter close report", "Batch with strong reconciliation."], ["Operational dashboard", "Freshness by decision value."]], "Product asks for real-time payout visibility. Decide what must be real time."),
    lesson("platform-cost", "Cost Leadership in Data Platforms", "Control spend without breaking trust, SLAs, or adoption.", ["Attribute spend by workload, user group, warehouse, schedule, query pattern.", "Protect high-value workloads.", "Use budgets, pruning, caching, schedules, and showback."], [["Cost driver", "Lever"], ["Full scans", "Clustering, partitions, materialization."], ["Idle compute", "Auto-suspend and schedules."], ["Backfills", "Capacity windows and prioritization."]], "Warehouse cost jumps 40% after analytics launch. Recommend changes."),
    lesson("governance-speed", "Governance Without Bottlenecks", "Practical governance lets teams move faster because trust is built into the path.", ["Classify data sensitivity.", "Use least privilege and access review.", "Automate retention, masking, and audit evidence where possible."], [["Control", "Purpose"], ["Masking", "Reduce sensitive exposure."], ["Row policy", "Tenant/role isolation."], ["Retention", "Legal and storage discipline."]], "A new analytics product needs customer, partner, and financial data."),
    lesson("migration-cutover", "Migration and Cutover Leadership", "Data migrations need acceptance criteria before pressure arrives.", ["Parallel-run counts, aggregates, samples, and business rules.", "Define rollback and freeze windows.", "Choose go/no-go with business owners."], [["Mismatch", "Decision"], ["Explainable timing", "Document and monitor."], ["Money variance", "Delay or phase."], ["Unknown root cause", "No broad cutover."]], "New pipeline matches counts but differs in aggregates. Decide cutover."),
    lesson("semantic-layer", "Semantic Layer and Metric Contracts", "A semantic layer is a product contract, not just a dashboard convenience.", ["Centralize metric definitions and ownership.", "Version meaningful changes.", "Add regression cases for finance/customer-facing metrics."], [["Contract item", "Example"], ["Definition", "Bookings exclude cancellations after close."], ["Owner", "Finance signs off."], ["Test", "Known partner payout fixture."]], "A team wants to redefine active customer. Handle the change safely."),
    lesson("data-communication", "Communicating Data Confidence", "Data leaders must say what is known, unknown, usable, and unsafe.", ["Publish confidence level and caveats.", "Name blocked decisions.", "Avoid screenshots as reconciliation proof."], [["Message field", "Example"], ["Impact", "2.3% of partner rows delayed."], ["Confidence", "Counts reconciled, amounts under review."], ["Next update", "30 minutes with owner."]], "Write an update for an executive reporting discrepancy.")
  ];

  const tracks = [
    track("hld", "HLD Leadership", "HLD", "#f59e0b", "Lead architecture conversations with business context, cost, reliability, security, rollout, and executive clarity.", [
      module("framing", "Framing and Decisions", hldLessons.slice(0, 4)),
      module("execution", "Trade-offs and Execution", hldLessons.slice(4, 7)),
      module("operations", "Operations and Migration", hldLessons.slice(7))
    ]),
    track("lld", "LLD Leadership", "LLD", "#22d3ee", "Translate architecture into maintainable code, contracts, tests, reviews, and delivery-safe implementation choices.", [
      module("modeling", "Modeling and Contracts", lldLessons.slice(0, 4)),
      module("quality", "Consistency and Quality", lldLessons.slice(4, 7)),
      module("leadership", "Review and Extensibility", lldLessons.slice(7))
    ]),
    track("data", "Data Engineering Leadership", "DATA", "#34d399", "Lead platforms where trust, freshness, lineage, governance, cost, and stakeholder confidence matter as much as pipelines.", [
      module("trust", "Trust and Quality", dataLessons.slice(0, 4)),
      module("platform", "Platform Trade-offs", dataLessons.slice(4, 7)),
      module("governance", "Governance and Cutover", dataLessons.slice(7))
    ])
  ];

  const scenarios = [
    ["platform-migration", "Platform migration deep dive", "Lead me through a migration you owned from problem discovery to launch.", "architecture", ["Business context", "Ownership", "Dual-run or phased rollout", "Metrics", "Learning loop"]],
    ["architecture-disagreement", "Architecture disagreement", "A senior engineer disagrees with your design in review. What do you do?", "people", ["Decision criteria", "Evidence", "Time-boxed spike", "Decision owner", "Respectful alignment"]],
    ["release-slip", "Release slipping", "A committed launch is six weeks away and you are 30% behind.", "delivery", ["Critical path", "Options", "Scope trade-off", "Executive update", "Launch gates"]],
    ["silent-data-drop", "Silent data drop", "A pipeline silently drops records for three days.", "incident", ["Impact window", "Containment", "Backfill", "Stakeholder comms", "Prevention"]],
    ["wrong-dashboard", "Wrong dashboard numbers", "A VP says dashboard numbers differ from the finance extract.", "data", ["Definition alignment", "Source of truth", "Reconciliation bridge", "Audit trail", "Signoff"]],
    ["cutover-risk", "Cutover risk", "Parallel-run results still show mismatches before quarter close. Go or no-go?", "data", ["Mismatch severity", "Financial impact", "Rollback", "Freeze window", "Decision owner"]],
    ["cost-overrun", "Warehouse cost overrun", "Warehouse spend jumped 45% after analytics launch.", "data", ["Workload attribution", "Value protection", "Optimization levers", "Budgets", "Governance"]],
    ["client-pressure", "Client-facing delivery pressure", "A strategic client expects an extract Friday, but QA found edge-case mismatches.", "delivery", ["Defect scope", "Partial delivery options", "Risk acceptance", "Plain-language comms", "Follow-up control"]],
    ["tech-debt", "Tech debt pushback", "Product wants features, but you believe tech debt is now slowing delivery.", "strategy", ["Lead-time evidence", "Risk framing", "Phased proposal", "Business impact", "Success metric"]],
    ["junior-incident", "Junior caused incident", "A junior engineer caused a production issue after a change.", "people", ["Mitigate first", "Coach privately", "System gap", "Blameless postmortem", "Accountability"]],
    ["api-breaking-change", "Breaking API change", "Another team wants to change a contract your service depends on.", "lld", ["Consumer impact", "Versioning", "Compatibility window", "Contract tests", "Deprecation plan"]],
    ["real-time-demand", "Real-time demand", "Leadership asks for real-time metrics for every dashboard.", "data", ["Decision value", "Batch vs stream split", "Cost", "Replay", "Freshness SLA"]]
  ].map(([id, title, prompt, category, signals]) => ({ id, title, prompt, category, signals }));

  const rubrics = {
    dimensions: [
      ["technical", "Technical judgment", "Correctness, architecture fit, failure modes, constraints, and implementation realism."],
      ["managerial", "Managerial reasoning", "Ownership, prioritization, dependencies, delegation, and stakeholder alignment."],
      ["communication", "Communication clarity", "Structured answer, plain-language risk, concise executive framing, and listening."],
      ["decision", "Decision quality", "Uses evidence, handles ambiguity, makes a recommendation, and names decision triggers."],
      ["leadership", "Leadership signal", "Accountability, conflict handling, coaching, prevention, and repeatable improvement."]
    ],
    scale: [
      ["1", "Misses core signal", "Vague, reactive, unsafe, or tool-only."],
      ["2", "Partially aware", "Sees the issue but lacks structure or depth."],
      ["3", "Solid baseline", "Reasonable answer with acceptable trade-offs."],
      ["4", "Strong hire signal", "Practical, structured, balanced across tech and people."],
      ["5", "Senior-caliber signal", "Anticipates second-order effects and drives measurable outcomes."]
    ]
  };

  const models = [
    ["Slipping Release", "A committed launch is slipping. What do you do?", "Ask the team to work harder and hope to catch up.", "Re-baseline scope, blockers, defects, and dependencies; present options for scope, date, owner, or risk.", "Quantify critical path, defect trend, dependency age, and launch gates. Recommend a scoped release behind flags with an executive update and explicit decision date."],
    ["Architecture Conflict", "A senior engineer disagrees with your design.", "Explain my design again and ask the manager to decide.", "Align on criteria, compare options, time-box missing evidence, and document the decision.", "Turn the disagreement into an ADR with goals, rejected options, risk, owner, revisit trigger, and respectful alignment plan."],
    ["Dashboard Mismatch", "A VP says dashboard numbers differ from finance.", "Check SQL and patch the dashboard.", "Compare metric definition, grain, filters, period, refresh time, and late adjustments first.", "Declare temporary source of truth, quantify variance, build reconciliation bridge, preserve audit trail, and get signoff before changing the semantic model."],
    ["LLD Extension", "A workflow needs new approval states.", "Add more if statements.", "Model states and transitions, keep invariants in domain objects, and add tests.", "Introduce a state machine or policy strategy only where change pressure exists; persist state around side-effect boundaries and use idempotent commands."],
    ["Cost Overrun", "Warehouse cost rose sharply after launch.", "Reduce warehouse size and ask teams to run fewer queries.", "Break cost down by workload, warehouse, query, user group, and schedule.", "Protect high-value dashboards, remove waste, add budgets/showback, tune freshness/materialization, and track cost per decision outcome."],
    ["Tech Debt", "How do you justify tech debt work?", "It makes code cleaner.", "Tie it to lead time, incidents, change failure rate, support load, or blocked roadmap work.", "Show trend evidence, propose a phased risk-reduction slice, define success metric, and explain what feature delivery becomes safer afterward."],
    ["Incident", "A deploy causes a customer-facing issue.", "Debug until I know the root cause.", "Mitigate user harm, communicate cadence, then diagnose.", "Separate mitigation from root cause, assign incident roles, verify data/user recovery, and convert postmortem actions into tests, alerts, and runbooks."],
    ["Client Pressure", "A client expects delivery but QA found edge mismatches.", "Ship because leadership wants it.", "Quantify defect scope and offer delay, partial delivery, caveat, or manual review.", "Name who accepts residual risk, protect trust with plain-language comms, and add prevention through release gates and reconciliation tests."]
  ].map(([title, prompt, weak, good, senior]) => ({ title, prompt, weak, good, senior }));

  const companyPacks = [
    ["Big Tech / FAANG-style", "Ambiguity, scale, crisp trade-offs, product impact, operational maturity.", ["Clarify before solving.", "Quantify scale and bottlenecks.", "Close with metrics, rollback, and what changes your recommendation."]],
    ["Enterprise SaaS", "Stakeholders, tenants, security, migrations, supportability, customer commitments.", ["Discuss tenant isolation and audit.", "Practice client delivery pressure.", "Translate risk into SLA, renewal, and support language."]],
    ["Data Platform / Analytics", "Metric definitions, lineage, data quality, SLAs, warehouse cost, governance.", ["Prepare dashboard mismatch stories.", "Explain freshness vs correctness.", "Use impacted records, dollars, tenants, and blocked decisions."]],
    ["Startup / Scale-up", "Speed, resource constraints, reversible decisions, pragmatic sequencing.", ["Ship thin slices without hiding risk.", "Name what you defer.", "Use decision triggers for the next investment."]],
    ["Consulting / Client-facing", "Expectation setting, discovery, dependencies, executive communication.", ["Practice the five-line executive update.", "Reset scope while preserving trust.", "Offer qualified delivery options."]]
  ].map(([title, focus, drills]) => ({ title, focus, drills }));

  const flashcards = [
    ["STAR-L", "Situation, Task, Action, Result, Learning. Add trade-offs, metrics, ownership, and repeatable improvement."],
    ["Executive update", "Decision needed, business impact, options, recommendation, explicit ask."],
    ["Decision trigger", "A measurable condition that changes the plan: p99, mismatch rate, cost ceiling, defect trend, compliance date."],
    ["Incident order", "Triage, mitigate, communicate, diagnose, recover, prevent."],
    ["Data trust loop", "Definition, source of truth, impact, reconciliation, communication, prevention."],
    ["LLD signal", "Invariants, state transitions, contracts, tests, extension pressure."],
    ["Build vs buy", "Time to value, TCO, compliance, support, integration risk, lock-in, exit path."],
    ["Launch gate", "A measurable proceed/pause/rollback/expand condition."],
    ["Good pushback", "We can hit the date if we reduce scope or accept this named risk. My recommendation is..."],
    ["Metric mismatch", "Align grain, filters, time window, late adjustments, currency, freshness, owner."],
    ["Idempotency", "Make retries safe by deduping side effects with durable keys and payload checks."],
    ["Cost of delay", "The loss or risk created by waiting: revenue, compliance, customer pain, support load, compounding risk."],
    ["One-way door", "A decision that is hard to reverse without material cost, data risk, or customer harm."],
    ["ADR", "Context, decision, options rejected, consequences, owner, revisit trigger."],
    ["Lineage", "Source, transform, consumer, owner, SLA, and change impact path."],
    ["Governance", "Useful access plus classification, masking, retention, access review, and audit evidence."],
    ["Refactor trust", "Characterize behavior, extract seams, ship small, measure risk reduction."],
    ["Review leadership", "Prioritize correctness and risk; separate principle from personal preference."],
    ["Streaming fit", "Use when the decision value expires quickly and operational complexity is justified."],
    ["Fallback", "A deliberately designed reduced mode that preserves the core user journey."]
  ].map(([front, back]) => ({ front, back }));

  const questions = [
    q("hld", "What should come before drawing boxes?", ["Pick the newest database", "Clarify business goal, user journey, constraints, and success metrics", "Choose microservices", "Estimate team size only"], 1, "Architecture drivers shape design."),
    q("hld", "Strong build-vs-buy comparison includes...", ["Only license cost", "Time-to-value, compliance, integration risk, TCO, lock-in, support, exit path", "Popularity", "Personal preference"], 1, "Leadership choices include operations and future flexibility."),
    q("hld", "A one-way-door decision needs...", ["Less evidence", "Earlier escalation and explicit decision criteria", "No ADR", "Only engineer approval"], 1, "Irreversibility changes governance."),
    q("hld", "During an incident, before perfect root cause you should...", ["Rewrite service", "Mitigate user harm and communicate cadence", "Wait silently", "Assign blame"], 1, "Reduce harm first."),
    q("hld", "Best executive summary says...", ["Kafka is cool", "Outcome, options, recommendation, risk, and ask", "Implementation detail only", "No risks"], 1, "Executives need decisions."),
    q("hld", "A rollout plan is strong when it has...", ["Hope", "Canary, rollback, owners, metrics, and go/no-go gates", "No rollback", "One big cutover"], 1, "Rollout is risk management."),
    q("lld", "First senior move in workflow LLD is...", ["List classes", "Name states, transitions, and invariants", "Add inheritance", "Pick a framework"], 1, "Correctness starts with invariants."),
    q("lld", "Idempotency keys primarily protect against...", ["Slow queries", "Duplicate side effects during retries", "Missing CSS", "Bad documentation"], 1, "Retries should be safe."),
    q("lld", "Least breaking API change is usually...", ["Remove field", "Add optional field", "Change field meaning", "Change ID type"], 1, "Additive changes preserve consumers."),
    q("lld", "Best test for legacy refactor is...", ["No tests", "Characterization tests before changing internals", "Only snapshots", "Manual only"], 1, "Know current behavior before changing it."),
    q("lld", "Strategy pattern earns its keep when...", ["Always", "Policy varies by product, tenant, mode, or likely rule change", "Never", "Only with databases"], 1, "Patterns should absorb real change."),
    q("lld", "Good review comment says...", ["I dislike this", "This bypasses the invariant; move the check to the domain layer", "Rewrite all", "Use my style"], 1, "Reviews should reduce risk."),
    q("data", "Dashboard differs from finance. First step?", ["Patch SQL silently", "Align definition, grain, filters, period, freshness, and source of truth", "Blame BI", "Ignore"], 1, "Definitions precede fixes."),
    q("data", "Repeated ETL SLA miss. Weakest response?", ["Trend runtime", "Alert before breach", "Only add compute without attribution", "Map critical path"], 2, "Attribute before spending."),
    q("data", "Data incident impact should quantify...", ["Meeting count", "Records, dollars, tenants, time window, blocked decisions", "Theme", "Lines of SQL"], 1, "Impact drives priority."),
    q("data", "Governance without bottlenecks means...", ["Everyone has admin", "Least privilege, classification, automation, clear ownership", "No audits", "Manual approvals for everything"], 1, "Controls should scale."),
    q("data", "Streaming is justified when...", ["Any dashboard asks", "Decision value expires quickly and complexity is worth it", "Batch is boring", "It is trendy"], 1, "Real-time needs business value."),
    q("data", "Cutover is credible when...", ["Counts only", "Acceptance criteria, reconciliation, rollback, owner, monitoring", "Optimism", "No freeze window"], 1, "Evidence and rollback matter."),
    q("general", "Strong project deep dive pattern is...", ["Tool list", "STAR-L with ownership, trade-offs, metrics, learning", "Only timeline", "Only team result"], 1, "Structure plus proof shows seniority."),
    q("general", "Recover from too much 'we did' by...", ["Keep going", "Separate team result from personal ownership", "Pretend", "Blame"], 1, "Ownership clarity matters."),
    q("general", "Best stakeholder pushback gives...", ["Refusal only", "Options, risk, recommendation, and ask", "Silence", "Hidden work"], 1, "Pushback should create decisions."),
    q("general", "Failure story should include...", ["No failure", "Ownership, impact, mitigation, prevention", "Blame", "Only emotion"], 1, "Learning loop matters."),
    q("general", "Best delivery risk metrics include...", ["Meetings", "Lead time, blocked age, escaped defects, change failure rate", "LOC", "Service count"], 1, "Flow and quality signal risk."),
    q("general", "A junior causes an incident. Strong response?", ["Blame publicly", "Mitigate, coach privately, fix system gaps", "Hide", "Remove all ownership"], 1, "Blameless and accountable.")
  ];

  const simulatorPrompts = scenarios.map((s) => ({
    id: s.id,
    title: s.title,
    category: s.category,
    prompt: s.prompt,
    signals: s.signals,
    durationSec: s.category === "architecture" || s.category === "data" ? 420 : 300
  }));

  window.TM_DATA = { tracks, scenarios, rubrics, models, companyPacks, flashcards, questions, simulatorPrompts };
})();
