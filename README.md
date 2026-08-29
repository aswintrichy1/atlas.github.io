# The Atlas Collection

Seven interactive, **fully-offline** learning atlases behind a single hub. Read a concept, then *poke* it — every idea has an interactive lab, quiz, or visualization. Progress is saved locally in your browser; nothing is ever sent to a server.

| Atlas | Topic | Highlights |
| --- | --- | --- |
| **Blueprint** | System & software design | HLD · technology deep dives · design patterns · 31 problem breakdowns · production case studies · LLD & concurrency |
| **Codex** | Coding interviews | Data structures · algorithms · problem-solving patterns · weighted graphs & DP shapes · delivery craft · AI-enabled coding |
| **Synapse** | ML system design | Framing objectives · features & embeddings · evaluation & A/B testing · serving · 7 graded breakdowns |
| **Compass** | Behavioral & offers | Signal decoding · story-bank engineering · company & level playbooks · salary negotiation |
| **Citadel** | Cybersecurity | 8 tracks · crypto · AppSec · defense · threats & forensics · reverse engineering |
| **Cascade** | Data engineering | Storage · modeling · batch · streaming · orchestration · SQL · Spark |
| **TechLead** | Techno managerial interviews | Architecture drivers · stakeholder & cost trade-offs · decision records · rollout & incident leadership · LLD credibility · data trust |

Each atlas includes exam mode, flashcards, interactive widgets, light/dark themes, keyboard shortcuts, a command palette, progress export/import, and installable-PWA support — all with **zero external requests**.

## Run locally

A service worker (offline support) needs `http://`, so serve the folder rather than opening the file directly:

```bash
cd atlas
python3 -m http.server 8800
```

Then open <http://localhost:8800/>. (Opening `index.html` via `file://` still works, just without offline caching.)

## QA

All seven apps are covered by the four gates in `tools/`. Run them together:

```bash
tools/verify_all.sh                             # everything
tools/verify_all.sh --app=techno-managerial-academy   # scope to one app
```

The gates are the content contract (`validate_content.mjs`), static guardrails (`lint_static.mjs`), link and route integrity (`check_links.mjs`), and an end-to-end crawl in headless Chrome (`crawl_e2e.mjs`) that visits every route, plays every quiz, drives every widget, and fails on any console output.

## Deploy to GitHub Pages

This folder is self-contained and Pages-ready — real files (no symlinks), a `.nojekyll` marker, and only relative paths, so it works whether the repo is served from a subpath (`https://USER.github.io/REPO/`) or a user site (`https://USER.github.io/`).

1. Create a new GitHub repository and push this folder as the repo root:
   ```bash
   git remote add origin https://github.com/USER/REPO.git
   git branch -M main
   git push -u origin main
   ```
2. In the repo: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, then choose **`main`** and **`/ (root)`**, and save.
3. Wait for the Pages build, then visit the URL shown there. The hub loads, and each card opens its atlas.

No build step runs on GitHub — the deployable copies are already in the app folders (`hld-lld-academy/`, `dsa-patterns-academy/`, `ml-ai-academy/`, `behavioral-academy/`, `cyber-academy/`, `data-eng-academy/`, `techno-managerial-academy/`).

## Structure

```
atlas/
├── index.html              hub launcher (theme toggle + PWA + combined progress)
├── manifest.webmanifest    hub PWA manifest
├── icon.svg                hub icon
├── sw.js                   hub service worker (caches only the hub's own files)
├── assemble.sh             local-only: rebuild the app copies from sibling sources
├── docs/ENGINE_SPEC.md     content authoring contract (data shapes, voice, gates)
├── tools/                  validator, static linter, service-worker generator
├── hld-lld-academy/        Blueprint (real files)
├── dsa-patterns-academy/   Codex (real files)
├── ml-ai-academy/          Synapse (real files)
├── behavioral-academy/     Compass (real files)
├── cyber-academy/          Citadel (real files)
├── data-eng-academy/       Cascade (real files)
└── techno-managerial-academy/
                            TechLead (real files)
```

## Updating an app

The seven app folders are **built copies**. To change an app, edit its source elsewhere and re-run `./assemble.sh` (it rebuilds each app via its own `build.sh`, strips dev artifacts and symlinks, and refreshes the copies here), then commit. `assemble.sh` only works on the machine that has the source apps; it is not needed to deploy.

## License

Released under the MIT License — see [LICENSE](LICENSE).
