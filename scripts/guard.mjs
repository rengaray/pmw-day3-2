// Governance guard for a one-person repository. Nobody else approves your pull requests, so this
// check is the second pair of eyes: it blocks what can be checked mechanically and makes every
// deliberate weakening visible as a written reason in the pull request description.
// CI: node scripts/guard.mjs  (BASE_SHA and PR_BODY come from the workflow environment)
// Local preflight (checks committed work only): npm run guard -- --base origin/main --body-file ../pr-body.md
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const ROLE_PASSES = ['Build pass', 'Evidence pass', 'Review pass'];
const POLICY_PATHS = [/^governance\/agent-policy\.json$/, /^governance\/protect-main\.ruleset\.json$/, /^scripts\/guard\.mjs$/, /^\.github\/workflows\//];
const AGENT_PATH = /^\.github\/agents\/[^/]+\.agent\.md$/;

export function reason(body, label) {
  // A reason is a line "Label: text" with at least 10 characters of real text, not a template placeholder.
  const m = (body || '').match(new RegExp(`^[ \\t>*-]*${label}:[ \\t]*(.+)$`, 'mi'));
  const text = m ? m[1].trim() : '';
  return text.length >= 10 && !/[<>]/.test(text) && !/^(n\/?a|none|tbd)\b/i.test(text) ? text : null;
}

export function parseProfile(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text || '');
  if (!m) return { error: 'missing YAML frontmatter' };
  const field = key => { const f = new RegExp(`^${key}:[ \\t]*(.*)$`, 'm').exec(m[1]); return f ? f[1].trim() : undefined; };
  const list = key => { const v = field(key); if (v === undefined) return undefined; try { const a = JSON.parse(v); return Array.isArray(a) && a.every(x => typeof x === 'string') ? a : null; } catch { return null; } };
  return { name: field('name'), model: field('model'), tools: list('tools'), agents: list('agents') };
}

const allowed = (tool, patterns) => patterns.some(p => p.endsWith('/*') ? tool.startsWith(p.slice(0, -1)) : tool === p);

