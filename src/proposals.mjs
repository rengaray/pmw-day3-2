import { DomainError, previewRelease, requireObject, validatePreviewInput } from './domain.mjs';
export function assertFreshPreview(state, supplied) {
  // LAB04_SNAPSHOT_START
  return supplied; // TODO rederive readiness and validate the snapshot.
  // LAB04_SNAPSHOT_END
}
export function draftProposal(state, body) {
  if (!body || typeof body!=='object' || !body.preview || typeof body.idempotencyKey!=='string' || !/^[A-Za-z0-9_-]{8,80}$/.test(body.idempotencyKey)) throw new DomainError('INVALID_INPUT','Preview and an 8 to 80 character idempotency key are required.');
  requireObject(body.preview);validatePreviewInput(body.preview);
  const canonical=value=>Array.isArray(value)?value.map(canonical):value && typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
  const fingerprint=JSON.stringify(canonical(body.preview));
  const previous=state.proposals.find(p=>p.idempotencyKey===body.idempotencyKey);
  if (previous) {
    if (previous.fingerprint!==fingerprint) throw new DomainError('KEY_REUSE','Idempotency key already describes a different request.',409);
    return {proposal:previous,replayed:true,next:state};
  }
  const preview=assertFreshPreview(state,body.preview);
  const proposal={id:`DRAFT-${String(state.proposals.length+1).padStart(3,'0')}`,status:'draft',release:preview.release,featureIds:preview.featureIds,totalEffort:preview.totalEffort,capacity:preview.capacity,snapshotHash:preview.snapshotHash,idempotencyKey:body.idempotencyKey,fingerprint,createdAt:new Date().toISOString()};
  return {proposal,replayed:false,next:{...state,revision:state.revision+1,proposals:[...state.proposals,proposal]}};
}
