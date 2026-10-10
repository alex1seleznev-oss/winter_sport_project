import {isDeepStrictEqual} from 'node:util';
import {evaluateReleaseQa} from './qa-runtime.mjs';
// A review package is a reproducible handoff, never permission to publish.
export function reviewedReleasePackage({job,inputs,outputs}){
 if(job?.status!=='succeeded'||job.type!=='qa.release'||job.agentId!=='qa')throw new Error('REVIEW_RELEASE_JOB_NOT_SUCCEEDED');
 const replay=evaluateReleaseQa({job,inputs});
 const reports=outputs.filter(a=>a.type==='qa-report'),releases=outputs.filter(a=>a.type==='release-candidate');
 if(reports.length!==1||releases.length!==1||reports[0].value.passed!==true||reports[0].value.checks.some(c=>c.status!=='pass')||replay.reviewRequired||!isDeepStrictEqual(replay.releaseCandidate,releases[0].value))throw new Error('REVIEW_RELEASE_GATES_OR_REVISION_CHANGED');
 const draft=inputs.find(a=>a.type==='article-draft'),evidence=inputs.find(a=>a.type==='approved-evidence');
 return {schemaVersion:1,release:releases[0].value,draft:draft.value,evidence:evidence.value.packet,qa:replay.qaReport,publicationAllowed:false,calendarMutationAllowed:false};
}
