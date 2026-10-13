Select pm-implementer after the human has approved a recovery and observability plan.

Part A. Implement only src/concurrency.mjs and src/retry.mjs. A stale or absent feature version must return STALE_VERSION before persistence. The retry helper is for safe reads only: at most three attempts by default, retry only TRANSIENT, delay 50 then 100 ms, stop when exhausted or aborted, pass the signal to the operation. Do not retry writes.

Part B. Implement only the LAB05 seams in src/metrics.mjs: nearest-rank percentile returning null for an empty array, and record() that counts every request, keeps at most windowSize durations per route (oldest dropped first), and counts 4xx as clientErrors and 5xx as serverErrors. Do not change routeKey, the server wiring or the snapshot shape.

Run npm run lab:05, npm run perf and the full suite. Report the observed failure, the correction and actual output. After two failed repair cycles stop with the smallest failing case.
