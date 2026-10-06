import {mkdirSync,writeFileSync} from 'node:fs';
import {fetchOfficialHtml} from '../lib/fetch-official.mjs';
import {buildIbuKontiolahtiCandidate,IBU_KONTIOLAHTI_SOURCE_URL} from './official-story-candidate.mjs';

const fetched=await fetchOfficialHtml(IBU_KONTIOLAHTI_SOURCE_URL);
const candidate=buildIbuKontiolahtiCandidate({html:fetched.html,observedAt:fetched.fetchedAt,sourceUrl:fetched.sourceUrl,language:'ru'});
mkdirSync('artifacts/official-story',{recursive:true});
writeFileSync('artifacts/official-story/candidate.json',JSON.stringify(candidate,null,2));
writeFileSync('artifacts/official-story/source-receipt.json',JSON.stringify({
  sourceKey:candidate.sourceKey,
  sourceUrl:candidate.sourceUrl,
  storyKey:candidate.storyKey,
  revision:candidate.revision,
  fetchedAt:fetched.fetchedAt,
  httpStatus:fetched.httpStatus,
  bytes:fetched.bytes,
  documentSha256:fetched.documentSha256,
  transport:fetched.transport,
  tlsVerified:fetched.tlsVerified===true
},null,2));
console.log(JSON.stringify({ok:true,storyKey:candidate.storyKey,revision:candidate.revision,sourceKey:candidate.sourceKey}));
