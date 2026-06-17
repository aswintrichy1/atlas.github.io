/* =====================================================================
   CODEX · Practice content
   Static, offline interview drills and references for DSA + Patterns.
   ===================================================================== */
window.CodexPractice = {
  nav: [
    { id: "scenarios", route: "#/scenarios", title: "Scenarios", label: "Coding drills", summary: "Model-answer outlines for algorithmic problem solving.", color: "#a78bfa" },
    { id: "interview", route: "#/interview", title: "Interview prompts", label: "Timed prompts", summary: "Practice explaining approach, complexity and trade-offs.", color: "#38bdf8" },
    { id: "rubrics", route: "#/rubrics", title: "Rubrics", label: "Score bands", summary: "Beginner, competent and senior coding-interview signals.", color: "#f5a623" },
    { id: "cheatsheets", route: "#/cheatsheets", title: "Cheat sheets", label: "Recall aids", summary: "Pattern triggers, templates and pitfalls.", color: "#5eead4" },
    { id: "glossary", route: "#/glossary", title: "Glossary", label: "Terms", summary: "DSA and pattern vocabulary with cross-links.", color: "#f472b6" }
  ],
  scenarios: [
    { id: "subarray-sum", title: "Subarray sum equals K", subtitle: "Prefix + hash map", timebox: "20 min", prompt: "Given an integer array and target K, count contiguous subarrays whose sum is K.", related: [{ label: "Prefix sum", route: "#/glossary/prefix-sum" }], outline: [{ title: "Approach", items: ["Track running prefix sum.", "For current sum S, previous prefixes S-K form valid subarrays.", "Seed frequency map with 0 -> 1."] }, { title: "Complexity", items: ["One pass O(n) time.", "O(n) space for prefix frequencies.", "Works with negative numbers, unlike sliding window."] }] },
    { id: "rotated-search", title: "Search rotated sorted array", subtitle: "Modified binary search", timebox: "25 min", prompt: "Find a target in a rotated sorted array with distinct values.", related: [{ label: "Binary search", route: "#/glossary/binary-search" }], outline: [{ title: "Approach", items: ["Maintain inclusive lo/hi bounds.", "At each mid, one half is sorted.", "Use target range to discard the impossible half."] }, { title: "Pitfalls", items: ["Off-by-one loops.", "Forgetting to return immediately on equality.", "Duplicates require a separate ambiguity strategy."] }] },
    { id: "course-schedule", title: "Course schedule", subtitle: "Directed graph cycle", timebox: "30 min", prompt: "Given prerequisites, decide if all courses can be finished.", related: [{ label: "Topological sort", route: "#/glossary/topological-sort" }], outline: [{ title: "Approach", items: ["Build adjacency and indegree.", "Process zero-indegree nodes with a queue.", "If processed count equals N, no cycle exists."] }, { title: "Complexity", items: ["O(V+E) time and space.", "DFS color marking is an equally valid solution."] }] },
    { id: "lru-cache", title: "LRU cache", subtitle: "Hash map + linked list", timebox: "35 min", prompt: "Design get/put for a fixed-capacity LRU cache in O(1).", related: [{ label: "Invariant", route: "#/glossary/invariant" }], outline: [{ title: "Data structures", items: ["Hash map key -> node.", "Doubly linked list ordered most-recent to least-recent.", "Sentinel head/tail remove edge cases."] }, { title: "Invariants", items: ["Every map entry points to exactly one list node.", "List size never exceeds capacity.", "Every get/put moves the key to most recent."] }] }
  ],
  interview: [
    { id: "two-sum-family", title: "Explain the Two Sum family", timebox: "10 min", prompt: "Walk from brute force to hash map to sorted two-pointer variants.", expected: ["Name input assumptions.", "Explain time/space trade-off.", "Mention sorted vs unsorted constraints."], followups: ["How do you return all pairs?", "What changes for 3Sum?"] },
    { id: "sliding-window", title: "When does sliding window work?", timebox: "10 min", prompt: "Explain why sliding window fails with negative numbers for sum constraints.", expected: ["Window relies on monotonic growth/shrink behavior.", "Negative values break the invariant.", "Use prefix sums/hash map instead."], followups: ["What about longest substring without repeats?", "Fixed vs variable window?"] },
    { id: "dp-recognition", title: "Recognize dynamic programming", timebox: "15 min", prompt: "Given a recursive brute force, decide whether memoization helps.", expected: ["Identify overlapping subproblems.", "Define state and transition.", "State base cases and iteration order."], followups: ["Can space be compressed?", "What if choices are greedy?"] }
  ],
  rubrics: { dimensions: ["Correctness and invariants", "Pattern recognition", "Complexity analysis", "Edge cases", "Communication"], bands: [
    { id: "beginner", title: "Beginner", summary: "Can reach a brute-force answer and name the likely pattern.", signals: ["Explains examples correctly.", "May miss edge cases or optimal complexity.", "Needs prompts to state invariants."] },
    { id: "competent", title: "Competent", summary: "Selects a suitable pattern, codes it cleanly, and explains complexity.", signals: ["States invariant before coding.", "Covers empty, single, duplicate and boundary cases.", "Keeps code simple and testable."] },
    { id: "senior", title: "Senior", summary: "Drives ambiguity, proves the invariant, and adapts when constraints change.", signals: ["Contrasts multiple approaches.", "Explains why the chosen pattern applies.", "Handles follow-ups without rewriting from scratch."] }
  ]},
  cheatsheets: [
    { id: "pattern-triggers", title: "Pattern trigger map", summary: "Quick signals for selecting patterns.", items: ["Range sums -> prefix sum.", "Sorted pair/triplet -> two pointers.", "Contiguous variable-length condition -> sliding window.", "Cycle/middle in linked list -> fast/slow pointers.", "All combinations/permutations -> backtracking."] },
    { id: "graph-checklist", title: "Graph checklist", summary: "Before coding graph problems.", items: ["Directed or undirected?", "Weighted or unweighted?", "Need shortest path, connectivity, ordering or cycle detection?", "Choose BFS, DFS, Union-Find, topological sort or Dijkstra accordingly."] },
    { id: "dp-template", title: "DP template", summary: "Turn recursion into memo/table.", items: ["Define state.", "Define transition.", "List base cases.", "Choose top-down or bottom-up.", "Check if space can be compressed."] }
  ],
  glossary: [
    { id: "prefix-sum", term: "Prefix sum", definition: "A cumulative total array that answers range-sum questions by subtraction.", useIt: "Use when range sums or subarray counts repeat.", links: [{ label: "Scenario", route: "#/scenarios/subarray-sum" }] },
    { id: "binary-search", term: "Binary search invariant", definition: "The rule that tells you which half can still contain the answer.", useIt: "State the invariant before writing lo/hi updates.", links: [{ label: "Scenario", route: "#/scenarios/rotated-search" }] },
    { id: "topological-sort", term: "Topological sort", definition: "An ordering of a DAG where every prerequisite appears before dependents.", useIt: "Use for course schedule, build order and dependency planning.", links: [{ label: "Scenario", route: "#/scenarios/course-schedule" }] },
    { id: "invariant", term: "Invariant", definition: "A condition your algorithm keeps true after every step.", useIt: "Use invariants to explain correctness under interview pressure.", links: [{ label: "LRU", route: "#/scenarios/lru-cache" }] }
  ]
};
