// Runs only the suites you have accepted so far. Each lab pull request appends its suites.
// Removing a suite or the baseline is a governance violation that CI rejects.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const list=JSON.parse(fs.readFileSync('ci/accepted-suites.json','utf8'));
if (!Array.isArray(list.suites) || !list.suites.includes('tests/baseline.test.mjs')) { console.error('ci/accepted-suites.json must keep tests/baseline.test.mjs.'); process.exit(1); }
for (const suite of list.suites) if (!/^tests\/[a-z0-9-]+\.test\.mjs$/.test(suite) || !fs.existsSync(suite)) { console.error(`Unknown accepted suite: ${suite}`); process.exit(1); }
console.log(`Accepted suites: ${list.suites.join(', ')}`);
const run=spawnSync(process.execPath,['--test',...list.suites],{stdio:'inherit'});
process.exit(run.status ?? 1);
