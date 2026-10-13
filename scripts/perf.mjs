// Deterministic performance budget for domain hot paths. Exits 1 when a p95 budget is exceeded.
import fs from 'node:fs';
import { queryFeatures, previewRelease } from '../src/domain.mjs';
const config=JSON.parse(fs.readFileSync(new URL('../perf-budget.json',import.meta.url),'utf8'));
const asJson=process.argv.includes('--json');
const products=['Test Operations','Yield Analytics','Customer Quality'];
const statuses=['ready','ready','ready','discovery','in-progress','done'];
let seedValue=20261009;
const rand=()=>(seedValue=(seedValue*1103515245+12345)%2147483648)/2147483648;
export function syntheticBacklog(size) {
  // Feature IDs are FEAT-001 to FEAT-999 by contract, so 999 is the largest valid fixture.
  if (!Number.isInteger(size) || size<1 || size>999) throw new Error('Backlog size must be 1 to 999.');
  const features=[];
  for (let i=1;i<=size;i++) {
    features.push({id:`FEAT-${String(i).padStart(3,'0')}`,title:`Synthetic wafer test item ${i}`,product:products[i%3],owner:`Engineer ${i%40}`,status:statuses[i%statuses.length],release:i%2?'R1':'R2',reach:1+Math.floor(rand()*500),impact:[0.5,1,2,3][i%4],confidence:Math.round((0.5+rand()*0.5)*100)/100,effort:Math.round((0.5+rand()*4)*100)/100,dependencies:i>1&&i%3===0?[`FEAT-${String(i-1).padStart(3,'0')}`]:[],version:1,notes:'Synthetic performance fixture.'});
  }
  return {revision:1,features,proposals:[]};
}
// Self-contained nearest-rank percentile so the gate works before the Lab 5 metrics seam exists.
const percentile=(sorted,p)=>sorted[Math.max(1,Math.ceil(p/100*sorted.length))-1];
function measure(fn) {
  for (let i=0;i<config.warmupRuns;i++) fn();
  const samples=[];
  for (let i=0;i<config.runs;i++) {const t=performance.now();fn();samples.push(performance.now()-t);}
  samples.sort((a,b)=>a-b);
  return {p50:percentile(samples,50),p95:percentile(samples,95),max:samples.at(-1)};
}
const state=syntheticBacklog(config.backlogSize);
const ready=state.features.filter(f=>f.status==='ready' && f.release==='R1' && !f.dependencies.length).slice(0,12).map(f=>f.id);
if (ready.length!==12) throw new Error('Fixture must provide 12 independent ready R1 features.');
const cases={
  'queryFeatures.priority':()=>queryFeatures(state.features,{q:'wafer'}),
  'previewRelease.12':()=>previewRelease(state,{release:'R1',capacity:100,featureIds:ready})
};
const results=Object.entries(cases).map(([name,fn])=>{const r=measure(fn);const budget=config.budgets[name].p95Ms;const p95=r.p95;return {name,p50Ms:+r.p50.toFixed(2),p95Ms:+p95.toFixed(2),maxMs:+r.max.toFixed(2),budgetMs:budget,pass:p95<=budget};});
const report={node:process.versions.node,backlogSize:config.backlogSize,runs:config.runs,measuredAt:new Date().toISOString(),results};
if (asJson) console.log(JSON.stringify(report,null,2));
else { console.log(`Performance budget, ${config.backlogSize} synthetic features, ${config.runs} runs, Node ${process.versions.node}`); for (const r of results) console.log(`${r.pass?'PASS':'FAIL'}  ${r.name.padEnd(24)} p50 ${r.p50Ms} ms  p95 ${r.p95Ms} ms  budget ${r.budgetMs} ms`); }
if (results.some(r=>!r.pass)) { if(!asJson) console.error('Budget exceeded. Investigate the regression before changing perf-budget.json.'); process.exitCode=1; }
