Select pm-tool-engineer. Attach docs/contract.md (Interfaces and Observability sections), mcp/tools.mjs, mcp/usage.mjs, tests/lab02.test.mjs and tests/usage.test.mjs.

Part A. Implement only the LAB02_CONTEXT seam in mcp/tools.mjs. get_release_context must validate R1 or R2 and return only that release's records with contractVersion, current revision, source and advisory:true. Preserve unknown-tool rejection and no write capability.

Part B. Implement only the three LAB02 seams in mcp/usage.mjs: estimateTokens as ceil(characters / 4); budgetResult that returns values within budget unchanged, truncates an over-budget items or features list with truncated, omitted and hint, and fails closed with RESULT_TOO_LARGE otherwise; usageRecord with ts, tool, sorted argKeys, resultBytes, estTokens, durationMs to two decimals, isError and truncated. Never record argument values or result text.

Run npm run lab:02. Do not change transport, tests or data. Report the diff, actual check output and the remaining live-client checks.
