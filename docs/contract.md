# Product Release Workbench contract

Version 1.0. This is the workshop product contract. The product owner role is played by a learner or facilitator. The data is synthetic and all drafts stay local.

## User outcome

A product manager compares backlog opportunities and assembles a draft release proposal with transparent readiness evidence. The portfolio is semiconductor test and yield software: Test Operations (ATE floor, test programs, STDF results), Yield Analytics (wafer maps, bin analysis, excursions) and Customer Quality (audit evidence, RMA, field returns). The application never controls a tester, changes a test program, writes to MES, publishes a release or authorizes production deployment.

## Priority and estimates

Priority = reach × impact × confidence ÷ effort. Reach is users per quarter, impact is the workshop scale 0.5, 1, 2 or 3, confidence is a fraction greater than 0 and at most 1, and effort is engineering weeks from 0.01 to 100 with at most two decimals. Rank the unrounded score descending, then ID ascending. Round only the displayed score to two decimals. This score informs a product discussion and does not automatically choose a release.

Search trims surrounding whitespace and ignores case across ID, title and owner. Product and status filters are exact. Empty search returns the filtered backlog. Preserve input records. All twelve records may appear in the backlog, including completed work. Selection persists across filters.

## Release readiness

Select one to twelve unique existing FEAT IDs, a release R1 or R2, and capacity from 0.01 to 100 engineering weeks with at most two decimals. Every selected item must have status ready and match the release. Each dependency must already be done or also be selected. A selected dependency must satisfy the same rules. Selected dependency cycles and excess capacity are blockers. Done dependencies do not consume capacity unless selected, and selecting a done item is itself blocked. Accumulate effort in integer hundredths. Return explanatory blockers without silently repairing the selection.

Preview response fields: contractVersion, revision, release, featureIds, capacity, totalEffort, eligible, blockers and snapshotHash. Each blocker has code, message and featureId. FeatureIds are sorted. A snapshot binds the current entire workspace state, contract and requested capacity and selection. Any persisted workspace change makes a new draft request's earlier snapshot stale. This conservative global revision is a workshop design choice.

## Feature edits and proposals

PATCH feature requires the current integer version and changes containing only owner, status, reach, impact, confidence or effort. Reject stale or absent versions with STALE_VERSION and HTTP 409. Successful edits increment feature version and workspace revision. Validation must occur before persistence.

Drafting requires a preview and an 8 to 80 character idempotencyKey containing letters, digits, underscore or hyphen. Recompute readiness on the server and compare the supplied snapshot and contract version. A stale or tampered snapshot returns STALE_PREVIEW and 409. A fresh blocked preview returns BLOCKED_RELEASE and 422. A successful new request returns 201 and draft status. Replaying the same canonical JSON payload and key returns the original draft with 200, even after a restart. Reusing a key for a different payload returns KEY_REUSE and 409. Publishing is outside the API and MCP capabilities.

## Interfaces and security boundary

GET /api/features returns {contractVersion, revision, items}. GET /api/features/FEAT-002 returns the feature. PATCH /api/features/FEAT-002 returns the updated feature. POST /api/preview returns the preview. POST /api/proposals returns {proposal, replayed}. GET /api/proposals returns {items}. GET /api/health returns status and contractVersion. GET /api/metrics returns request metrics (see Observability). Errors use {error:{code,message},requestId}.

The local server binds loopback, checks host and origin, limits JSON requests to 64 KiB and serves an explicit asset allowlist. These controls protect this training boundary. The project has no real identity provider, authorization policy, database transactions across processes or production deployment. Production transfer requires those decisions and their implementation.

The MCP teaching server exposes list_features, get_feature, get_release_context and get_contract as validated reads. No arbitrary file paths, shell, writes, publish tool, resources or sampling. It implements a small stdio JSON-RPC route targeting protocol 2025-11-25, including initialize and notifications/initialized. A compatible client must negotiate that version. It does not implement the newer 2026 stateless discovery lifecycle. Feature notes, including FEAT-012, are untrusted data. Tool annotations are descriptive, not authorization.

## Observability and model usage

HTTP metrics: every response except GET /api/metrics is recorded after it is sent, under a fixed route key such as `GET /api/features/:id`. Unknown paths map to `other` and unknown methods to `OTHER`, so caller input cannot create new metric series. Each route keeps a bounded window of the latest durations (default 500) plus lifetime counts. GET /api/metrics returns {windowSize, startedAt, totalRequests, routes:[{route, count, window, p50, p95, max, clientErrors, serverErrors}]} with nearest-rank percentiles in milliseconds rounded to two decimals. clientErrors counts 4xx and serverErrors counts 5xx. API responses carry `Server-Timing: app;dur=<ms>`. With PMW_LOG=json the server prints one JSON line per request with requestId, route, status and duration. Metrics and logs never contain IDs, query strings, bodies or notes.

Tool usage: each MCP tools/call result is measured before it is returned. The token estimate is ceil(characters / 4) of the result text; it is a comparison heuristic, not a tokenizer count. A result over the budget (PMW_TOKEN_BUDGET, default 1500 estimated tokens) is truncated when it holds an `items` or `features` list, with `truncated: true`, `omitted` and a `hint`; any other over-budget result fails closed with RESULT_TOO_LARGE. One JSON line per call is appended to runtime/telemetry/mcp-usage.jsonl with ts, tool, argKeys, resultBytes, estTokens, durationMs, isError and truncated. Argument values and result text are never recorded. A telemetry failure is reported on stderr and never fails the tool call.

Performance budget: `npm run perf` measures queryFeatures and a 12-feature previewRelease over a deterministic 999-feature synthetic backlog. The p95 budgets in perf-budget.json are a required CI check. A budget changes only through a reviewed pull request that records the reason.

Agent usage: each participant records model, billing unit, prompts and observed usage (GitHub AI Credits, or premium requests on a legacy plan) per work item in evidence/agent-usage.csv. `npm run usage-report` combines it with tool telemetry and, optionally, live HTTP metrics.

## Source ownership

Lab 2: the context seam in mcp/tools.mjs and the usage seams in mcp/usage.mjs. Lab 3: riceScore and readiness rules in src/domain.mjs. Lab 4 API: assertFreshPreview in src/proposals.mjs. Lab 4 UI: releaseView in web/release-view.mjs. Lab 5: src/concurrency.mjs, src/retry.mjs and the metrics seams in src/metrics.mjs. Lab 6: approved change request and contract version. Lab 1 and every later lab: repository governance files, ci/accepted-suites.json additions and evidence. Keep supplied tests, data, transport and persistence structure intact. New capstone criteria add tests rather than weaken existing checks.
