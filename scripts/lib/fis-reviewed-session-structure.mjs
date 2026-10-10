function assert(condition,code){if(!condition)throw new Error(code);}
const DATE=/^20\d{2}-\d{2}-\d{2}$/;
const CODEX=/^\d{4}$/;
const RACE_ID=/^\d+$/;
const SHA256=/^[a-f0-9]{64}$/;

function identitySet(rows,key){return [...rows.map(row=>row[key])].sort();}
function sameArray(a,b){return a.length===b.length&&a.every((value,index)=>value===b[index]);}

export function validateFisSessionReviews(reviews,stages){
  assert(reviews&&reviews.schemaVersion===1,'FIS_REVIEW_SCHEMA_INVALID');
  assert(Number.isFinite(Date.parse(reviews.reviewedAt)),'FIS_REVIEW_TIMESTAMP_INVALID');
  assert(typeof reviews.captureRun==='string'&&/^https:\/\/github\.com\/alex1seleznev-oss\/winter_sport_project\/actions\/runs\/\d+$/.test(reviews.captureRun),'FIS_REVIEW_CAPTURE_INVALID');
  assert(reviews.events&&typeof reviews.events==='object'&&!Array.isArray(reviews.events),'FIS_REVIEW_EVENTS_INVALID');
  const byId=new Map(stages.map(stage=>[String(stage.eventId),stage]));
  for(const [eventId,review] of Object.entries(reviews.events)){
    const stage=byId.get(eventId);
    assert(stage,'FIS_REVIEW_UNKNOWN_EVENT');
    assert(review?.competitionKey===stage.competitionKey,'FIS_REVIEW_COMPETITION_MISMATCH');
    assert(review?.sourceUrl===stage.sourceUrl,'FIS_REVIEW_SOURCE_MISMATCH');
    assert(typeof review.reason==='string'&&review.reason.trim().length>=20,'FIS_REVIEW_REASON_INVALID');
    assert(typeof review.documentSha256==='string'&&SHA256.test(review.documentSha256),'FIS_REVIEW_HASH_INVALID');
    assert(Array.isArray(review.rows)&&review.rows.length>0,'FIS_REVIEW_ROWS_INVALID');
    for(const row of review.rows){
      assert(row&&DATE.test(row.date),'FIS_REVIEW_ROW_DATE_INVALID');
      assert(CODEX.test(row.codex),'FIS_REVIEW_ROW_CODEX_INVALID');
      assert(RACE_ID.test(row.raceId),'FIS_REVIEW_ROW_RACE_ID_INVALID');
      assert(typeof row.event==='string'&&row.event.trim(),'FIS_REVIEW_ROW_EVENT_INVALID');
      assert(['WC','SWC'].includes(row.category),'FIS_REVIEW_ROW_CATEGORY_INVALID');
      assert(['men','women','mixed'].includes(row.gender),'FIS_REVIEW_ROW_GENDER_INVALID');
      assert(row.localTime===null||/^\d{2}:\d{2}$/.test(row.localTime),'FIS_REVIEW_ROW_TIME_INVALID');
      assert(typeof row.sourceTimezone==='string'&&row.sourceTimezone.includes('/'),'FIS_REVIEW_ROW_TIMEZONE_INVALID');
      assert(typeof row.cancelled==='boolean','FIS_REVIEW_ROW_CANCELLED_INVALID');
    }
    const codex=identitySet(review.rows,'codex');
    const raceIds=identitySet(review.rows,'raceId');
    assert(new Set(codex).size===codex.length&&new Set(raceIds).size===raceIds.length,'FIS_REVIEW_DUPLICATE_IDENTITY');
    assert(sameArray(codex,identitySet(stage.rows,'codex'))&&sameArray(raceIds,identitySet(stage.rows,'raceId')),'FIS_REVIEW_IDENTITY_CHANGE_REQUIRES_BASELINE_REVIEW');
  }
  return reviews;
}

export function expectedFisSessionRows(stage,reviews){
  const review=reviews.events?.[String(stage.eventId)]||null;
  return {rows:review?.rows||stage.rows,review};
}
