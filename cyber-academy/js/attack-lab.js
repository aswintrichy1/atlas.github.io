/* =====================================================================
   CITADEL · Attack Methods Virtual Lab
   Defensive, offline-only, original content. No network calls.
   ===================================================================== */
(function () {
  "use strict";

  const ATTACKS = [
    {
      id: "sqli", name: "SQL Injection", category: "Application", color: "#34d399",
      oneLine: "Data becomes dangerous when an app lets it change the shape of a database command.",
      methods: [
        m("In-band injection", "Unsafe string-built queries make a normal result screen change shape.", "Odd quotes, database errors or result-count jumps on one parameter.", "Prepared statements with bound parameters.", "Mark code versus data in a toy search query."),
        m("Union-style injection", "A vulnerable toy query combines its expected output with another table shape.", "Rows contain fields the screen never normally returns.", "Bind parameters and use least-privilege database accounts.", "Spot extra columns in a mock result grid."),
        m("Boolean blind injection", "The page leaks true or false through behavior, not printed errors.", "Tiny differences in empty, valid or invalid states for similar requests.", "Consistent responses plus parameterized queries.", "Compare two toy profile lookups and identify the leak."),
        m("Timing-based blind injection", "Slow database work reveals information through repeated latency changes.", "Repeatable latency spikes tied to unusual input.", "Query timeouts, slow-query monitoring and parameter binding.", "Flag the parameter causing a simulated timing spike."),
        m("Second-order injection", "Stored text is reused later in a newly built query.", "A batch report fails after previously accepted data is reused.", "Parameterize write-time and read-time jobs.", "Trace a toy username into an admin report.")
      ],
      quiz: ["What is the core mistake behind SQL injection?", "Mixing untrusted data into SQL command text instead of binding it as a value."]
    },
    {
      id: "xss", name: "Cross-Site Scripting", category: "Browser", color: "#818cf8",
      oneLine: "Untrusted content becomes browser-executable code instead of harmless text.",
      methods: [
        m("Reflected XSS", "Input is echoed into a response without the right output encoding.", "Encoded angle brackets or script-like words followed by client errors.", "Context-aware output encoding.", "Toggle escaping in a sandbox search result."),
        m("Stored XSS", "A saved comment or profile field later renders as active markup.", "Viewing a record breaks DOM structure or triggers browser errors.", "Sanitize rich text and encode on display.", "Compare raw versus sanitized comment preview."),
        m("DOM XSS", "Client JavaScript writes URL or storage data into dangerous DOM sinks.", "Server logs look normal while hash fragments alter the page.", "Use textContent and validate before rendering.", "Switch a toy widget from innerHTML to textContent."),
        m("Attribute XSS", "Input escapes an HTML attribute and changes element behavior.", "Malformed attributes or unexpected event attributes appear in generated markup.", "Quote attributes and encode in attribute context.", "Inspect a sandbox profile card after editing a display name."),
        m("Mutation XSS", "Parser or sanitizer quirks transform markup after the app thinks it is safe.", "Stored, sanitized and final DOM trees differ unexpectedly.", "Use maintained sanitizers and verify the final DOM.", "Compare original input, sanitizer output and final DOM.")
      ],
      quiz: ["What is the safest default for user-provided plain text?", "Render it with safe text APIs, not as HTML."]
    },
    {
      id: "csrf", name: "Cross-Site Request Forgery", category: "Browser", color: "#f5a623",
      oneLine: "A signed-in browser is tricked into sending an unwanted state-changing request.",
      methods: [
        m("Auto-submitted form", "A hidden form submits when a decoy page loads.", "Valid cookies with no matching user interaction.", "Session-bound CSRF tokens.", "Block a toy profile update without a token."),
        m("Image or link trigger", "A state-changing GET is invoked like a harmless asset.", "Sensitive actions appear in GET logs.", "Keep GET read-only and require protected POST.", "Convert a toy toggle from GET to POST."),
        m("SameSite gap", "Cookies are sent in cross-site contexts the app did not expect.", "Requests arrive with cookies from another site context.", "SameSite cookies plus token validation.", "Compare SameSite unset, Lax and Strict."),
        m("Login CSRF", "A browser is forced into logging in as a different toy user.", "Login POSTs lack user-intent signals.", "Protect login forms and rotate sessions.", "Reject toy login POSTs missing a token."),
        m("Weak Origin trust", "The backend skips Origin checks on unsafe methods.", "Cross-site POSTs succeed from untrusted origins.", "Validate Origin and keep token checks.", "Add an origin allowlist to a mock settings endpoint.")
      ],
      quiz: ["Why are cookies alone not proof of intent?", "Browsers attach them automatically, including on forged cross-site requests."]
    },
    {
      id: "ssrf", name: "Server-Side Request Forgery", category: "Server", color: "#2dd4bf",
      oneLine: "A server is tricked into making requests to destinations the user should not control.",
      methods: [
        m("URL fetch abuse", "Preview, import or callback features fetch user-supplied destinations.", "Server egress to loopback, private ranges or metadata-like paths.", "Strict allowlists, redirect blocking and egress policy.", "Build a toy previewer that accepts only assets.example."),
        m("Redirect pivot", "An allowed first hop redirects to a blocked target.", "Allowed domain followed by a hidden second-hop request.", "Validate every redirect target or disable redirects.", "Stop a sandbox fetcher before the second hop."),
        m("Parser confusion", "URL parsers disagree on host, scheme, port or credentials.", "Inputs with odd encoding, numeric IPs or extra at signs.", "Canonicalize once and reject ambiguous forms.", "Print normalized scheme, host and port before validation."),
        m("Internal service reach", "The app tier can reach admin-only services the user cannot.", "User-triggered workflows hit internal-only ports or paths.", "Network segmentation and authenticated internal services.", "Model public, app and admin service IDs."),
        m("Blind SSRF", "The attacker cannot see the response, but the request still happens.", "Outbound telemetry changes while user sees a generic error.", "Deny-by-default egress and destination logging.", "Audit blocked toy destinations without fetching.")
      ],
      quiz: ["Why is blocking only localhost not enough?", "Private ranges, redirects, DNS tricks and alternate address forms can still reach internal targets."]
    },
    {
      id: "command-injection", name: "OS Command Injection", category: "Server", color: "#fb7185",
      oneLine: "User text is interpreted as operating-system command syntax instead of one data argument.",
      methods: [
        m("Argument smuggling", "Shell separators or flags change a command built as one string.", "Unexpected extra arguments or output in command logs.", "Avoid shells; use structured APIs or argv arrays.", "Compare string execution with array-style execution."),
        m("Unsafe filename handling", "A filename is inserted into a conversion, cleanup or archive command.", "Spaces, quotes or metacharacters break parsing.", "Server-generated names and library calls.", "Validate toy upload names before mock processing."),
        m("Environment influence", "Input-controlled environment values change what a fixed command does.", "Same visible command behaves differently across runs.", "Minimal fixed environment and absolute paths.", "Lock a toy resolver to one executable path."),
        m("Helper script chain", "The risky string assembly hides one layer below the controller.", "Top-level code looks safe while helper logs show command construction.", "Typed helper parameters and full flow review.", "Mark where request data becomes command syntax."),
        m("Admin utility abuse", "A diagnostic panel allows free-form commands instead of narrow actions.", "Diagnostics can run arbitrary names, flags or subcommands.", "Predefined actions, role checks and audit logs.", "Redesign a toy diagnostics panel with fixed actions.")
      ],
      quiz: ["What is the best first mitigation for file operations?", "Use a standard library instead of invoking shell commands."]
    },
    {
      id: "path-traversal", name: "Path Traversal", category: "Server", color: "#a78bfa",
      oneLine: "User-controlled paths escape the folder the application intended to expose.",
      methods: [
        m("Dot-dot segments", "A file viewer joins a filename without checking the resolved path.", "Parent-directory markers appear in file parameters.", "Canonicalize and enforce an allowed base directory.", "Compare safe and escaping toy paths."),
        m("Encoded separators", "Validation happens before decoding creates separators.", "Raw input looks safe, decoded input changes shape.", "Decode once, normalize, then validate.", "Show decoder output before policy checks."),
        m("Absolute override", "A join helper accepts a path that replaces the base directory.", "Resolved path no longer starts inside content root.", "Reject absolute paths and prefer opaque file IDs.", "Map toy file IDs to server-owned paths."),
        m("Prefix confusion", "A sibling directory shares the same string prefix as the allowed path.", "A weak startsWith check accepts a lookalike folder.", "Compare canonical path components.", "Test a component-aware checker."),
        m("Local include routing", "A template parameter is treated as a file path.", "Unknown template names attempt unexpected includes.", "Use an explicit template allowlist.", "Switch a toy router to key-based includes.")
      ],
      quiz: ["Why is checking for '..' not enough?", "Encoding, normalization and alternate path forms can bypass raw string checks."]
    },
    {
      id: "deserialization", name: "Insecure Deserialization", category: "Server", color: "#f472b6",
      oneLine: "Untrusted serialized data recreates state or objects the application did not intend.",
      methods: [
        m("Type confusion", "The decoder trusts a class or type marker from the input.", "Serialized blobs contain caller-controlled type fields.", "Deserialize into simple DTOs and allowlist types.", "Map toy enum values to approved constructors."),
        m("State tampering", "Client-stored state includes fields only the server should set.", "Role, price, approval or balance fields appear in saved data.", "Keep authority server-side and sign client state.", "Move a toy discount rule back to server logic."),
        m("Gadget side effects", "Object restore hooks do work during loading.", "Constructors or callbacks touch files, network or commands.", "Keep deserialization classes passive.", "Separate toy data loading from actions."),
        m("Polymorphic JSON", "Automatic polymorphism instantiates unexpected object shapes.", "Type metadata appears inside JSON payloads.", "Disable default typing and use schemas.", "Validate a saved widget against a strict schema."),
        m("Replayable serialized tokens", "Old serialized state remains trusted too long.", "Stale objects continue to authorize actions.", "Short expiry, signatures and server-side revocation.", "Expire a toy serialized coupon after a timeline event.")
      ],
      quiz: ["What is the safest shape for untrusted serialized input?", "Simple schema-validated data, not native objects with behavior."]
    },
    {
      id: "xxe", name: "XML External Entity", category: "Parser", color: "#5eead4",
      oneLine: "An XML document makes the parser resolve entities instead of treating XML as data.",
      methods: [
        m("Doctype tripwire", "The parser accepts a DOCTYPE where the API should reject it.", "DOCTYPE appears in ordinary business XML.", "Disable DTD processing by default.", "Toggle DTD rejection on a harmless XML note."),
        m("External entity echo", "A parser expands an entity into output.", "Field values change after entity expansion.", "Disable external entities and resolvers.", "Use a local safe string fixture and block expansion."),
        m("Parameter entity probe", "DTD internals trigger unexpected parser work.", "DTD-related errors appear before validation.", "Disable parameter entities and external DTD loading.", "Block a nonexistent lab-only resource lookup."),
        m("Entity expansion stress", "Nested entities grow into large text.", "Small XML consumes unusual time or memory.", "Secure processing limits for size, depth and expansion.", "Compare bounded expansion before and after limits."),
        m("Schema trust boundary", "Validation fetches resources outside trusted local schemas.", "The validator loads non-approved schema locations.", "Use bundled schemas and no-network resolvers.", "Allow only one approved local schema.")
      ],
      quiz: ["What is the safest default for XML APIs?", "Reject DOCTYPE and disable external entity and DTD resolution."]
    },
    {
      id: "idor", name: "Broken Access Control", category: "Authorization", color: "#fbbf24",
      oneLine: "A valid object ID is not proof the current user may access that object.",
      methods: [
        m("User-scoped lookup", "The app fetches by global ID rather than current-user scope.", "Changing noteId returns another user's toy note.", "Resolve through currentUser resources.", "Compare getById with getForUser."),
        m("Tenant boundary gap", "Tenant membership is not checked with object ownership.", "Team Green session receives Team Blue data.", "Require tenant_id match on every query.", "Reject cross-team tickets with generic not-found."),
        m("Action-level gap", "Viewing and modifying are treated as the same permission.", "View-only role can update status.", "Check action, role and workflow state.", "Test toy invoice update roles."),
        m("Client-side trust", "Hidden buttons are treated like security controls.", "Direct handler calls succeed despite hidden UI.", "Enforce policy server-side.", "Call a disabled action and watch backend deny it."),
        m("Identifier design trap", "Random IDs reduce guessing but do not authorize access.", "Known random ID still returns data.", "Use non-enumerable IDs plus object-level checks.", "Run numeric and UUID-style IDs through the same policy.")
      ],
      quiz: ["What must be checked after an object ID exists?", "Whether the current user is allowed to access that specific object."]
    },
    {
      id: "auth-attacks", name: "Authentication Attacks", category: "Identity", color: "#22c55e",
      oneLine: "Attackers pressure login, MFA and recovery flows rather than one code path.",
      methods: [
        m("Credential stuffing", "Reused passwords are tried against many fake accounts.", "Many accounts fail, then a few succeed.", "MFA, breached-password checks and bot controls.", "Classify synthetic cross-account login logs."),
        m("Password spraying", "A few common guesses are spread across many accounts.", "One password pattern appears tenant-wide.", "Tenant-level detection and common-password blocking.", "Tune a low-and-slow spray threshold."),
        m("Brute force", "One account receives repeated guesses.", "Rapid failures and success after many misses.", "Progressive throttling and MFA.", "Compare fixed lockout with risk-based delay."),
        m("MFA fatigue", "A user is pressured to approve unexpected prompts.", "Denied-then-approved or repeated push prompts.", "Number matching and prompt rate limits.", "Sort toy MFA events into benign and abusive."),
        m("Recovery abuse", "Reset flows become an alternate login path.", "Reset followed by MFA or profile change.", "Strong recovery verification and session rotation.", "Mark identity checks in a toy recovery flow.")
      ],
      quiz: ["Why can spraying evade per-account lockout?", "Each user may see few failures while the suspicious pattern appears across the whole tenant."]
    },
    {
      id: "session-attacks", name: "Session Hijacking", category: "Identity", color: "#38bdf8",
      oneLine: "Weak session lifecycle lets copied or planted sessions impersonate users.",
      methods: [
        m("Session fixation", "A user authenticates with a session ID an attacker already knows.", "Session ID is unchanged before and after login.", "Rotate and invalidate IDs on authentication.", "Watch a guest session become authenticated safely."),
        m("Cookie theft", "A token is exposed through script, logs or transport.", "Cookies are JavaScript-readable or logged.", "HttpOnly, Secure and no raw token logging.", "Classify toy cookie headers."),
        m("Weak cookie flags", "Missing attributes make tokens easier to send or replay.", "Set-Cookie lacks SameSite, Secure or tight scope.", "Secure, HttpOnly, SameSite and narrow Path.", "Rewrite weak toy Set-Cookie headers."),
        m("Replay", "A copied session remains useful from a new context.", "Same session ID appears from two toy user agents.", "Server-side sessions, timeouts and revocation.", "Find replay in a mock request log."),
        m("Logout gaps", "Logout or privilege change leaves the old session valid.", "Old ID works after logout or password change.", "Invalidate on logout and rotate on sensitive events.", "Place rotation markers on a session timeline.")
      ],
      quiz: ["Which flag reduces JavaScript access to session cookies?", "HttpOnly."]
    },
    {
      id: "clickjacking", name: "Clickjacking", category: "Browser", color: "#fb7185",
      oneLine: "The user sees one interface, but clicks land on a hidden or disguised control.",
      methods: [
        m("Transparent frame overlay", "A sensitive page is hidden above a decoy button.", "Pointer coordinates hit framed controls.", "Deny untrusted framing and confirm sensitive actions.", "Toggle iframe opacity in a toy overlay."),
        m("Hidden form alignment", "A hidden form control sits under a visible prompt.", "Unexpected submissions follow benign-looking clicks.", "CSRF tokens and one-click action review.", "Separate decoy and form layers in a sandbox."),
        m("Drag-and-drop redress", "A drop target is disguised or layered.", "Drag actions trigger the wrong visible target.", "Validate origin and destination.", "Move toy tokens between honest and unsafe boxes."),
        m("Pointer event confusion", "Z-index and pointer-events make hit targets differ from visual order.", "Click logs point to invisible elements.", "Hit-test layers and disable decorative pointer events.", "Log clicked element names in stacked cards."),
        m("Fake modal framing", "A fake dialog captures intent for a background control.", "The visible confirmation and actual target differ.", "Frame blocking and trusted confirmation surfaces.", "Compare fake modal and top-page-only modal.")
      ],
      quiz: ["What does clickjacking exploit?", "A mismatch between what the user sees and what receives the click."]
    },
    {
      id: "open-redirect", name: "Open Redirect", category: "Browser", color: "#f97316",
      oneLine: "A trusted route forwards users to an untrusted destination.",
      methods: [
        m("Parameter forwarding", "A next or return value controls the final destination.", "Redirect parameters contain full external destinations.", "Allowlisted relative routes or server-side IDs.", "Compare /dashboard with login.example in a toy flow."),
        m("Double encoding", "The checker and redirector decode differently.", "Repeated percent-encoding appears in return values.", "Canonicalize once and reject ambiguity.", "Step through a toy decoder panel."),
        m("Trusted domain confusion", "The host visually resembles the trusted domain.", "Prefixes, suffixes or userinfo-like text mislead reviewers.", "Parse exact hostnames; avoid substring checks.", "Sort app.example lookalikes into buckets."),
        m("Phishing chain handoff", "The first hop is trusted, but the final destination is not.", "Urgent messages immediately leave the original route.", "Interstitials and unusual destination logging.", "Trace portal.example/redirect to a final toy host."),
        m("Post-login return abuse", "A raw return URL is preserved through authentication.", "Auth flow carries unvalidated external destinations.", "Short-lived server-side return IDs.", "Replace raw return URL with mapped return_id.")
      ],
      quiz: ["Why is substring host checking unsafe?", "A different host can include the trusted text while still being untrusted."]
    },
    {
      id: "prototype-pollution", name: "Prototype Pollution", category: "JavaScript", color: "#c084fc",
      oneLine: "Unsafe object writes let special keys affect shared JavaScript object behavior.",
      methods: [
        m("Unsafe deep merge", "Recursive copy helpers trust every incoming key.", "Reserved keys affect unrelated empty objects.", "Block dangerous keys at every depth.", "Merge toy preferences before and after a key guard."),
        m("Path setter abuse", "Dotted paths write outside the intended object.", "Path segments include reserved prototype names.", "Validate every path segment.", "Patch a toy setPath helper."),
        m("Query parser pollution", "Nested query parsing creates object structure from input.", "Parsed objects gain unexpected inherited fields.", "Disable prototype writes and use null-prototype containers.", "Parse bracket-style toy strings safely."),
        m("Config overlay mistake", "Client options merge into trusted defaults.", "Inherited isAdmin-like values change checks.", "Schemas and own-property checks.", "Compare truthy checks with Object.hasOwn."),
        m("Prototype-safe refactor", "Arbitrary keys move into Map instead of plain objects.", "Labels like constructor behave as data only.", "Use Map or Object.create(null).", "Refactor a toy tag counter.")
      ],
      quiz: ["Why validate nested keys, not only top-level keys?", "Dangerous names can appear at any depth during recursive writes."]
    },
    {
      id: "file-upload", name: "File Upload Abuse", category: "Storage", color: "#ef4444",
      oneLine: "Upload features fail when names, bytes, size, archives or storage location are trusted too much.",
      methods: [
        m("Extension tricks", "Names hide or reshape the final extension.", "Double extensions, trailing dots or mixed case appear.", "Normalize and use server-generated names.", "Classify ten toy filenames."),
        m("MIME spoofing", "Client Content-Type claims do not match bytes.", "Declared MIME, extension and magic bytes disagree.", "Verify signatures and parse safely.", "Match mock bytes to accepted types."),
        m("Oversized files", "Large or repeated uploads exhaust resources.", "Near-limit files, slow bodies or temp storage spikes.", "Request, file, count and quota limits.", "Evaluate toy upload attempts against policy."),
        m("Archive extraction", "Archives hide traversal, symlinks or huge expansion.", "Absolute paths, parent paths or too many members.", "Pre-scan archive entries in a sandbox.", "Reject unsafe fake archive entries."),
        m("Storage execution risk", "Uploads are served or processed as active content.", "Files are public, executable or opened by privileged tools.", "Store outside webroot and serve through handlers.", "Label a private upload flow.")
      ],
      quiz: ["Why is extension checking not enough?", "The content and storage behavior matter as much as the displayed filename."]
    },
    {
      id: "supply-chain", name: "Supply Chain Attacks", category: "Build", color: "#facc15",
      oneLine: "Attackers target dependencies, builds and automation so trusted delivery carries untrusted changes.",
      methods: [
        m("Typosquatting", "A lookalike package name is selected by mistake.", "New names differ by one character or separator.", "Package allowlists and lockfiles.", "Flag near-matches in a toy dependency list."),
        m("Dependency confusion", "A public package wins over an internal package name.", "Build logs pull internal names from public sources.", "Scoped private registries and fail-closed policy.", "Fix a mock resolver policy."),
        m("Malicious updates", "A trusted package changes behavior in a new release.", "Patch update adds file access or network behavior.", "Pinned versions and staged review.", "Compare two toy package diffs."),
        m("Build script abuse", "Install or test scripts run automatically.", "Lifecycle scripts touch env vars or outside folders.", "Sandbox builds and disable scripts where possible.", "Review a mock package manifest."),
        m("Compromised CI secrets", "Pipeline tokens allow publishing or deployment.", "Privileged tokens appear in broad jobs or logs.", "Short-lived least-privilege CI roles.", "Reduce token permissions in a toy workflow.")
      ],
      quiz: ["Why can a patch update be risky?", "A trusted package name can still ship new malicious or unsafe behavior."]
    },
    {
      id: "api-abuse", name: "API Abuse", category: "API", color: "#60a5fa",
      oneLine: "APIs fail when data shape, authorization, methods or traffic limits do not match business rules.",
      methods: [
        m("BOLA", "A user changes an object ID and receives another user's data.", "Objects outside session scope return success.", "Object-level authorization on every lookup.", "Compare unsafe and user-scoped task APIs."),
        m("Mass assignment", "Extra fields update server-controlled properties.", "Request bodies contain role or creditLimit fields.", "Explicit request DTOs or allowlists.", "Patch a toy profile endpoint."),
        m("Excessive exposure", "The API returns raw internal records.", "Responses include hidden notes or unrelated details.", "Purpose-built response models.", "Trim a sandbox orders response."),
        m("Rate-limit abuse", "A business action repeats too fast.", "Coupon checks or messages keep returning success.", "Limits per user, tenant and action.", "Add cooldown to a toy coupon endpoint."),
        m("Unsafe methods", "GET changes state or unexpected verbs work.", "State changes happen through safe-looking requests.", "Allow only required methods.", "Lock a toy inventory API by method and role.")
      ],
      quiz: ["What is BOLA missing?", "Authorization for the specific object, not just authentication."]
    },
    {
      id: "jwt-oauth", name: "JWT and OAuth Misconfiguration", category: "Identity", color: "#8b5cf6",
      oneLine: "Token and redirect mistakes turn valid-looking flows into authorization failures.",
      methods: [
        m("Algorithm confusion", "The verifier trusts the token header to choose verification.", "Unexpected algorithms pass tests.", "Pin the expected algorithm and key type.", "Compare permissive and pinned toy verifiers."),
        m("Missing audience", "A token for one service works at another.", "Profile token accepted by billing API.", "Require exact aud validation.", "Route toy tokens to two mock APIs."),
        m("Missing issuer", "The app accepts tokens from unknown issuers.", "Untrusted lab issuer passes generic parsing.", "Validate iss and key set.", "Allow only the configured toy issuer."),
        m("Long-lived tokens", "Access remains useful after session risk changes.", "Token works after logout or role change.", "Short-lived access tokens and revocation.", "Expire a toy token timeline."),
        m("Redirect and scope confusion", "Loose redirect matching or broad scopes grant too much.", "Variants of redirect URI or generic scopes succeed.", "Exact redirect matching and precise scopes.", "Compare loose and exact OAuth toy flows.")
      ],
      quiz: ["Why pin JWT algorithms?", "The token header is input; the verifier must enforce its own policy."]
    },
    {
      id: "dns-rebinding", name: "DNS Rebinding", category: "Network", color: "#14b8a6",
      oneLine: "A browser page changes DNS resolution to pivot toward internal toy services.",
      methods: [
        m("Same-origin flip", "One origin's resolved address changes mid-session.", "A public name suddenly maps to private-like addresses.", "Block private answers for untrusted names.", "Label a toy resolver timeline."),
        m("Router panel probe", "A browser reaches a mock internal admin page.", "Different status patterns from internal-looking routes.", "Host validation and authenticated admin tools.", "Stop requests with unexpected Host."),
        m("Loopback pivot", "A page tries to reach a local developer service.", "Fetch attempts to simulated loopback APIs.", "Origin allowlists and tokens for local APIs.", "Compare local API with and without origin checks."),
        m("TTL race", "Short DNS lifetimes enable fast answer changes.", "Low TTL and private-range answers appear together.", "Resolver rebinding protection.", "Adjust a toy TTL slider."),
        m("Metadata temptation", "The browser is aimed at metadata-like services.", "Requests target reserved internal service labels.", "Headers or tokens and network blocking.", "Require a lab header for fake metadata.")
      ],
      quiz: ["Why target the browser?", "It may sit inside a trusted network and can be reused as a bridge."]
    },
    {
      id: "prompt-injection", name: "Prompt Injection", category: "AI", color: "#06b6d4",
      oneLine: "Untrusted text tries to become instructions for an LLM or its tools.",
      methods: [
        m("Direct injection", "The user asks the assistant to ignore its real instructions.", "Role-changing, boundary-removal or secret-reveal language.", "Policy outside the model and instruction separation.", "Classify trusted instruction versus user data."),
        m("Indirect RAG injection", "A retrieved document contains hidden commands.", "Retrieved text tells the assistant to ignore the user.", "Treat retrieved text as untrusted content.", "Summarize a poisoned toy document safely."),
        m("Tool output injection", "A tool result includes imperative instructions.", "Scanner or log output says to run unrelated actions.", "Parse expected fields with strict schemas.", "Extract only structured finding fields."),
        m("Data exfiltration attempt", "The attacker asks for hidden prompts or secrets.", "Requests for tokens, raw chunks or private memory.", "Least-privilege retrieval and redaction.", "Refuse fake vault secrets while returning public notes."),
        m("Unsafe action approval", "Urgency or fake approval pressures a risky action.", "Skip-confirmation or bundled dangerous actions.", "Explicit previews and human confirmation.", "Choose which toy actions require approval.")
      ],
      quiz: ["What should happen to instructions inside retrieved documents?", "They should be treated as content to analyze, not commands to obey."]
    }
  ];

  function m(name, lens, signal, mitigation, lab) {
    return { name, lens, signal, mitigation, lab };
  }

  const STORE = "cy_attack_lab_v1";
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const h = (tag, attrs = {}, ...kids) => {
    const node = document.createElement(tag);
    Object.keys(attrs).forEach((key) => {
      const value = attrs[key];
      if (key === "class") node.className = value;
      else if (key === "style") node.setAttribute("style", value);
      else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2).toLowerCase(), value);
      else if (value != null) node.setAttribute(key, value);
    });
    kids.flat().forEach((kid) => {
      if (kid == null || kid === false) return;
      node.appendChild(typeof kid === "string" ? document.createTextNode(kid) : kid);
    });
    return node;
  };

  function loadDone() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE) || "[]");
      return new Set(Array.isArray(raw) ? raw.filter((x) => typeof x === "string") : []);
    } catch (e) {
      return new Set();
    }
  }

  function saveDone(done) {
    try { localStorage.setItem(STORE, JSON.stringify(Array.from(done))); } catch (e) {}
  }

  function methodKey(attack, idx) {
    return attack.id + "#" + idx;
  }

  function percentFor(attack, done) {
    const completed = attack.methods.filter((_, idx) => done.has(methodKey(attack, idx))).length;
    return Math.round((completed / attack.methods.length) * 100);
  }

  function buildReport(done) {
    const lines = ["# Citadel Attack Methods Virtual Lab", "", "Defensive study plan generated locally.", ""];
    ATTACKS.forEach((attack) => {
      lines.push("## " + attack.name);
      lines.push(attack.oneLine);
      attack.methods.forEach((method, idx) => {
        lines.push("- [" + (done.has(methodKey(attack, idx)) ? "x" : " ") + "] " + method.name + " — " + method.mitigation);
      });
      lines.push("");
    });
    return lines.join("\n");
  }

  function downloadReport(done) {
    try {
      const blob = new Blob([buildReport(done)], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = h("a", { href: url, download: "citadel-attack-lab.md" });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {}
  }

  function mount(root, options) {
    const done = loadDone();
    const opts = options || {};
    let activeAttack = (opts.attackId && ATTACKS.filter((a) => a.id === opts.attackId)[0]) || ATTACKS[0];
    let activeMethod = 0;
    let search = "";
    let category = "all";
    let progressFilter = "all";
    let labMode = "defense";
    let simulationTimers = [];
    let simulationSession = null;

    const totalMethods = ATTACKS.reduce((n, attack) => n + attack.methods.length, 0);

    root.innerHTML = "";
    root.appendChild(h("article", { class: "lesson attack-lab-page" },
      h("nav", { class: "crumbs" },
        h("a", { href: "#/" }, "Home"),
        h("span", { class: "sep" }, "/"),
        h("span", {}, "Attack Methods Virtual Lab")
      ),
      h("section", { class: "al-hero reveal in" },
        h("span", { class: "al-kicker" }, "Sandbox-only offensive method map"),
        h("h1", {}, "Practice attack thinking without touching a real target."),
        h("p", {}, "Explore 20 attack families and 100 distinct methods. Each card focuses on the defender's mental model: what the attack is trying to bend, what telemetry changes, and which control blocks it."),
        h("div", { class: "al-hero-actions" },
          h("button", { class: "btn btn-primary", type: "button", onClick: () => runSimulation() }, "Start current simulation"),
          h("button", { class: "btn btn-ghost", type: "button", onClick: () => downloadReport(done) }, "Download study plan"),
          h("button", { class: "btn btn-ghost", type: "button", onClick: () => { if (!done.size) return; if (window.confirm("Reset all Attack Lab progress? This can\u2019t be undone.")) { done.clear(); saveDone(done); renderAll(); } } }, "Reset lab progress")
        ),
        h("div", { class: "al-stat-grid" },
          stat(String(ATTACKS.length), "attack families"),
          stat(String(totalMethods), "methods"),
          stat("offline", "no network"),
          stat("defensive", "safe framing")
        )
      ),
      h("section", { class: "al-guide", "aria-label": "How to use this page" },
        h("div", { class: "al-guide-copy" },
          h("span", { class: "al-guide-kicker" }, "How to use this page"),
          h("h2", {}, "Pick a family, choose a method, then step through the lab."),
          h("p", {}, "Use Defense mode to learn detection and controls. Switch to Attack mode to see the same safe example from the attacker decision path, without real payloads or network calls.")
        ),
        h("ol", { class: "al-guide-steps" },
          h("li", {}, h("strong", {}, "1"), h("span", {}, "Select one of the 20 attack families.")),
          h("li", {}, h("strong", {}, "2"), h("span", {}, "Pick a method tab inside that family.")),
          h("li", {}, h("strong", {}, "3"), h("span", {}, "Start the simulation, then press Next step at your pace.")),
          h("li", {}, h("strong", {}, "4"), h("span", {}, "Mark the method complete when the concept clicks."))
        )
      )
    ));

    const article = $(".attack-lab-page", root);
    const controls = h("section", { class: "al-controls", "aria-label": "Attack lab filters" },
      h("div", { class: "al-control" }, h("label", { for: "alSearch" }, "Search"), h("input", { id: "alSearch", type: "search", placeholder: "SQLi, cookie, OAuth, upload..." })),
      h("div", { class: "al-control" }, h("label", { for: "alCategory" }, "Category"), h("select", { id: "alCategory" })),
      h("div", { class: "al-control" }, h("label", { for: "alProgress" }, "Progress"), h("select", { id: "alProgress" },
        h("option", { value: "all" }, "All attacks"),
        h("option", { value: "unfinished" }, "Unfinished only"),
        h("option", { value: "complete" }, "Complete only")
      ))
    );
    article.appendChild(controls);

    const shell = h("section", { class: "al-grid-shell" },
      h("div", { class: "al-card-grid", id: "alCards" }),
      h("aside", { class: "al-panel", id: "alPanel", "aria-label": "Selected attack lab" })
    );
    article.appendChild(shell);
    article.appendChild(h("div", { class: "al-safety" },
      h("strong", {}, "Safety boundary. "),
      "Everything here is fictional and local. Use these patterns only to recognize risk, design controls and test systems you own or are explicitly authorized to assess."
    ));

    const categorySelect = $("#alCategory", article);
    ["all"].concat(Array.from(new Set(ATTACKS.map((a) => a.category))).sort()).forEach((cat) => {
      categorySelect.appendChild(h("option", { value: cat }, cat === "all" ? "All categories" : cat));
    });

    $("#alSearch", article).addEventListener("input", (event) => { search = event.target.value.trim().toLowerCase(); renderAll(); });
    categorySelect.addEventListener("change", (event) => { category = event.target.value; renderAll(); });
    $("#alProgress", article).addEventListener("change", (event) => { progressFilter = event.target.value; renderAll(); });

    function stat(value, label) {
      return h("div", { class: "al-stat" }, h("strong", {}, value), h("span", {}, label));
    }

    function visibleAttacks() {
      return ATTACKS.filter((attack) => {
        const hay = (attack.name + " " + attack.category + " " + attack.oneLine + " " + attack.methods.map((x) => x.name).join(" ")).toLowerCase();
        const pct = percentFor(attack, done);
        if (search && !hay.includes(search)) return false;
        if (category !== "all" && attack.category !== category) return false;
        if (progressFilter === "unfinished" && pct === 100) return false;
        if (progressFilter === "complete" && pct !== 100) return false;
        return true;
      });
    }

    function renderCards() {
      const cards = $("#alCards", article);
      cards.innerHTML = "";
      const list = visibleAttacks();
      if (!list.length) {
        cards.appendChild(h("div", { class: "al-empty" }, "No attack families match the current filters."));
        return false;
      }
      if (!list.some((attack) => attack.id === activeAttack.id)) {
        activeAttack = list[0];
        activeMethod = 0;
      }
      list.forEach((attack) => {
        const completed = attack.methods.filter((_, idx) => done.has(methodKey(attack, idx))).length;
        const pct = percentFor(attack, done);
        const card = h("button", {
          class: "al-card" + (attack.id === activeAttack.id ? " active" : ""),
          type: "button",
          style: "--al-card-color:" + attack.color,
          onClick: () => { activeAttack = attack; activeMethod = 0; renderAll(); }
        },
          h("div", { class: "al-card-top" },
            h("span", { class: "al-chip" }, attack.category),
            h("span", { class: "al-method-count" }, completed + " / " + attack.methods.length)
          ),
          h("h2", {}, attack.name),
          h("p", {}, attack.oneLine),
          h("div", { class: "al-meter" },
            h("div", { class: "al-meter-bar", style: "--done:" + pct + "%" }, h("i", {})),
            h("div", { class: "al-card-meta" }, h("span", {}, attack.methods.length + " methods"), h("span", {}, pct + "% complete"))
          )
        );
        cards.appendChild(card);
      });
      return true;
    }

    function renderPanel() {
      clearSimulationTimers();
      const panel = $("#alPanel", article);
      const method = activeAttack.methods[activeMethod];
      const key = methodKey(activeAttack, activeMethod);
      const attackPct = percentFor(activeAttack, done);
      const copy = modeCopy();
      panel.style.setProperty("--active-color", activeAttack.color);
      panel.innerHTML = "";
      panel.appendChild(h("div", { class: "al-panel-head" },
        h("span", { class: "al-chip" }, activeAttack.category),
        h("h2", {}, activeAttack.name),
        h("p", {}, activeAttack.oneLine),
        h("div", { class: "al-panel-meta" },
          h("p", { class: "al-progress-text" }, "Family progress: " + attackPct + "%"),
          renderModeToggle()
        ),
        h("span", { class: "al-mode-pill " + labMode }, copy.badge)
      ));
      const methodTabs = h("div", { class: "al-method-tabs", role: "tablist", "aria-label": activeAttack.name + " methods" },
        activeAttack.methods.map((item, idx) =>
          h("button", {
            class: "al-method-tab" + (idx === activeMethod ? " active" : ""),
            type: "button",
            role: "tab",
            id: "alTab-" + idx,
            "aria-selected": idx === activeMethod ? "true" : "false",
            tabindex: idx === activeMethod ? "0" : "-1",
            onClick: () => { activeMethod = idx; renderPanel(); }
          }, (done.has(methodKey(activeAttack, idx)) ? "✓ " : "") + item.name)
        )
      );
      methodTabs.addEventListener("keydown", onMethodTabsKey);
      panel.appendChild(methodTabs);
      panel.appendChild(h("div", { class: "al-method-body", role: "tabpanel", "aria-label": method.name },
        h("div", { class: "al-info-grid" },
          info(copy.infoOne, copy.infoOneText(method)),
          info(copy.infoTwo, copy.infoTwoText(method)),
          info(copy.infoThree, copy.infoThreeText(method))
        ),
        h("div", { class: "al-lab-task" },
          h("h3", {}, copy.taskTitle(method)),
          h("p", {}, method.lab)
        ),
        renderSimulationWorkbench(activeAttack, method),
        h("div", { class: "al-panel-actions" },
          h("button", { class: "btn btn-primary", type: "button", onClick: () => runSimulation() }, "Start / reset simulation"),
          h("button", { class: "btn btn-ghost", type: "button", onClick: () => nextSimulationStep() }, "Next step"),
          h("button", {
            class: "btn btn-ghost",
            type: "button",
            onClick: () => {
              if (done.has(key)) done.delete(key);
              else done.add(key);
              saveDone(done);
              renderAll();
            }
          }, done.has(key) ? "Mark not done" : "Mark method complete")
        ),
        h("div", { class: "al-console" },
          h("div", { class: "al-console-head" }, h("span", {}, "simulation console"), h("span", {}, "manual stepper")),
          h("pre", { id: "alConsole", role: "log", "aria-live": "polite", "aria-label": "Simulation console output" }, "Start the simulation, then use Next step to move through intake, vulnerable branch, detector, control and fixed outcome.")
        ),
        renderQuiz(activeAttack)
      ));
      syncHash();
    }

    function info(label, text) {
      return h("div", { class: "al-info" }, h("h3", {}, label), h("p", {}, text));
    }

    function renderQuiz(attack) {
      const quiz = Array.isArray(attack.quiz) ? attack.quiz : [];
      if (quiz.length < 2) return false;
      const answer = h("p", { class: "al-quiz-a" }, quiz[1]);
      answer.hidden = true;
      const btn = h("button", { class: "btn btn-ghost al-quiz-btn", type: "button", "aria-expanded": "false" }, "Reveal answer");
      btn.addEventListener("click", () => {
        const show = answer.hidden;
        answer.hidden = !show;
        btn.setAttribute("aria-expanded", show ? "true" : "false");
        btn.textContent = show ? "Hide answer" : "Reveal answer";
      });
      return h("div", { class: "al-quiz" },
        h("div", { class: "al-quiz-head" }, h("span", {}, "quick check"), h("span", {}, attack.category)),
        h("p", { class: "al-quiz-q" }, quiz[0]),
        btn,
        answer
      );
    }

    function onMethodTabsKey(event) {
      const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
      if (keys.indexOf(event.key) === -1) return;
      event.preventDefault();
      const count = activeAttack.methods.length;
      let idx = activeMethod;
      if (event.key === "ArrowRight") idx = (activeMethod + 1) % count;
      else if (event.key === "ArrowLeft") idx = (activeMethod - 1 + count) % count;
      else if (event.key === "Home") idx = 0;
      else if (event.key === "End") idx = count - 1;
      activeMethod = idx;
      renderPanel();
      const tab = $("#alTab-" + idx, article);
      if (tab) tab.focus();
    }

    function syncHash() {
      try {
        const target = "#/attack-lab/" + activeAttack.id;
        if (location.hash !== target) history.replaceState(null, "", target);
      } catch (e) {}
    }

    function renderModeToggle() {
      return h("div", { class: "al-mode-toggle", "aria-label": "Simulation mode" },
        h("button", {
          class: "al-mode-btn" + (labMode === "defense" ? " active" : ""),
          type: "button",
          "aria-pressed": labMode === "defense" ? "true" : "false",
          onClick: () => { labMode = "defense"; renderPanel(); }
        }, "Defense"),
        h("button", {
          class: "al-mode-btn attack" + (labMode === "attack" ? " active" : ""),
          type: "button",
          "aria-pressed": labMode === "attack" ? "true" : "false",
          onClick: () => { labMode = "attack"; renderPanel(); }
        }, "Attack")
      );
    }

    function renderSimulationWorkbench(attack, method) {
      const example = exampleFor(attack, method);
      const copy = modeCopy();
      return h("div", { class: "al-sim", id: "alSim" },
        h("div", { class: "al-sim-head" },
          h("div", {},
            h("span", { class: "al-sim-kicker" }, copy.kicker),
            h("h3", {}, copy.workbenchTitle)
          ),
          h("div", { class: "al-sim-badges" },
            h("span", { class: "al-sim-step", id: "alStepCounter" }, "step 0 / 5"),
            h("span", { class: "al-sim-status idle", id: "alSimStatus", role: "status", "aria-live": "polite" }, "idle")
          )
        ),
        h("div", { class: "al-flow", "aria-label": "Simulation stages" },
          flowNode("intake", copy.stages[0]),
          flowNode("vulnerable", copy.stages[1]),
          flowNode("detect", copy.stages[2]),
          flowNode("control", copy.stages[3]),
          flowNode("fixed", copy.stages[4])
        ),
        h("div", { class: "al-sim-grid" },
          h("div", { class: "al-toy-app" },
            h("div", { class: "al-window-head" }, h("span", {}, "toy app"), h("span", {}, attack.category)),
            h("div", { class: "al-stage-scene", id: "alStageScene", "aria-hidden": "true" },
              h("span", { class: "al-service client" }, "client"),
              h("span", { class: "al-packet", id: "alPacket" }, "REQ"),
              h("span", { class: "al-service app" }, "app"),
              h("span", { class: "al-service shield" }, "control")
            ),
            h("div", { class: "al-sim-field" }, h("span", {}, "request"), h("code", { id: "alRequestValue" }, "waiting for local run")),
            h("div", { class: "al-sim-field" }, h("span", {}, "input"), h("code", { id: "alInputValue" }, toyInputFor(attack, method))),
            h("div", { class: "al-sim-field" }, h("span", {}, "handler"), h("code", { id: "alHandlerValue" }, "not executed")),
            h("div", { class: "al-sim-field" }, h("span", {}, "decision"), h("code", { id: "alDecisionValue" }, "pending"))
          ),
          h("div", { class: "al-sim-side" },
            simMeter("risk", "Risk score", "alRiskValue", 0),
            simMeter("latency", "Toy latency", "alLatencyValue", 0),
            simMeter("blocked", "Blocked by control", "alBlockedValue", 0),
            h("div", { class: "al-event-box" },
              h("span", {}, "telemetry events"),
              h("ul", { id: "alEventStream" }, h("li", {}, "No events yet."))
            )
          )
        ),
        h("div", { class: "al-example-lanes" },
          h("div", { class: "al-example-card scenario" },
            h("span", {}, copy.exampleLabel),
            h("strong", { id: "alExampleTitle" }, example.title),
            h("p", { id: "alExampleScenario" }, example.scenario)
          ),
          h("div", { class: "al-example-card danger" },
            h("span", {}, copy.vulnerableLabel),
            h("code", { id: "alVulnerableValue" }, example.vulnerable)
          ),
          h("div", { class: "al-example-card safe" },
            h("span", {}, copy.fixedLabel),
            h("code", { id: "alFixedValue" }, example.fixed)
          ),
          h("div", { class: "al-example-card observe" },
            h("span", {}, copy.observeLabel),
            h("p", { id: "alObservationValue" }, example.observation)
          )
        )
      );
    }

    function flowNode(id, label) {
      return h("div", { class: "al-flow-node", id: "alFlow-" + id },
        h("i", {}),
        h("span", {}, label)
      );
    }

    function simMeter(kind, label, id, value) {
      return h("div", { class: "al-sim-meter " + kind },
        h("div", { class: "al-sim-meter-top" }, h("span", {}, label), h("strong", { id }, value + "%")),
        h("div", { class: "al-sim-meter-bar", style: "--value:" + value + "%" }, h("i", {}))
      );
    }

    function runSimulation() {
      clearSimulationTimers();
      const consoleEl = $("#alConsole", article);
      if (!consoleEl) return;
      const method = activeAttack.methods[activeMethod];
      const steps = simulationSteps(activeAttack, method);
      simulationSession = { steps, index: 0 };
      resetSimulationUi(activeAttack, method);
      consoleEl.textContent = "";
      setText("#alStepCounter", "step 0 / " + steps.length);
      nextSimulationStep();
    }

    function nextSimulationStep() {
      const consoleEl = $("#alConsole", article);
      if (!consoleEl) return;
      if (!simulationSession || simulationSession.index >= simulationSession.steps.length) {
        return;
      }
      const step = simulationSession.steps[simulationSession.index];
      const isDone = simulationSession.index === simulationSession.steps.length - 1;
      applySimulationStep(step, isDone);
      consoleEl.textContent += (consoleEl.textContent ? "\n" : "") + step.log;
      simulationSession.index++;
      setText("#alStepCounter", "step " + simulationSession.index + " / " + simulationSession.steps.length);
    }

    function simulationSteps(attack, method) {
      const example = exampleFor(attack, method);
      const input = example.riskyInput;
      const copy = modeCopy();
      return [
        {
          stage: "intake",
          status: copy.stepStatus[0],
          request: example.normal,
          input,
          handler: copy.intakeHandler,
          decision: copy.intakeDecision,
          risk: 12,
          latency: 10,
          blocked: 0,
          event: example.scenario,
          vulnerable: example.vulnerableIdle,
          fixed: example.fixedIdle,
          observation: copy.baselinePrefix + example.observation,
          log: "[intake] " + copy.intakeLog(example)
        },
        {
          stage: "vulnerable",
          status: copy.stepStatus[1],
          request: example.riskyRequest,
          input,
          handler: copy.vulnerableHandler(example),
          decision: copy.vulnerableDecision(example),
          risk: 64,
          latency: 34,
          blocked: 0,
          vulnerable: example.vulnerable,
          fixed: example.fixedIdle,
          observation: method.lens,
          event: method.lens,
          log: "[vulnerable] " + method.lens
        },
        {
          stage: "detect",
          status: copy.stepStatus[2],
          request: "Detector compares baseline: " + example.signalLabel,
          input,
          handler: copy.detectHandler,
          decision: copy.detectDecision,
          risk: 82,
          latency: 58,
          blocked: 18,
          vulnerable: example.vulnerable,
          fixed: "control not applied yet",
          observation: method.signal,
          event: method.signal,
          log: "[detect] " + method.signal
        },
        {
          stage: "control",
          status: copy.stepStatus[3],
          request: example.fixedRequest,
          input,
          handler: example.fixedHandler,
          decision: copy.controlDecision(example),
          risk: 28,
          latency: 38,
          blocked: 72,
          vulnerable: "vulnerable branch bypassed",
          fixed: example.fixed,
          observation: method.mitigation,
          event: method.mitigation,
          log: "[control] " + method.mitigation
        },
        {
          stage: "fixed",
          status: copy.stepStatus[4],
          request: "Safe result rendered for " + example.title,
          input: example.safeInput,
          handler: copy.fixedHandler,
          decision: copy.fixedDecision,
          risk: 6,
          latency: 18,
          blocked: 100,
          vulnerable: "blocked before unsafe result: " + example.vulnerable,
          fixed: example.outcome,
          observation: "Study checkpoint: " + method.lab,
          event: method.lab,
          log: "[outcome] sandbox contained the method. Learning task: " + method.lab
        }
      ];
    }

    function toyInputFor(attack, method) {
      const inputs = {
        sqli: "search term + TOY_DATA_MARKER",
        xss: "comment text + harmless markup marker",
        csrf: "settings change from training.example",
        ssrf: "preview target: assets.example/resource",
        "command-injection": "filename: report-toy.txt",
        "path-traversal": "file id: public-guide",
        deserialization: "saved state with typed toy fields",
        xxe: "XML note with DTD-like training marker",
        idor: "object id owned by another toy user",
        "auth-attacks": "synthetic login event batch",
        "session-attacks": "session id timeline sample",
        clickjacking: "stacked UI click coordinate",
        "open-redirect": "return id mapped to a safe route",
        "prototype-pollution": "nested preference update",
        "file-upload": "upload metadata + fake magic bytes",
        "supply-chain": "dependency manifest diff",
        "api-abuse": "API request with extra toy field",
        "jwt-oauth": "token claims from lab issuer",
        "dns-rebinding": "resolver answer timeline",
        "prompt-injection": "untrusted document instruction text"
      };
      return (inputs[attack.id] || attack.category.toLowerCase() + " input") + " [" + method.name + "]";
    }

    function exampleFor(attack, method) {
      const examples = {
        sqli: ex("Product search", "Catalog search on shop.example receives a product keyword.", "GET /search?q=router", "q=router + [SQL-control-marker]", "query text is concatenated into command text", "unexpected catalog rows would be returned", "q is bound as a value; zero unexpected rows", "prepared search returns only matching products", "query-shape anomaly"),
        xss: ex("Comment preview", "A profile comment renderer previews user text before saving.", "POST /comments/preview", "comment=<training-markup-text>", "preview writes text into an HTML-capable sink", "markup-like text would alter the preview surface", "textContent renders the marker as visible text", "escaped preview shows harmless text", "DOM shape change"),
        csrf: ex("Profile update", "An account settings form changes the display email.", "POST /settings/email from app.example", "POST from training.example without user token", "server trusts browser cookies alone", "settings would change without intent proof", "session token and Origin check reject the request", "no account change; event is logged", "missing intent token"),
        ssrf: ex("Link preview", "A message app creates a preview card for a shared link.", "POST /preview url=https://assets.example/card", "url=internal-service.example", "server fetcher trusts caller-chosen destinations", "app tier would attempt a blocked destination", "allowlist accepts only approved preview hosts", "preview request denied before any fetch", "blocked egress destination"),
        "command-injection": ex("File converter", "A document tool converts uploaded filenames into PDF labels.", "POST /convert filename=report.txt", "filename=report [separator-marker].txt", "handler assembles one shell string", "extra command-shaped text would change parsing", "library call receives filename as one argument", "file processed without shell interpretation", "argument boundary violation"),
        "path-traversal": ex("Training file viewer", "A docs portal serves files by public IDs.", "GET /docs?id=welcome-guide", "id=parent-directory-marker", "viewer joins raw path text to the content root", "resolved path leaves the intended docs folder", "opaque ID maps to a server-owned path", "unknown ID returns generic not found", "path normalization escape"),
        deserialization: ex("Saved cart state", "A checkout demo restores cart data from client state.", "POST /cart/restore simple JSON cart", "state includes server-only role marker", "decoder trusts client-controlled fields", "restored state would include authority it should not own", "schema accepts only cart item fields", "server recomputes price and role state", "unexpected privileged field"),
        xxe: ex("XML invoice import", "A finance importer reads simple XML invoices.", "POST /invoice.xml with plain invoice fields", "XML includes DTD-training-marker", "parser allows document type processing", "parser would try to resolve non-business XML features", "DOCTYPE is rejected before parsing", "invoice is refused with parser policy event", "DOCTYPE in business XML"),
        idor: ex("Support ticket lookup", "A helpdesk API loads tickets for the current user.", "GET /tickets/T-100 as user Green", "GET /tickets/T-200 owned by user Blue", "handler fetches by global ID only", "another user's ticket would be visible", "query scopes ticket by current user and tenant", "generic not-found returned", "cross-owner object access"),
        "auth-attacks": ex("Login telemetry", "An identity service receives synthetic login attempts.", "normal login from known device", "many accounts use same training password marker", "only per-user failures are checked", "tenant-wide spray pattern is missed", "tenant-level threshold and MFA challenge activate", "spray sequence is throttled", "distributed failure pattern"),
        "session-attacks": ex("Session timeline", "A web app compares guest and signed-in sessions.", "guest id rotates at login", "same id appears before and after login", "session remains stable across privilege change", "known guest id would become authenticated", "login rotates and revokes the old id", "old id fails; new id is server-side only", "session id reuse"),
        clickjacking: ex("Payment confirmation UI", "A payment page requires a visible confirmation click.", "click lands on visible confirm button", "click coordinate passes through overlay layer", "page can be framed by an untrusted origin", "user sees decoy while hidden control receives click", "frame-ancestors policy blocks embedding", "sensitive click happens only on top page", "visual target mismatch"),
        "open-redirect": ex("Login return flow", "A login page sends users back after authentication.", "return_id=dashboard", "next=https://lookalike.example/path", "server redirects to raw caller-supplied destination", "trusted login route would hand off to another site", "server maps short return IDs only", "unknown destination shows warning page", "external redirect target"),
        "prototype-pollution": ex("Preference merge", "A dashboard merges user display preferences.", "theme=dark, density=compact", "path includes reserved-prototype-marker", "deep merge accepts every nested key", "shared object defaults could be altered", "reserved keys are blocked and Map stores labels", "preferences update without inherited changes", "reserved key path"),
        "file-upload": ex("Avatar upload", "A profile page accepts small image uploads.", "avatar.png with matching signature", "avatar.png.fake with mismatched bytes", "handler trusts filename and Content-Type", "unsafe file would enter public storage", "magic bytes, size and storage policy are checked", "file rejected before storage", "extension/content mismatch"),
        "supply-chain": ex("CI dependency install", "A build resolves dependencies for an internal package.", "install @team/widget from private registry", "public package has similar training name", "resolver checks public registry first", "build could pull the wrong source", "scoped registry and lockfile fail closed", "build stops until approved source is present", "registry/source mismatch"),
        "api-abuse": ex("Profile API update", "A user profile endpoint updates editable fields.", "PATCH /profile {displayName}", "PATCH includes role=admin marker", "handler binds the full body to domain state", "server-controlled field would be changed", "DTO allowlist accepts only editable fields", "extra fields are ignored and logged", "unexpected request field"),
        "jwt-oauth": ex("Toy token verifier", "Two demo APIs receive signed training tokens.", "aud=profile-api, iss=auth.example", "aud=billing-api sent to profile-api", "verifier parses token but skips audience policy", "token for one API would work at another", "issuer, audience and algorithm are pinned", "token rejected before authorization", "claim policy mismatch"),
        "dns-rebinding": ex("Browser resolver timeline", "A browser tab resolves a training host over time.", "portal.example -> public training address", "portal.example flips to private-like address", "client trusts the name after the first answer", "browser could bridge toward internal service", "resolver blocks private answers for untrusted names", "request is stopped at name policy", "DNS answer class change"),
        "prompt-injection": ex("RAG answer draft", "An assistant summarizes a retrieved support article.", "trusted instruction: summarize article", "retrieved text says ignore prior instruction", "tool output is treated as instructions", "model might follow untrusted document text", "retrieved text is quoted as content only", "answer summarizes and ignores embedded command", "instruction/data boundary")
      };
      const item = examples[attack.id] || ex(attack.name + " workflow", "A local training app receives a realistic request.", "normal request", toyInputFor(attack, method), "handler trusts input before policy", "risky behavior would be allowed", "policy checks before action", "safe result recorded", "policy signal");
      return {
        title: item.title + " - " + method.name,
        scenario: item.scenario,
        normal: item.normal,
        riskyInput: item.risky,
        safeInput: "validated " + item.normal,
        riskyRequest: item.title + " receives: " + item.risky,
        fixedRequest: item.title + " replayed with control enabled",
        vulnerableHandler: item.vulnerableHandler,
        fixedHandler: method.mitigation,
        vulnerable: item.vulnerable,
        fixed: item.fixed,
        vulnerableIdle: "waiting to compare vulnerable branch",
        fixedIdle: "waiting to apply control",
        outcome: item.outcome,
        signalLabel: item.signal
      };
    }

    function ex(title, scenario, normal, risky, vulnerableHandler, vulnerable, fixed, outcome, signal) {
      return { title, scenario, normal, risky, vulnerableHandler, vulnerable, fixed, outcome, signal };
    }

    function modeCopy() {
      if (labMode === "attack") {
        return {
          badge: "Attack mode: attacker lens, safe examples only",
          kicker: "attacker lens sandbox",
          workbenchTitle: "Attack path simulator",
          stages: ["Target", "Attempt", "Signal", "Blocked", "Lesson"],
          exampleLabel: "target scenario",
          vulnerableLabel: "attacker attempt",
          fixedLabel: "control response",
          observeLabel: "defender clue",
          infoOne: "Attacker goal",
          infoTwo: "Attempted move",
          infoThree: "Where it gets caught",
          infoOneText: (method) => "Find where the app treats untrusted input as trusted behavior. " + method.lens,
          infoTwoText: (method) => "Try to bend a toy workflow boundary, without real payloads: " + method.lab,
          infoThreeText: (method) => method.signal + " Control to study: " + method.mitigation,
          taskTitle: (method) => method.name + " attack-mode drill",
          stepStatus: ["targeting", "attempting", "signal exposed", "blocked", "lesson captured"],
          intakeHandler: "Attacker maps the toy feature boundary",
          intakeDecision: "Only a study target is selected; no real system is touched.",
          vulnerableHandler: (example) => "Unsafe assumption found: " + example.vulnerableHandler,
          vulnerableDecision: (example) => "Attack attempt would seek: " + example.vulnerable,
          detectHandler: "Blue-team telemetry starts correlating the attempt",
          detectDecision: "The attempt leaves a detectable clue.",
          controlDecision: (example) => "Control interrupts the attack path: " + example.fixed,
          fixedHandler: "The attack path is contained by policy and safe handling",
          fixedDecision: "Lesson complete: understand the path, then design the control.",
          baselinePrefix: "Target baseline: ",
          intakeLog: (example) => example.title + " selected as the safe training target"
        };
      }
      return {
        badge: "Defense mode: signals, controls and safe outcomes",
        kicker: "local sandbox",
        workbenchTitle: "Live simulation workbench",
        stages: ["Input intake", "Vulnerable path", "Detector", "Control", "Fixed outcome"],
        exampleLabel: "study example",
        vulnerableLabel: "vulnerable behavior",
        fixedLabel: "fixed behavior",
        observeLabel: "what to watch",
        infoOne: "How it works",
        infoTwo: "Signal",
        infoThree: "Mitigation",
        infoOneText: (method) => method.lens,
        infoTwoText: (method) => method.signal,
        infoThreeText: (method) => method.mitigation,
        taskTitle: (method) => method.name + " lab",
        stepStatus: ["receiving", "vulnerable branch", "detecting", "control applied", "contained"],
        intakeHandler: "Boundary check queued",
        intakeDecision: "The request is still only data.",
        vulnerableHandler: (example) => example.vulnerableHandler,
        vulnerableDecision: (example) => example.vulnerable,
        detectHandler: "Telemetry rule evaluates method-specific signal",
        detectDecision: "Suspicious pattern raised for review",
        controlDecision: (example) => example.fixed,
        fixedHandler: "Input stays data; authority stays server-side",
        fixedDecision: "Safe outcome recorded; no real target touched",
        baselinePrefix: "Baseline run: ",
        intakeLog: (example) => example.title + " received a safe training request"
      };
    }

    function resetSimulationUi(attack, method) {
      const example = exampleFor(attack, method);
      setText("#alSimStatus", "ready");
      const status = $("#alSimStatus", article);
      if (status) status.className = "al-sim-status idle";
      const sim = $("#alSim", article);
      if (sim) sim.className = "al-sim stage-intake";
      setText("#alRequestValue", "starting local sandbox");
      setText("#alInputValue", example.riskyInput);
      setText("#alHandlerValue", "not executed");
      setText("#alDecisionValue", "pending");
      setText("#alVulnerableValue", example.vulnerableIdle);
      setText("#alFixedValue", example.fixedIdle);
      setText("#alObservationValue", example.scenario);
      setMeter("#alRiskValue", 0);
      setMeter("#alLatencyValue", 0);
      setMeter("#alBlockedValue", 0);
      $$(".al-flow-node", article).forEach((node) => { node.className = "al-flow-node"; });
      const events = $("#alEventStream", article);
      if (events) events.innerHTML = "";
    }

    function applySimulationStep(step, isDone) {
      setText("#alSimStatus", isDone ? "contained" : step.status);
      const status = $("#alSimStatus", article);
      if (status) status.className = "al-sim-status " + (isDone ? "done" : "running");
      setText("#alRequestValue", step.request);
      setText("#alInputValue", step.input);
      setText("#alHandlerValue", step.handler);
      setText("#alDecisionValue", step.decision);
      setText("#alVulnerableValue", step.vulnerable);
      setText("#alFixedValue", step.fixed);
      setText("#alObservationValue", step.observation);
      setMeter("#alRiskValue", step.risk);
      setMeter("#alLatencyValue", step.latency);
      setMeter("#alBlockedValue", step.blocked);
      const sim = $("#alSim", article);
      if (sim) sim.className = "al-sim stage-" + step.stage + (isDone ? " done" : " running");
      updateFlow(step.stage, isDone);
      appendEvent(step.stage, step.event);
    }

    function updateFlow(stage, isDone) {
      const order = ["intake", "vulnerable", "detect", "control", "fixed"];
      const activeIndex = order.indexOf(stage);
      order.forEach((item, idx) => {
        const node = $("#alFlow-" + item, article);
        if (!node) return;
        node.className = "al-flow-node" + (idx < activeIndex || isDone ? " complete" : "") + (idx === activeIndex && !isDone ? " active" : "");
      });
    }

    function appendEvent(stage, text) {
      const events = $("#alEventStream", article);
      if (!events) return;
      events.appendChild(h("li", {}, h("strong", {}, stage + ": "), text));
      events.scrollTop = events.scrollHeight;
    }

    function setText(selector, text) {
      const node = $(selector, article);
      if (node) node.textContent = text;
    }

    function setMeter(selector, value) {
      const label = $(selector, article);
      if (!label) return;
      label.textContent = value + "%";
      const bar = label.closest(".al-sim-meter").querySelector(".al-sim-meter-bar");
      if (bar) bar.style.setProperty("--value", value + "%");
    }

    function clearSimulationTimers() {
      simulationTimers.forEach((timer) => clearTimeout(timer));
      simulationTimers = [];
      simulationSession = null;
    }

    function renderAll() {
      if (renderCards()) renderPanel();
      else {
        clearSimulationTimers();
        const panel = $("#alPanel", article);
        if (panel) {
          panel.innerHTML = "";
          panel.appendChild(h("div", { class: "al-empty" }, "Adjust the filters to select an attack family."));
        }
      }
    }

    renderAll();
    window.scrollTo(0, 0);
  }

  window.CitadelAttackLab = { attacks: ATTACKS, mount };
})();
