// Self-tests for the governance guard. Run with npm run guard:test; CI runs them before the guard.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { evaluate, reason, parseProfile } from '../scripts/guard.mjs';

const policy = JSON.parse(fs.readFileSync(new URL('../governance/agent-policy.json', import.meta.url), 'utf8'));
const signed = '- [x] Build pass\n- [x] Evidence pass\n- [x] Review pass\n';
const codes = r => r.map(f => f.code).sort();
const profile = (name, tools, extra = '') => `---\nname: ${name}\ndescription: test\ntools: ${JSON.stringify(tools)}\n${extra}---\nBody`;

test('G01 Unsigned role passes are reported, signed ones pass', () => {
  assert.deepEqual(codes(evaluate({ body: '- [ ] Build pass\n- [x] Evidence pass', policy })), ['ROLE_SIGNOFF', 'ROLE_SIGNOFF']);
  assert.deepEqual(evaluate({ body: signed, policy }), []);
});

test('G02 Removing an accepted suite always fails; adding one passes', () => {
  const base = { 'ci/accepted-suites.json': '{"suites":["tests/baseline.test.mjs","tests/lab02.test.mjs"]}' };
  const changed = [{ status: 'M', path: 'ci/accepted-suites.json' }];
  const removed = evaluate({ changed, base, head: { 'ci/accepted-suites.json': '{"suites":["tests/baseline.test.mjs"]}' }, body: signed + 'Test change reason: flaky gates in CI today', policy });
  assert.deepEqual(codes(removed), ['SUITE_REMOVED']);
  const added = evaluate({ changed, base, head: { 'ci/accepted-suites.json': '{"suites":["tests/baseline.test.mjs","tests/lab02.test.mjs","tests/lab03.test.mjs"]}' }, body: signed, policy });
  assert.deepEqual(added, []);
});

test('G03 Changing an existing test needs a reason; adding a test does not', () => {
  assert.deepEqual(codes(evaluate({ changed: [{ status: 'M', path: 'tests/lab03.test.mjs' }], body: signed, policy })), ['TEST_CHANGED']);
  assert.deepEqual(evaluate({ changed: [{ status: 'M', path: 'tests/lab03.test.mjs' }], body: signed + 'Test change reason: fixture date moved to a fixed value', policy }), []);
  assert.deepEqual(evaluate({ changed: [{ status: 'A', path: 'tests/capstone.test.mjs' }], body: signed, policy }), []);
});

test('G04 Loosening a performance budget needs a measured reason', () => {
  const base = { 'perf-budget.json': JSON.stringify({ backlogSize: 999, runs: 40, warmupRuns: 5, budgets: { 'previewRelease.12': { p95Ms: 15 } } }) };
  const head = { 'perf-budget.json': JSON.stringify({ backlogSize: 999, runs: 40, warmupRuns: 5, budgets: { 'previewRelease.12': { p95Ms: 60 } } }) };
  const changed = [{ status: 'M', path: 'perf-budget.json' }];
  assert.deepEqual(codes(evaluate({ changed, base, head, body: signed, policy })), ['BUDGET_LOOSENED']);
  assert.deepEqual(codes(evaluate({ changed, base, head, body: signed + 'Budget change reason: <why>', policy })), ['BUDGET_LOOSENED']);
  assert.deepEqual(evaluate({ changed, base, head, body: signed + 'Budget change reason: runner p95 measured at 41 ms over 20 runs', policy }), []);
  const tighter = { 'perf-budget.json': base['perf-budget.json'].replace('15', '10') };
  assert.deepEqual(evaluate({ changed, base, head: tighter, body: signed, policy }), []);
});

test('G05 The MCP result budget must stay 1500 unless a reason is given', () => {
  const head = v => ({ '.vscode/mcp.json': JSON.stringify({ servers: { productWorkbench: { env: { PMW_TOKEN_BUDGET: v } } } }) });
  const changed = [{ status: 'M', path: '.vscode/mcp.json' }];
  assert.deepEqual(codes(evaluate({ changed, head: head('300'), body: signed, policy })), ['TOKEN_BUDGET_CHANGED']);
  assert.deepEqual(evaluate({ changed, head: head('1500'), body: signed, policy }), []);
});

test('G06 Agent profiles stay inside the role policy and name a model', () => {
  const path = '.github/agents/pm-reviewer.agent.md';
  const changed = [{ status: 'A', path }];
  const run = text => codes(evaluate({ changed, head: { [path]: text }, body: signed, policy }));
  assert.deepEqual(run(profile('pm-reviewer', ['read', 'search'], 'model: Example Model (copilot)\n')), []);
  assert.deepEqual(run(profile('pm-reviewer', ['read', 'search', 'execute'], 'model: Example Model (copilot)\n')), ['TOOL_NOT_ALLOWED']);
  assert.deepEqual(run(profile('pm-reviewer', ['read', 'search'])), ['MODEL_MISSING']);
  assert.deepEqual(run(profile('pm-reviewer', ['read'], 'model: <picker name>\n')), ['MODEL_MISSING']);
  assert.deepEqual(run('---\nname: pm-reviewer\nmodel: Example\n---\n'), ['TOOLS_MISSING']);
  assert.deepEqual(run(profile('pm-helper', ['read'], 'model: Example\n')), ['PROFILE_UNKNOWN']);
});

test('G07 Planner may use its MCP server; coordinator may delegate only to two workers', () => {
  const p = '.github/agents/pm-planner.agent.md', c = '.github/agents/pm-coordinator.agent.md';
  const head = {
    [p]: profile('pm-planner', ['read', 'search', 'productWorkbench/get_release_context', 'productWorkbench/get_contract'], 'model: Example\n'),
    [c]: profile('pm-coordinator', ['read', 'search', 'agent'], 'model: Example\nagents: ["pm-planner", "pm-implementer"]\n')
  };
  const r = evaluate({ changed: [{ status: 'A', path: p }, { status: 'A', path: c }], head, body: signed, policy });
  assert.deepEqual(r.map(f => `${f.code} ${f.path}`), [`WORKER_NOT_ALLOWED ${c}`]);
});

test('G08 Changing a gate definition needs a policy reason', () => {
  const changed = [{ status: 'M', path: '.github/workflows/ci.yml' }, { status: 'M', path: 'governance/agent-policy.json' }];
  assert.deepEqual(codes(evaluate({ changed, body: signed, policy })), ['GATE_CHANGED', 'GATE_CHANGED']);
  assert.deepEqual(evaluate({ changed, body: signed + 'Policy change reason: pin checkout action to a commit SHA', policy }), []);
});

test('G09 Reasons must be real text and profiles must parse', () => {
  assert.equal(reason('Budget change reason: n/a for now', 'Budget change reason'), null);
  assert.equal(reason('Budget change reason: short', 'Budget change reason'), null);
  assert.equal(reason('> Budget change reason: measured 41 ms on runner', 'Budget change reason'), 'measured 41 ms on runner');
  assert.equal(parseProfile('no frontmatter').error, 'missing YAML frontmatter');
  assert.equal(parseProfile('---\nname: x\ntools: [read]\n---').tools, null);
});
