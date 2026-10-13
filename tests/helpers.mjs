import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createStore } from '../src/store.mjs';
import { makeServer } from '../src/server.mjs';
export const seed=JSON.parse(fs.readFileSync(new URL('../data/seed.json',import.meta.url),'utf8'));
export function fixture(t) {const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pmw-test-'));const file=path.join(dir,'state.json');t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return {file,store:createStore(file,seed)};}
export async function server(t) {const f=fixture(t);const s=makeServer({store:f.store});s.listen(0,'127.0.0.1');await once(s,'listening');t.after(()=>new Promise(resolve=>{s.close(resolve);s.closeAllConnections();}));return {...f,base:'http://127.0.0.1:'+s.address().port};}
export const valid={release:'R1',capacity:8,featureIds:['FEAT-001','FEAT-002','FEAT-004']};
export async function request(base,route,method='GET',body) {const r=await fetch(base+route,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(3000)});return {status:r.status,data:await r.json(),headers:r.headers};}
