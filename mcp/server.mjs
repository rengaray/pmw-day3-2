import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { tools, callTool } from './tools.mjs';
import { budgetResult, usageRecord } from './usage.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const telemetryDir=process.env.PMW_TELEMETRY_DIR || path.join(root,'runtime/telemetry');
const tokenBudget=process.env.PMW_TOKEN_BUDGET ? Number(process.env.PMW_TOKEN_BUDGET) : undefined;
let initialized=false;
const send=value=>process.stdout.write(JSON.stringify(value)+'\n');
// Telemetry must never break a tool call or write to stdout, which carries protocol messages only.
function writeUsage(record) {
  try{fs.mkdirSync(telemetryDir,{recursive:true});fs.appendFileSync(path.join(telemetryDir,'mcp-usage.jsonl'),JSON.stringify(record)+'\n');}
  catch(error){process.stderr.write(`usage telemetry skipped: ${error.message}\n`);}
}
for await(const line of readline.createInterface({input:process.stdin,crlfDelay:Infinity})) {
  let request;
  try{request=JSON.parse(line);}catch{send({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}});continue;}
  if(!request || request.jsonrpc!=='2.0' || typeof request.method!=='string'){send({jsonrpc:'2.0',id:request?.id??null,error:{code:-32600,message:'Invalid request'}});continue;}
  if(!Object.hasOwn(request,'id')){if(request.method==='notifications/initialized')initialized=true;continue;}
  const response={jsonrpc:'2.0',id:request.id};
  try{
    if(request.method==='initialize') response.result={protocolVersion:'2025-11-25',capabilities:{tools:{}},serverInfo:{name:'productWorkbench',version:'4.0.0'}};
    else if(request.method==='ping') response.result={};
    else if(!initialized) response.error={code:-32000,message:'Initialize before using tools'};
    else if(request.method==='tools/list') response.result={tools};
    else if(request.method==='tools/call'){
      const started=performance.now();
      const name=request.params?.name,args=request.params?.arguments;
      const stateFile=process.env.PMW_STATE_FILE || path.join(root,'runtime/state.json');
      const state=JSON.parse(fs.readFileSync(fs.existsSync(stateFile)?stateFile:path.join(root,'data/seed.json'),'utf8'));
      let text,isError=false,truncated=false;
      try{const budgeted=budgetResult(callTool(state,name,args),tokenBudget);text=JSON.stringify(budgeted.value);truncated=budgeted.truncated;}
      catch(error){isError=true;text=JSON.stringify({code:error.code || 'INTERNAL',message:error.code?error.message:'Tool failed.'});}
      response.result={content:[{type:'text',text}],isError};
      writeUsage(usageRecord({tool:typeof name==='string'?name.slice(0,64):'invalid',args:args && typeof args==='object'?args:{},text,durationMs:performance.now()-started,isError,truncated}));
    } else response.error={code:-32601,message:'Method not found'};
  }catch{response.error={code:-32603,message:'Internal error'};}
  send(response);
}
