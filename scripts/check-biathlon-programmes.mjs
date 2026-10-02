// Read-only organizer source checks. No database keys, writes, approvals or timezone guesses.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {checkProgrammeUrl,parseOrganizerProgramme,compareOrganizerProgramme,sourceClockConflicts} from './lib/biathlon-programme.mjs';
const baseline=JSON.parse(readFileSync(new URL('../config/biathlon-programmes.json',import.meta.url),'utf8'));
const reports=[],parsed=[];
for(const expected of baseline.sources){try{
 const url=checkProgrammeUrl(expected.url);
 const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(20000),headers:{'user-agent':'WinterSportsHub/1.4 read-only-programme-check'}});
 if(!response.ok){await response.body?.cancel();throw new Error('ORGANIZER_HTTP_'+response.status)}
 if(!response.headers.get('content-type')?.includes('text/html')){await response.body?.cancel();throw new Error('ORGANIZER_NOT_HTML')}
 if(!response.body)throw new Error('ORGANIZER_EMPTY_BODY');
 const reader=response.body.getReader(),chunks=[];let bytes=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>2*1024*1024){await reader.cancel();throw new Error('ORGANIZER_RESPONSE_TOO_LARGE')}chunks.push(value)}}finally{reader.releaseLock()}
 const raw=Buffer.concat(chunks);const programme=parseOrganizerProgramme(raw.toString('utf8'),expected);parsed.push(programme);
 reports.push({sourceKey:expected.key,ok:true,receipt:{url,fetchedAt:new Date().toISOString(),sha256:createHash('sha256').update(raw).digest('hex'),bytes,httpStatus:response.status},...programme,...compareOrganizerProgramme(expected,programme)});
 }catch(e){reports.push({sourceKey:expected.key,url:expected.url,ok:false,error:e.message,networkCause:e.cause?.code??null})}}
const conflicts=sourceClockConflicts(parsed);const changed=reports.some(r=>!r.ok||r.changes.length>0);
const report={checkedAt:new Date().toISOString(),ok:reports.every(r=>r.ok),requiresReview:changed,status:changed?'source_error_or_changed_programme':'baseline_matched_with_time_caveats',sources:reports,conflicts,knownClockConflict:'kontiolahti|2026-11-29|sprint|women',databaseWrites:0,publishedTimes:0,scope:'Two organizer programmes, three language pages; compares stored source baseline, not live Supabase'};
mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/biathlon-programme-review.json',JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,sourceChecks:reports.map(r=>({key:r.sourceKey,ok:r.ok,error:r.error,changes:r.changes?.length})),conflicts:conflicts.length,databaseWrites:0},null,2));
if(changed)process.exitCode=1;
