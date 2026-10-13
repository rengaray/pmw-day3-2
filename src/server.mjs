import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createStore } from './store.mjs';
import { CONTRACT_VERSION, DomainError, previewRelease, queryFeatures } from './domain.mjs';
import { createMetrics, routeKey } from './metrics.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const staticFiles={'/':'index.html','/app.mjs':'app.mjs','/release-view.mjs':'release-view.mjs','/style.css':'style.css'};
const jsonLog=process.env.PMW_LOG==='json';
export function makeServer({store,metrics=createMetrics()}={}) {
  store ||= createStore(path.join(root,'runtime/state.json'),JSON.parse(fs.readFileSync(path.join(root,'data/seed.json'),'utf8')));
  return http.createServer(async (req,res)=>{
    const requestId=randomUUID();
    const started=performance.now();
    let route='invalid';
    // Record after the response is sent. Route keys never contain IDs, query strings or bodies.
    res.on('finish',()=>{
      if (route==='GET /api/metrics') return;
      const durationMs=performance.now()-started;
      metrics.record({route,status:res.statusCode,durationMs});
      if (jsonLog) console.log(JSON.stringify({ts:new Date().toISOString(),requestId,route,status:res.statusCode,durationMs:Math.round(durationMs*100)/100}));
    });
    res.setHeader('X-Request-ID',requestId);
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const send=(status,value)=>{ res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Server-Timing':`app;dur=${(performance.now()-started).toFixed(1)}`});res.end(JSON.stringify(value)); };
    try {
      if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host || '')) throw new DomainError('BAD_HOST','Loopback host required.',403);
      if (req.headers.origin && req.headers.origin!==`http://${req.headers.host}`) throw new DomainError('BAD_ORIGIN','Same origin required.',403);
      const url=new URL(req.url,'http://127.0.0.1');
      route=routeKey(req.method,url.pathname);
      if (req.method==='GET' && url.pathname==='/api/metrics') return send(200,metrics.snapshot());
      if (req.method==='GET' && url.pathname==='/api/health') return send(200,{status:'ok',contractVersion:CONTRACT_VERSION});
      if (req.method==='GET' && url.pathname==='/api/features') { const state=store.read();return send(200,{contractVersion:CONTRACT_VERSION,revision:state.revision,items:queryFeatures(state.features,Object.fromEntries(url.searchParams))}); }
      const match=url.pathname.match(/^\/api\/features\/(FEAT-\d{3})$/);
      if (req.method==='GET' && match) { const f=store.read().features.find(x=>x.id===match[1]); if(!f)throw new DomainError('NOT_FOUND','Feature not found.',404);return send(200,f); }
      if (req.method==='GET' && url.pathname==='/api/proposals') return send(200,{items:store.read().proposals.map(({fingerprint,idempotencyKey,...p})=>p)});
      if (['POST','PATCH'].includes(req.method)) {
        if (!(req.headers['content-type'] || '').startsWith('application/json')) throw new DomainError('CONTENT_TYPE','Use application/json.',415);
        const chunks=[];let bytes=0;
        for await (const chunk of req) {bytes+=chunk.length;if(bytes<=65536)chunks.push(chunk);}
        if(bytes>65536)throw new DomainError('TOO_LARGE','Request exceeds 64 KiB.',413);
        const raw=Buffer.concat(chunks).toString('utf8');
        let body;try{body=JSON.parse(raw);}catch{throw new DomainError('INVALID_JSON','Malformed JSON.',400);}
        if (req.method==='PATCH' && match) return send(200,store.update(match[1],body));
        if (req.method==='POST' && url.pathname==='/api/preview') return send(200,previewRelease(store.read(),body));
        if (req.method==='POST' && url.pathname==='/api/proposals') { const result=store.draft(body);return send(result.replayed?200:201,result); }
      }
      if (req.method==='GET' && staticFiles[url.pathname]) {
        const file=staticFiles[url.pathname];
        res.writeHead(200,{'Content-Type':file.endsWith('.mjs')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8'});
        return res.end(fs.readFileSync(path.join(root,'web',file)));
      }
      throw new DomainError('NOT_FOUND','Route not found.',404);
    } catch (error) {send(error instanceof DomainError?error.status:500,{error:{code:error instanceof DomainError?error.code:'INTERNAL',message:error instanceof DomainError?error.message:'Unexpected server error.'},requestId});}
  });
}
if (process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const port=Number(process.env.PORT || 4173);
  makeServer().listen(port,'127.0.0.1',()=>console.log(`Product Release Workbench http://127.0.0.1:${port}`));
}
