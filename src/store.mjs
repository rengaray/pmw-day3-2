import fs from 'node:fs';
import path from 'node:path';
import { DomainError, requireObject, validateFeature } from './domain.mjs';
import { assertVersion } from './concurrency.mjs';
import { draftProposal } from './proposals.mjs';
export function createStore(file, seed) {
  let state=fs.existsSync(file) ? JSON.parse(fs.readFileSync(file,'utf8')) : structuredClone(seed);
  function save(next) {
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file+'.tmp',JSON.stringify(next,null,2));
    fs.renameSync(file+'.tmp',file);
    state=next;
  }
  return {
    read:()=>structuredClone(state),
    update(id,body) {
      requireObject(body); requireObject(body.changes);
      const f=state.features.find(x=>x.id===id);
      if (!f) throw new DomainError('NOT_FOUND','Feature not found.',404);
      assertVersion(f.version,body.version);
      const allowed=['owner','status','reach','impact','confidence','effort'];
      if (!Object.keys(body.changes).length || Object.keys(body.changes).some(k=>!allowed.includes(k))) throw new DomainError('INVALID_INPUT','Unsupported feature change.');
      const updated={...f,...body.changes,owner:typeof body.changes.owner==='string'?body.changes.owner.trim():f.owner,version:f.version+1};
      validateFeature(updated);
      save({...state,revision:state.revision+1,features:state.features.map(x=>x.id===id?updated:x)});
      return structuredClone(updated);
    },
    draft(body) {
      const result=draftProposal(state,body);
      if (!result.replayed) save(result.next);
      return {proposal:structuredClone(result.proposal),replayed:result.replayed};
    }
  };
}
