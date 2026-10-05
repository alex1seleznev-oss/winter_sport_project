import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateReleaseQa,evaluateMediaQa} from '../lib/agents/qa-runtime.mjs';

const packet={
 packetId:'packet-qa-1',topic:'QA synthetic',createdAt:'2026-10-05T12:00:00Z',
 sources:[{sourceId:'source:official:1',kind:'official',url:'https://example.org/official',publishedAt:null,observedAt:'2026-10-05T12:00:00Z'}],
 claims:[{claimId:'claim-1',text:'Synthetic verified fact',kind:'fact',confidence:'verified',sourceIds:['source:official:1'],mutable:false}],
 conflicts:[]
};
const report={reportId:'report-qa-1',packetId:'packet-qa-1',decision:'pass',checks:[{claimId:'claim-1',decision:'supported',sourceRefs:['source:official:1'],note:'supported'}]};
const approved={packet,report};
const draft={
 draftId:'draft-qa-1',title:'Synthetic article',dek:'Synthetic dek',body:'Synthetic body based on an approved claim.',
 claimIds:['claim-1'],sourceRefs:['source:official:1'],seo:{title:'Synthetic article',description:'Synthetic description'},internalLinks:[]
};
function inputs(overrides={}){
 return [
  {type:'fact-check-report',ref:'artifact:fact:report:0',value:overrides.report??report},
  {type:'approved-evidence',ref:'artifact:fact:approved:1',value:overrides.approved??approved},
  {type:'article-draft',ref:'artifact:writer:draft:0',value:overrides.draft??draft},
  ...(overrides.visual?[{type:'visual-package',ref:'artifact:visual:package:0',value:overrides.visual}]:[])
 ];
}
const job={jobId:'10000000-0000-4000-8000-000000000099',agentId:'qa',type:'qa.release',payload:{namedPersonMedia:false}};

test('QA emits release candidate only after exact fact/evidence/draft gates pass',()=>{
 const result=evaluateReleaseQa({job,inputs:inputs()});
 assert.equal(result.reviewRequired,false);
 assert.equal(result.qaReport.passed,true);
 assert.ok(result.artifacts.some(item=>item.type==='qa-report'));
 assert.ok(result.artifacts.some(item=>item.type==='release-candidate'));
 assert.deepEqual(result.releaseCandidate.approvals,['fact-check-passed','qa-passed']);
 assert.match(result.releaseCandidate.revision,/^sha256:[a-f0-9]{64}$/);
 assert.ok(result.releaseCandidate.artifactRefs.includes('artifact:writer:draft:0'));
});

test('QA fails closed when approved evidence does not embed the exact checked report',()=>{
 const changedReport={...report,reportId:'report-other'};
 const changedApproved={packet,report:changedReport};
 const result=evaluateReleaseQa({job,inputs:inputs({approved:changedApproved})});
 assert.equal(result.reviewRequired,true);
 assert.equal(result.qaReport.passed,false);
 assert.equal(result.releaseCandidate,null);
 assert.equal(result.artifacts.some(item=>item.type==='release-candidate'),false);
 assert.equal(result.qaReport.checks.find(item=>item.name==='approved-evidence-report-match').status,'fail');
});

test('QA fails closed when draft references a claim outside approved evidence',()=>{
 const changedDraft={...draft,claimIds:['claim-unknown']};
 const result=evaluateReleaseQa({job,inputs:inputs({draft:changedDraft})});
 assert.equal(result.reviewRequired,true);
 assert.equal(result.qaReport.checks.find(item=>item.name==='draft-has-approved-claims').status,'fail');
});

test('named-person release cannot pass QA without a visual package',()=>{
 const result=evaluateReleaseQa({job:{...job,payload:{namedPersonMedia:true}},inputs:inputs()});
 assert.equal(result.reviewRequired,true);
 assert.equal(result.qaReport.checks.find(item=>item.name==='named-person-media-gate').status,'fail');
});

test('reviewed visual package must target the same draft',()=>{
 const visual={packageId:'visual-1',draftId:'other-draft',namedPersonMedia:false,media:[]};
 const result=evaluateReleaseQa({job,inputs:inputs({visual})});
 assert.equal(result.reviewRequired,true);
 assert.equal(result.qaReport.checks.find(item=>item.name==='visual-draft-match').status,'fail');
});

test('media QA passes structurally reviewed non-person visual package without creating release candidate',()=>{
 const visual={packageId:'visual-media-1',draftId:'draft-media-1',namedPersonMedia:false,media:[]};
 const result=evaluateMediaQa({job:{...job,type:'qa.media-review'},inputs:[{type:'visual-package',ref:'artifact:visual:package:0',value:visual}]});
 assert.equal(result.reviewRequired,false);
 assert.equal(result.qaReport.passed,true);
 assert.equal(result.releaseCandidate,null);
 assert.deepEqual(result.artifacts.map(item=>item.type),['qa-report']);
});

test('media QA fails closed when named-person package has no reviewed media',()=>{
 const visual={packageId:'visual-media-2',draftId:'draft-media-2',namedPersonMedia:true,media:[]};
 const result=evaluateMediaQa({job:{...job,type:'qa.media-review'},inputs:[{type:'visual-package',ref:'artifact:visual:package:0',value:visual}]});
 assert.equal(result.reviewRequired,true);
 assert.equal(result.qaReport.passed,false);
 assert.equal(result.qaReport.checks.find(item=>item.name==='named-person-media-present').status,'fail');
});