export function evaluate({ changed = [], base = {}, head = {}, body = '', policy }) {
  const findings = [];
  const fail = (code, path, message) => findings.push({ code, path, message });

  // 1. One person plays three roles; each pass is signed off in the pull request.
  for (const pass of ROLE_PASSES)
    if (!new RegExp(`^[ \\t]*[-*][ \\t]*\\[[xX]\\][ \\t]*${pass}\\b`, 'm').test(body))
      fail('ROLE_SIGNOFF', '(pull request)', `Tick "${pass}" in the pull request description after you have done it.`);

  const paths = new Set(changed.map(c => c.path));

  // 2. The accepted-suite list only ever grows.
  if (paths.has('ci/accepted-suites.json')) {
    let before = [], after = [];
    try { before = JSON.parse(base['ci/accepted-suites.json'] ?? '{"suites":[]}').suites ?? []; } catch {}
    try { after = JSON.parse(head['ci/accepted-suites.json'] ?? '{"suites":[]}').suites ?? []; } catch { fail('SUITES_INVALID', 'ci/accepted-suites.json', 'The file is not valid JSON.'); }
    for (const s of before) if (!after.includes(s)) fail('SUITE_REMOVED', 'ci/accepted-suites.json', `${s} was removed. Accepted suites are never removed; fix the failing code instead.`);
  }

  // 3. Supplied tests are the contract. Adding a test file is fine; changing or deleting one needs a reason.
  const touchedTests = changed.filter(c => c.path.startsWith('tests/') && c.status !== 'A').map(c => c.path);
  if (touchedTests.length && !reason(body, 'Test change reason'))
    for (const p of touchedTests) fail('TEST_CHANGED', p, 'An existing test was changed or deleted. Add "Test change reason: ..." to the description, or revert it.');

  // 4. A performance budget may only be loosened with a written reason.
  if (paths.has('perf-budget.json')) {
    let b = {}, h = {};
    try { b = JSON.parse(base['perf-budget.json'] ?? '{}'); h = JSON.parse(head['perf-budget.json'] ?? '{}'); } catch { fail('BUDGET_INVALID', 'perf-budget.json', 'The file is not valid JSON.'); }
    const loosened = [];
    for (const [k, v] of Object.entries(b.budgets ?? {})) {
      const after = h.budgets?.[k]?.p95Ms;
      if (after === undefined) loosened.push(`${k} removed`);
      else if (after > v.p95Ms) loosened.push(`${k} p95 ${v.p95Ms} -> ${after} ms`);
    }
    for (const k of ['backlogSize', 'runs', 'warmupRuns']) if (typeof b[k] === 'number' && !(h[k] >= b[k])) loosened.push(`${k} ${b[k]} -> ${h[k]}`);
    if (loosened.length && !reason(body, 'Budget change reason'))
      fail('BUDGET_LOOSENED', 'perf-budget.json', `${loosened.join('; ')}. Add "Budget change reason: ..." with the measurement that justifies it, or revert.`);
  }

  // 5. The MCP result budget stays at the workshop default unless a reason is recorded.
  if (paths.has('.vscode/mcp.json')) {
    let budget;
    try { budget = JSON.parse(head['.vscode/mcp.json']).servers?.productWorkbench?.env?.PMW_TOKEN_BUDGET; } catch { fail('MCP_CONFIG_INVALID', '.vscode/mcp.json', 'The file is not valid JSON.'); }
    if (budget !== undefined && budget !== '1500' && !reason(body, 'Budget change reason'))
      fail('TOKEN_BUDGET_CHANGED', '.vscode/mcp.json', `PMW_TOKEN_BUDGET is ${budget}. Restore 1500 or add "Budget change reason: ...".`);
  }

  // 6. Agent profiles stay inside the role policy and name a model.
  for (const c of changed.filter(c => AGENT_PATH.test(c.path) && c.status !== 'D')) {
    const p = parseProfile(head[c.path]);
    if (p.error) { fail('PROFILE_INVALID', c.path, p.error); continue; }
    const rule = policy?.profiles?.[p.name];
    if (!rule) { fail('PROFILE_UNKNOWN', c.path, `No policy for "${p.name}". Add it to governance/agent-policy.json in its own reviewed change.`); continue; }
    if (p.tools === undefined) fail('TOOLS_MISSING', c.path, 'No tools list. An omitted list can grant every tool; list tools explicitly.');
    else if (p.tools === null) fail('TOOLS_INVALID', c.path, 'tools must be a JSON-style list of strings, for example ["read", "search"].');
    else for (const t of p.tools.filter(t => !allowed(t, rule.tools))) fail('TOOL_NOT_ALLOWED', c.path, `${p.name} may not load "${t}". Allowed: ${rule.tools.join(', ')}.`);
    for (const a of (p.agents ?? []).filter(a => !(rule.agents ?? []).includes(a))) fail('WORKER_NOT_ALLOWED', c.path, `${p.name} may not delegate to "${a}".`);
    if (!p.model || /[<>]/.test(p.model)) fail('MODEL_MISSING', c.path, 'Add a model: line naming the model exactly as your picker shows it.');
  }

  // 7. Changing the gates themselves needs a written reason.
  const gateFiles = [...paths].filter(p => POLICY_PATHS.some(r => r.test(p)));
  if (gateFiles.length && !reason(body, 'Policy change reason'))
    for (const p of gateFiles) fail('GATE_CHANGED', p, 'This file defines a gate. Add "Policy change reason: ..." to the description, or revert it.');

  return findings;
}

function git(args) { return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
function at(ref, path) { try { return git(['show', `${ref}:${path}`]); } catch { return undefined; } }

function main() {
  const argv = process.argv.slice(2);
  const arg = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const baseRef = process.env.BASE_SHA || arg('--base') || 'origin/main';
  const bodyFile = arg('--body-file');
  const body = process.env.PR_BODY ?? (bodyFile ? fs.readFileSync(bodyFile, 'utf8') : '');
  const baseSha = git(['merge-base', baseRef, 'HEAD']).trim();
  const changed = git(['diff', '--name-status', '--no-renames', baseSha, 'HEAD']).trim().split('\n').filter(Boolean)
    .map(line => { const [status, path] = line.split('\t'); return { status: status[0], path }; });
  const base = {}, head = {};
  for (const { path } of changed) {
    base[path] = at(baseSha, path);
    head[path] = at('HEAD', path); // the committed candidate, never uncommitted edits
  }
  const policy = JSON.parse(at(baseSha, 'governance/agent-policy.json') ?? fs.readFileSync('governance/agent-policy.json', 'utf8'));
  const findings = evaluate({ changed, base, head, body, policy });
  const lines = findings.length
    ? ['| Code | Path | What to do |', '| --- | --- | --- |', ...findings.map(f => `| ${f.code} | ${f.path} | ${f.message.replace(/\|/g, '/')} |`)]
    : [`Governance guard passed: ${changed.length} changed files checked against ${baseSha.slice(0, 7)}.`];
  console.log(lines.join('\n'));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Governance guard\n\n${lines.join('\n')}\n`);
  process.exitCode = findings.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
