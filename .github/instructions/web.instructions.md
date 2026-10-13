---
applyTo: "web/**"
---
# Web UI guidance

- Render data with `textContent` and DOM APIs. Never use `innerHTML` with data.
- The UI explains server decisions; it does not decide readiness. Display blockers returned by the API.
- Invalidate any held preview after an estimate, selection, release or capacity change.
- Keep the Content Security Policy intact: no inline scripts or styles, no external origins.
- Preserve accessible labels, `aria-live` regions and keyboard focus behaviour.
