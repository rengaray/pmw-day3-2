export function releaseView(preview,{pending=false}={}) {
  // LAB04_VIEW_START
  return {headline:'Release view awaiting implementation',canDraft:false,lines:[]};
  // LAB04_VIEW_END
}
export function renderRelease(container,preview,options={}) {
  const view=releaseView(preview,options);
  container.replaceChildren();
  const h=document.createElement('h3');h.textContent=view.headline;container.append(h);
  if(preview){const p=document.createElement('p');p.textContent=`${preview.totalEffort} / ${preview.capacity} engineering weeks. Snapshot ${preview.snapshotHash.slice(0,12)}.`;container.append(p);}
  const ul=document.createElement('ul');
  for(const line of view.lines){const li=document.createElement('li');li.textContent=line;ul.append(li);}
  container.append(ul);
  return view;
}
