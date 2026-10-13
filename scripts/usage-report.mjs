// Builds evidence/usage-report.md from recorded agent usage, MCP tool telemetry and optional live HTTP metrics.
import fs from 'node:fs';
import path from 'node:path';
const csvFile='evidence/agent-usage.csv';
const mcpFile=path.join(process.env.PMW_TELEMETRY_DIR || 'runtime/telemetry','mcp-usage.jsonl');
const metricsUrl=process.argv.includes('--metrics')?(process.env.PMW_URL || 'http://127.0.0.1:4173')+'/api/metrics':null;
function parseCsv(text) {
  const rows=[];let row=[],cell='',quoted=false;
  for (let i=0;i<text.length;i++) {const c=text[i];
    if (quoted) { if (c==='"' && text[i+1]==='"') {cell+='"';i++;} else if (c==='"') quoted=false; else cell+=c; }
    else if (c==='"') quoted=true; else if (c===',') {row.push(cell);cell='';} else if (c==='\n' || c==='\r') { if (c==='\r' && text[i+1]==='\n') i++; row.push(cell);cell='';if(row.some(Boolean))rows.push(row);row=[]; } else cell+=c; }
  row.push(cell); if (row.some(Boolean)) rows.push(row);
  const [head,...body]=rows; return body.map(r=>Object.fromEntries(head.map((h,i)=>[h.trim(),(r[i]??'').trim()])));
}
const num=v=>{const n=Number(v);return v!=='' && Number.isFinite(n)?n:null;};
const sum=(xs)=>xs.reduce((a,b)=>a+b,0);
const lines=['# Usage and performance report','',`Generated ${new Date().toISOString()} from ${csvFile}, ${mcpFile}${metricsUrl?' and '+metricsUrl:''}.`,'','Observed usage is what you read from your Copilot usage view before and after a work item, in GitHub AI Credits (current billing) or premium requests (legacy annual plans). It is not estimated: an empty value stays "not observed". AI Credits are computed from input, output and cached tokens at the model\'s price, so the context you send (instructions, attachments and tool results such as the MCP estimates below) is the part you control. MCP token figures use the ceil(characters / 4) heuristic and are estimates, not tokenizer counts.',''];
const agent=fs.existsSync(csvFile)?parseCsv(fs.readFileSync(csvFile,'utf8')):[];
lines.push('## Agent work items','');
if (!agent.length) lines.push('No rows recorded in evidence/agent-usage.csv.','');
else {
  lines.push('| Lab | Pass | Agent | Model | Prompts | Observed usage | Peak context % | Accepted | Rework cycles |','| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  let accepted=0,prompts=0,rework=0;const byUnit=new Map(),byModel=new Map();
  for (const r of agent) {
    const p=num(r.prompts),observed=num(r.observed_usage),unit=r.billing || 'unspecified';
    if (/^y/i.test(r.accepted)) accepted++;
    prompts+=p||0;rework+=num(r.rework_cycles)||0;
    if (observed!==null) byUnit.set(unit,(byUnit.get(unit)||0)+observed);
    const m=byModel.get(r.model) || {prompts:0,observed:0,seen:0,unit};m.prompts+=p||0;if(observed!==null){m.observed+=observed;m.seen++;}byModel.set(r.model,m);
    lines.push(`| ${r.lab} | ${r.role_pass || 'n/a'} | ${r.agent} | ${r.model} | ${r.prompts} | ${observed===null?'not observed':observed+' '+unit} | ${r.context_peak_pct || 'n/a'} | ${r.accepted} | ${r.rework_cycles} |`);
  }
  lines.push('',`Accepted work items: ${accepted}. Prompts per accepted work item: ${accepted?(prompts/accepted).toFixed(2):'n/a'}. Rework cycles: ${rework}.`);
  if (!byUnit.size) lines.push('No observed usage recorded; compare prompts, rework and context instead.');
  for (const [unit,total] of byUnit) lines.push(`Observed ${unit}: ${total}. Per accepted work item: ${accepted?(total/accepted).toFixed(2):'n/a'}.`);
  lines.push('','| Model | Prompts | Observed usage |','| --- | --- | --- |',...[...byModel].map(([m,v])=>`| ${m} | ${v.prompts} | ${v.seen?v.observed+' '+v.unit:'not observed'} |`),'');
}
lines.push('## MCP tool results entering model context','');
const calls=fs.existsSync(mcpFile)?fs.readFileSync(mcpFile,'utf8').trim().split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l);}catch{return null;}}).filter(Boolean):[];
if (!calls.length) lines.push(`No tool calls recorded in ${mcpFile}.`,'');
else {
  const byTool=new Map();
  for (const c of calls) {const t=byTool.get(c.tool) || {calls:0,tokens:0,maxTokens:0,errors:0,truncated:0,ms:[]};t.calls++;t.tokens+=c.estTokens||0;t.maxTokens=Math.max(t.maxTokens,c.estTokens||0);t.errors+=c.isError?1:0;t.truncated+=c.truncated?1:0;t.ms.push(c.durationMs||0);byTool.set(c.tool,t);}
  lines.push('| Tool | Calls | Est. tokens total | Est. tokens max | Errors | Truncated | Mean ms |','| --- | --- | --- | --- | --- | --- | --- |');
  for (const [tool,t] of [...byTool].sort()) lines.push(`| ${tool} | ${t.calls} | ${t.tokens} | ${t.maxTokens} | ${t.errors} | ${t.truncated} | ${(sum(t.ms)/t.ms.length).toFixed(2)} |`);
  lines.push('',`Estimated tool-result tokens across ${calls.length} calls: ${sum(calls.map(c=>c.estTokens||0))}.`,'');
}
lines.push('## HTTP performance','');
if (!metricsUrl) lines.push('Run with --metrics while the server is running to include live route percentiles.','');
else {
  try {
    const s=await (await fetch(metricsUrl,{signal:AbortSignal.timeout(3000)})).json();
    lines.push(`Since ${s.startedAt}: ${s.totalRequests} requests, window ${s.windowSize} per route.`,'','| Route | Count | p50 ms | p95 ms | Max ms | 4xx | 5xx |','| --- | --- | --- | --- | --- | --- | --- |');
    for (const r of s.routes) lines.push(`| ${r.route} | ${r.count} | ${r.p50} | ${r.p95} | ${r.max} | ${r.clientErrors} | ${r.serverErrors} |`);
    lines.push('');
  } catch (error) { lines.push(`Metrics unavailable: ${error.message}. Start the server and retry.`,''); }
}
fs.mkdirSync('evidence',{recursive:true});fs.writeFileSync('evidence/usage-report.md',lines.join('\n'));console.log('evidence/usage-report.md');
