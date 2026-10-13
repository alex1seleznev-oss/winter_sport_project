import {checkIntakePacket} from './intake-check.mjs';

// Resolve only the exact current revision. No fuzzy URL match or silent dropping.
export function intakeBatches(packet){
 checkIntakePacket(packet);
 if(!packet.delta||!Array.isArray(packet.delta.newReferences)||!Array.isArray(packet.delta.changedReferences))throw new Error('DELTA_SCHEMA');
 const refs=[...packet.delta.newReferences,...packet.delta.changedReferences];
 if(refs.length>500)throw new Error('DELTA_TOO_LARGE');
 const key=i=>JSON.stringify([i.sourceKey,i.url,i.revision]);
 const byId=new Map(packet.items.map(i=>[key(i),i])),seen=new Set();
 const items=refs.map(r=>{
  if(!r||typeof r!=='object'||typeof r.sourceKey!=='string'||typeof r.url!=='string'||!/^[a-f0-9]{64}$/.test(r.revision||''))throw new Error('DELTA_REFERENCE_INVALID');
  const id=key(r),item=byId.get(id);
  if(!item)throw new Error('DELTA_ITEM_MISMATCH');
  if(seen.has(id))throw new Error('DELTA_DUPLICATE');
  seen.add(id);return item;
 });
 const batches=[];for(let i=0;i<items.length;i+=100)batches.push(items.slice(i,i+100));
 return batches;
}
