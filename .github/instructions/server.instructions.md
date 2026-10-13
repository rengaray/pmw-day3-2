---
applyTo: "src/**,mcp/**,scripts/**"
---
# Server, domain and MCP guidance

- Validate input before any persistence. Errors are `DomainError(code, message, status)` and reach clients as `{error:{code,message},requestId}`.
- Preserve the loopback host check, origin check, 64 KiB body limit, static allowlist and security headers in `src/server.mjs`.
- `mcp/server.mjs` writes protocol messages only to stdout. Diagnostics go to stderr. Telemetry failures must never fail a tool call.
- MCP tools are business reads with JSON Schema and runtime validation. No file paths, shell, writes or publish capability.
- Telemetry records sizes, durations, route keys and outcomes. Never log argument values, feature notes, request bodies or query strings.
- Restart the HTTP and MCP processes after changing modules; Node caches imports.
