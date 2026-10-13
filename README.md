# Product Release Workbench

Edition 5.0, solo delivery: you own this repository and play builder, evidence checker and reviewer. A semiconductor test and yield product-management Web UI used to practise building, governing and observing custom development agents with GitHub Copilot.

Requires Node 24.x, Git, VS Code with GitHub Copilot, and the GitHub CLI (or browser access to GitHub). No npm dependencies or installation. Open this project root, then run:

```bash
npm run preflight
npm run baseline
npm start
```

Browse http://127.0.0.1:4173.

The starter deliberately contains twelve unfinished seams across eight files. On the untouched starter `npm test` reports 27 passing and 30 failing checks; the failures are the lab acceptance criteria. Focused commands are `npm run lab:02`, `lab:03`, `lab:04` and `lab:05`. `npm run ci:accepted` runs the suites listed in `ci/accepted-suites.json`, which is what CI enforces. `npm run perf` runs the performance budget. `npm run usage-report` builds `evidence/usage-report.md` from your recorded agent usage and MCP tool telemetry.

`governance/` holds the branch ruleset applied in Lab 1 and the agent policy read by the governance guard (`scripts/guard.mjs`, required check `governance-guard`). `npm run guard:test` runs the guard self-tests; `npm run guard -- --base origin/main --body-file ../pr-body.md` checks your committed branch before you open the pull request. `agent_templates/` holds the five agent profiles copied into `.github/agents` in Lab 1. `docs/contract.md` is the product and engineering contract.

Data changes persist in `runtime/state.json`; MCP usage telemetry is written to `runtime/telemetry/`. Both are ignored by Git. Stop the app before `npm run reset-data -- --confirm`. Worktrees do not share runtime state.

No real authentication, cross-process transactions or deployment are included. Draft proposals never publish software, change a test program or touch MES.
