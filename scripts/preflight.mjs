import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
if(Number(process.versions.node.split('.')[0])!==24){console.error('Workshop baseline requires Node 24.x.');process.exit(1);}
for(const name of ['data/seed.json','src/server.mjs','web/index.html','mcp/server.mjs','.vscode/mcp.json','.github/copilot-instructions.md','ci/accepted-suites.json']) if(!fs.existsSync(name)){console.error('Open the project root, and extract hidden files. Missing '+name);process.exit(1);}
const version=(cmd,args)=>{try{return execFileSync(cmd,args,{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim().split('\n')[0];}catch{return null;}};
const git=version('git',['--version']),gh=version('gh',['--version']);
console.log('Node',process.versions.node,'project files present.');
console.log(git || 'WARNING git not found on PATH. Git is required from Lab 1.');
console.log(gh || 'NOTE GitHub CLI not found. Lab 1 and Lab 4 offer browser routes for GitHub steps.');
console.log('Account, Copilot policy, billing model and live agent checks remain manual. Record them in evidence/readiness.md.');
