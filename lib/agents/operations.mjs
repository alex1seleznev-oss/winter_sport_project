const EXECUTABLE=['research','fact-check','editorial-writer','visual-director','qa'];

function exactCount(result){
  if(result?.error||!Number.isSafeInteger(result?.count)||result.count<0)throw new Error('OPERATIONS_COUNT_UNAVAILABLE');
  return result.count;
}

export async function readOperationsSnapshot(client,{now=new Date()}={}){
  const checkedAt=now.toISOString();
  try{
    const count=(table,statuses)=>client.from(table).select('id',{head:true,count:'exact'}).in('status',statuses);
    const [queued,running,review,failed,legacy,latest,candidates]=await Promise.all([
      count('agent_jobs',['queued']),count('agent_jobs',['running']),
      count('agent_jobs',['review_required','awaiting_review']),count('agent_jobs',['failed']),
      count('editorial_queue',['queued']),
      client.from('agent_runs').select('completed_at').not('completed_at','is',null).order('completed_at',{ascending:false}).limit(1),
      client.rpc('agent_dispatch_candidates',{p_agent_ids:EXECUTABLE,p_limit:20})
    ]);
    if(latest.error||candidates.error||!Array.isArray(latest.data)||!Array.isArray(candidates.data))throw new Error('OPERATIONS_READ_UNAVAILABLE');
    const latestCompletedAt=latest.data[0]?.completed_at??null;
    if(latestCompletedAt!==null&&!Number.isFinite(Date.parse(latestCompletedAt)))throw new Error('OPERATIONS_TIME_INVALID');
    const counts={queued:exactCount(queued),running:exactCount(running),review:exactCount(review),failed:exactCount(failed),legacy:exactCount(legacy)};
    // Candidate RPC is capped at 20. Never describe this as an exact total.
    return {available:true,checkedAt,counts,readyCandidates:candidates.data.length,readyCapped:candidates.data.length===20,latestCompletedAt,
      state:counts.failed?'attention':counts.review||counts.legacy?'review':counts.running?'running':candidates.data.length?'ready':'idle'};
  }catch{
    return {available:false,checkedAt,counts:null,readyCandidates:null,readyCapped:false,latestCompletedAt:null,state:'unknown'};
  }
}
