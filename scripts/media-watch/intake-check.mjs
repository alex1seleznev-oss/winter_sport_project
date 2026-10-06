// Validate a downloaded report for trusted-operator staging. Does not connect to a database.
import {EVIDENCE_MAX_CHARS,hash,reference} from './model.mjs';
export function checkIntakePacket(packet){
 if(packet?.schemaVersion!==2||!Array.isArray(packet.items)||packet.items.length>500||!Array.isArray(packet.sources)||packet.sources.length>20)throw new Error('INTAKE_SCHEMA');
 if(packet.databaseWrites!==0||packet.calendarWrites!==0||packet.publishedFacts!==0)throw new Error('UNEXPECTED_WRITER_PACKET');
 if(packet.packetHash!==hash({items:packet.items,sources:packet.sources}))throw new Error('PACKET_HASH_MISMATCH');
 const receipts=new Map(packet.sources.filter(s=>s.status==='parsed').map(s=>[s.key,s.receipt]));
 const unique=new Map(),observations=new Set();
 for(const item of packet.items){
  if(item.verificationStatus!=='unverified'||item.calendarMutationAllowed!==false||item.title?.length>160||!reference(item.url)||!reference(item.sourceUrl))throw new Error('ITEM_PUBLICATION_OR_URL_INVALID');
  for(const name of ['revision','contentHash','evidenceHash'])if(!/^[a-f0-9]{64}$/.test(item[name]||''))throw new Error('ITEM_HASH');
  if(typeof item.evidence!=='string'||item.evidence.length>EVIDENCE_MAX_CHARS||item.evidenceHash!==hash(item.evidence)||typeof item.evidenceTruncated!=='boolean')throw new Error('ITEM_EVIDENCE_INVALID');
  if(item.mediaOnly===true&&item.evidence!=='')throw new Error('ITEM_MEDIA_ONLY_EVIDENCE_INVALID');
  if(item.mediaOnly!==true&&!item.evidence.trim())throw new Error('ITEM_EVIDENCE_REQUIRED');
  const receipt=receipts.get(item.sourceKey);if(!receipt||receipt.sha256!==item.receipt?.sha256||receipt.fetchedAt!==item.receipt?.fetchedAt||receipt.httpStatus!==200)throw new Error('SOURCE_RECEIPT_MISMATCH');
  const id=item.sourceKey+'|'+item.url+'|'+item.revision;if(observations.has(id))throw new Error('DUPLICATE_OBSERVATION');observations.add(id);
  if(!unique.has(item.url))unique.set(item.url,[]);unique.get(item.url).push(item);
 }
 return {observations:observations.size,uniqueReferences:unique.size,duplicatePublisherReferences:observations.size-unique.size,mayPublish:false,mayChangeCalendar:false};
}
