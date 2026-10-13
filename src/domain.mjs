import { createHash } from 'node:crypto';
export const CONTRACT_VERSION = '1.0';
export class DomainError extends Error {
  constructor(code, message, status=400) { super(message); this.code=code; this.status=status; }
}
export function requireObject(value) {
  if (!value || typeof value!=='object' || Array.isArray(value)) throw new DomainError('INVALID_INPUT','Expected an object.');
}
export function validateFeature(f) {
  if (!Number.isInteger(f.reach) || f.reach<1 || f.reach>1000000) throw new DomainError('INVALID_INPUT','Reach must be an integer from 1 to 1000000.');
  if (![.5,1,2,3].includes(f.impact)) throw new DomainError('INVALID_INPUT','Impact must be 0.5, 1, 2, or 3.');
  if (typeof f.confidence!=='number' || !Number.isFinite(f.confidence) || f.confidence<=0 || f.confidence>1) throw new DomainError('INVALID_INPUT','Confidence must be greater than 0 and at most 1.');
  if (typeof f.effort!=='number' || !Number.isFinite(f.effort) || f.effort<0.01 || f.effort>100 || Math.abs(f.effort*100-Math.round(f.effort*100))>1e-8) throw new DomainError('INVALID_INPUT','Effort must be 0.01 to 100 weeks with at most two decimals.');
  if (!['discovery','ready','in-progress','done'].includes(f.status)) throw new DomainError('INVALID_INPUT','Unknown status.');
  if (typeof f.owner!=='string' || !f.owner.trim() || f.owner.length>80) throw new DomainError('INVALID_INPUT','Owner must contain 1 to 80 characters.');
}
export function riceScore(f) {
  validateFeature(f);
  // LAB03_SCORE_START
  return 0; // TODO implement the agreed priority formula.
  // LAB03_SCORE_END
}
export function queryFeatures(features, {q='',product='',status='',sort='priority'}={}) {
  if (q.length>200 || !['priority','id'].includes(sort)) throw new DomainError('INVALID_INPUT','Unsupported query or sort.');
  const term=q.trim().toLowerCase();
  const items=features.filter(f=>(!term || [f.id,f.title,f.owner].some(x=>x.toLowerCase().includes(term))) && (!product || f.product===product) && (!status || f.status===status)).map(f=>({...f,score:riceScore(f)}));
  return items.sort((a,b)=>sort==='id' ? a.id.localeCompare(b.id) : b.score-a.score || a.id.localeCompare(b.id));
}
export function validatePreviewInput(input) {
  requireObject(input);
  if (!['R1','R2'].includes(input.release)) throw new DomainError('INVALID_INPUT','Release must be R1 or R2.');
  if (!Array.isArray(input.featureIds) || !input.featureIds.length || input.featureIds.length>12 || input.featureIds.some(id=>typeof id!=='string' || !/^FEAT-\d{3}$/.test(id)) || new Set(input.featureIds).size!==input.featureIds.length) throw new DomainError('INVALID_INPUT','Select 1 to 12 unique feature IDs.');
  if (typeof input.capacity!=='number' || !Number.isFinite(input.capacity) || input.capacity<0.01 || input.capacity>100 || Math.abs(input.capacity*100-Math.round(input.capacity*100))>1e-8) throw new DomainError('INVALID_INPUT','Capacity must be 0.01 to 100 weeks with at most two decimals.');
}
export function previewRelease(state, input) {
  validatePreviewInput(input);
  const ids=[...input.featureIds].sort();
  const chosen=ids.map(id=>{ const f=state.features.find(x=>x.id===id); if (!f) throw new DomainError('NOT_FOUND',`Unknown feature ${id}.`,404); return f; });
  const blockers=[];
  const totalEffort=chosen.reduce((sum,f)=>sum+Math.round(f.effort*100),0)/100;
  // LAB03_READINESS_START
  // TODO add status, release, dependency, cycle and capacity blockers.
  // LAB03_READINESS_END
  const signature=JSON.stringify({contractVersion:CONTRACT_VERSION,revision:state.revision,release:input.release,ids,capacity:input.capacity,features:state.features});
  return {contractVersion:CONTRACT_VERSION,revision:state.revision,release:input.release,featureIds:ids,capacity:input.capacity,totalEffort,eligible:blockers.length===0,blockers,snapshotHash:createHash('sha256').update(signature).digest('hex')};
}
