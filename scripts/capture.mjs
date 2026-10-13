import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const diff=execFileSync('git',['diff','--stat'],{encoding:'utf8'});
const stagedDiff=execFileSync('git',['diff','--cached','--stat'],{encoding:'utf8'});
const dirtyFiles=execFileSync('git',['status','--porcelain=v1'],{encoding:'utf8'}).split('\n').filter(Boolean);
fs.mkdirSync('evidence',{recursive:true});fs.writeFileSync('evidence/candidate.json',JSON.stringify({branch,sha,node:process.versions.node,capturedAt:new Date().toISOString(),uncommittedDiff:diff,stagedDiff,dirtyFiles,note:'Record harness, model, real tools, check outputs and browser observations separately.'},null,2));console.log('evidence/candidate.json');
