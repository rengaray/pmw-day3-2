import { renderRelease } from './release-view.mjs';
const $=s=>document.querySelector(s);
let items=[],revision=0,selected=new Set(),preview=null,pending=false,idempotencyKey=null;
const message=text=>$('#notice').textContent=text;
async function api(url,options={}) {
  const response=await fetch(url,{...options,headers:{'Content-Type':'application/json',...options.headers}});
  const data=await response.json();
  if(!response.ok) {const e=new Error(data.error?.message || 'Request failed');e.code=data.error?.code;e.requestId=data.requestId;throw e;}
  return data;
}
function invalidate(){preview=null;idempotencyKey=null;renderRelease($('#release-result'),preview);$('#draft').disabled=true;}
function selection(){ $('#selection').textContent=selected.size?[...selected].join(', '):'No features selected';$('#metrics').textContent=`${items.length} visible features / ${selected.size} selected`; }
function cell(value){const td=document.createElement('td');td.textContent=value;return td;}
function render() {
  const rows=$('#features');rows.replaceChildren();
  for(const f of items){const row=document.createElement('tr');const tick=cell('');const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=selected.has(f.id);checkbox.setAttribute('aria-label',`Select ${f.id}`);checkbox.addEventListener('change',()=>{checkbox.checked?selected.add(f.id):selected.delete(f.id);invalidate();selection();});tick.append(checkbox);row.append(tick);
    const title=cell('');const strong=document.createElement('strong');strong.textContent=f.title;const small=document.createElement('small');small.textContent=`${f.id} / ${f.product} / ${f.release}`;title.append(strong,small);row.append(title,cell(f.owner),cell(f.status),cell(f.score.toFixed(2)),cell(f.effort));
    const action=cell('');const button=document.createElement('button');button.textContent='Edit';button.setAttribute('aria-label',`Edit ${f.id}`);button.onclick=()=>edit(f);action.append(button);row.append(action);rows.append(row);
  }
  $('#empty').hidden=items.length!==0;$('#revision').textContent=`Workspace revision ${revision}`;$('#metrics').textContent=`${items.length} visible features / ${selected.size} selected`;
}
function edit(f){const form=$('#edit');form.hidden=false;for(const key of ['id','version','owner','status','reach','impact','confidence','effort']) form.elements[key].value=f[key];$('#edit-hint').textContent=`Editing ${f.id} at version ${f.version}. Changes invalidate earlier previews.`;form.elements.owner.focus();}
async function load(){const qs=new URLSearchParams(new FormData($('#filters')));const result=await api('/api/features?'+qs);items=result.items;revision=result.revision;$('#contract').textContent=result.contractVersion;render();const saved=await api('/api/proposals');$('#proposals').replaceChildren();for(const p of saved.items){const li=document.createElement('li');li.textContent=`${p.id} / ${p.release} / ${p.status} / ${p.totalEffort} weeks`;$('#proposals').append(li);}}
$('#filters').onsubmit=async event=>{event.preventDefault();try{await load();message('Filters applied.');}catch(e){message(e.message);}};
$('#edit').onsubmit=async event=>{
  event.preventDefault();const form=event.currentTarget;const button=form.querySelector('button');button.disabled=true;
  try{const changes=Object.fromEntries(['owner','status','reach','impact','confidence','effort'].map(k=>[k,['reach','impact','confidence','effort'].includes(k)?Number(form.elements[k].value):form.elements[k].value]));await api('/api/features/'+form.elements.id.value,{method:'PATCH',body:JSON.stringify({version:Number(form.elements.version.value),changes})});invalidate();await load();form.hidden=true;message('Estimate saved. Preview the release again.');}
  catch(e){message(`${e.code || 'ERROR'}: ${e.message}`);if(e.code==='STALE_VERSION'){invalidate();await load();form.hidden=true;}}finally{button.disabled=false;}
};
$('#preview').oninput=()=>invalidate();
$('#preview').onsubmit=async event=>{
  event.preventDefault();if(pending)return;pending=true;preview=null;$('#draft').disabled=true;const button=event.currentTarget.querySelector('button');button.disabled=true;renderRelease($('#release-result'),null,{pending:true});
  try{const form=event.currentTarget;preview=await api('/api/preview',{method:'POST',body:JSON.stringify({release:form.elements.release.value,capacity:Number(form.elements.capacity.value),featureIds:[...selected]})});idempotencyKey=crypto.randomUUID();const view=renderRelease($('#release-result'),preview);$('#draft').disabled=!view.canDraft;message('Readiness preview returned.');}
  catch(e){preview=null;renderRelease($('#release-result'),null);message(`${e.code || 'ERROR'}: ${e.message}`);}finally{pending=false;button.disabled=false;}
};
$('#draft').onclick=async()=>{
  if(!preview || pending)return;pending=true;$('#draft').disabled=true;
  try{const result=await api('/api/proposals',{method:'POST',body:JSON.stringify({preview,idempotencyKey})});message(`${result.proposal.id} saved as a draft. No production release occurred.`);invalidate();await load();}
  catch(e){message(`${e.code || 'ERROR'}: ${e.message} ${e.requestId?'Request '+e.requestId:''}`);if(e.code==='STALE_PREVIEW' || e.code==='BLOCKED_RELEASE')invalidate();else $('#draft').disabled=false;}finally{pending=false;}
};
async function performance(){const s=await api('/api/metrics');const rows=$('#perf tbody');rows.replaceChildren();if(!s.routes.length){const row=document.createElement('tr');const td=cell('No request metrics recorded yet.');td.colSpan=4;row.append(td);rows.append(row);return;}for(const r of s.routes){const row=document.createElement('tr');row.append(cell(r.route),cell(r.count),cell(r.p95 ?? 'n/a'),cell(r.clientErrors+r.serverErrors));rows.append(row);}}
$('#perf-refresh').onclick=()=>performance().catch(e=>message('Unable to load performance: '+e.message));
renderRelease($('#release-result'),null);load().then(performance).catch(e=>message('Unable to load workspace: '+e.message));
