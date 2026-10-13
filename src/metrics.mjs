// In-process request metrics. A bounded window keeps memory flat however long the server runs.
// Fixed route keys keep metric cardinality bounded: no IDs, query strings or caller-chosen paths.
const API_ROUTES=['/api/health','/api/features','/api/features/:id','/api/preview','/api/proposals','/api/metrics'];
const STATIC_ROUTES=['/','/app.mjs','/release-view.mjs','/style.css'];
export function routeKey(method, pathname) {
  const verb=['GET','POST','PATCH'].includes(method)?method:'OTHER';
  const route=pathname.replace(/^\/api\/features\/FEAT-\d{3}$/,'/api/features/:id');
  return `${verb} ${API_ROUTES.includes(route)?route:STATIC_ROUTES.includes(route)?'static':'other'}`;
}
export function percentile(sortedValues, p) {
  // LAB05_PERCENTILE_START
  return null; // TODO return the nearest-rank percentile of an ascending array.
  // LAB05_PERCENTILE_END
}
export function createMetrics({windowSize=500}={}) {
  if (!Number.isInteger(windowSize) || windowSize<1 || windowSize>10000) throw new Error('Invalid metrics window.');
  const routes=new Map();const startedAt=new Date().toISOString();let totalRequests=0;
  return {
    record({route,status,durationMs}) {
      // LAB05_RECORD_START
      // TODO count requests, keep a bounded duration window per route and classify 4xx and 5xx responses.
      // LAB05_RECORD_END
    },
    snapshot() {
      const round=v=>v===null?null:Math.round(v*100)/100;
      return {windowSize,startedAt,totalRequests,routes:[...routes].sort(([a],[b])=>a.localeCompare(b)).map(([route,e])=>{const sorted=[...e.durations].sort((a,b)=>a-b);return {route,count:e.count,window:sorted.length,p50:round(percentile(sorted,50)),p95:round(percentile(sorted,95)),max:round(sorted.at(-1) ?? null),clientErrors:e.clientErrors,serverErrors:e.serverErrors};})};
    }
  };
}
