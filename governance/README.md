# Repository governance kit (solo edition)

Applied in Lab 1. You own this repository alone and play builder, evidence checker and reviewer yourself. GitHub does not let the author of a pull request approve it, so a required human approval would block you forever. This kit replaces the second person with four things: a platform that refuses unsafe merges, an automated guard that checks what a reviewer would check mechanically, three role passes you sign off in every pull request, and a written record of every deliberate exception.

| File | Becomes | Enforces |
| --- | --- | --- |
| protect-main.ruleset.json | Branch ruleset on the default branch | Pull request required (zero approvals), review conversations resolved, required `accepted-checks`, `performance-budget` and `governance-guard` on an up-to-date branch, linear history, no force push or deletion, no bypass actors |
| agent-policy.json | Read by the guard from the base branch | The tools each agent role may load, and the workers the coordinator may call |
| ../scripts/guard.mjs | `governance-guard` job | Role passes signed off; accepted suites never removed; existing tests, performance budgets, the MCP result budget and gate files changed only with a written reason; agent profiles inside policy and naming a model |
| ../ci/guard.test.mjs | Run before the guard | The guard's own behaviour (G01-G09) |
| ../.github/workflows/ci.yml | Active on first push | The three required checks on every pull request |
| ../.github/pull_request_template.md | Active on first push | Evidence, usage, the three role passes and the reason lines |
| ../.github/dependabot.yml | Active on first push | Weekly update pull requests for workflow actions |
| ../ci/accepted-suites.json | Read by CI | Acceptance suites that must stay green; grows with each lab |
| CODEOWNERS.template | Not used in the solo edition | Kept for team transfer: with two or more people, add it and turn on code-owner review |

Apply the ruleset with the GitHub CLI from the repository root:

```bash
gh api repos/{owner}/{repo}/rulesets --method POST --input governance/protect-main.ruleset.json
```

Rulesets work on public repositories on every plan, and on private repositories with GitHub Pro, Team or Enterprise Cloud. Use the repository location your facilitator specifies. If the API call is refused, create the same rules under Settings > Rules > Rulesets and record the route in evidence/readiness.md.

Run the guard locally before you push:

```bash
npm run guard:test
npm run guard -- --base origin/main --body-file ../pr-body.md
```

What the kit cannot do: as the repository administrator you can still edit or disable the ruleset, and a pull request that edits `.github/workflows/ci.yml` changes the workflow that checks it (the guard script itself always runs from the base branch). Ruleset history exists on GitHub Enterprise Cloud; on Team the organisation audit log records ruleset changes; on a personal repository your facilitator compares the ruleset at the start and end of the day. Read every gate-file diff line by line in your Review pass. Treat a ruleset change exactly like a budget change: a separate, explained decision.
