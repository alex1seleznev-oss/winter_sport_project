import {createHash} from 'node:crypto';
import {load} from 'cheerio';

export const IBU_KONTIOLAHTI_SOURCE_URL='https://www.biathlonworld.com/calendar?CupLevel=all&EventId=BT2627SWRLCP01&SeasonId=2627';
const EVENT_ID='BT2627SWRLCP01';
const VENUE='Kontiolahti';
const SEASON='2026/2027';

export function normalizeOfficialText(value){
  return String(value??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
}

export function extractIbuKontiolahtiEvidence(html){
  if(typeof html!=='string'||!html.trim())throw new Error('IBU_DOCUMENT_EMPTY');
  const $=load(html);
  const bodyText=normalizeOfficialText($('body').text());
  if(!bodyText.includes(`Season ${SEASON}`))throw new Error('IBU_SEASON_NOT_FOUND');

  const matches=[];
  $(`a[href*="EventId=${EVENT_ID}"]`).each((_,element)=>{
    const text=normalizeOfficialText($(element).text());
    if(text.includes(VENUE)&&/\b2026\b/.test(text))matches.push(text);
  });
  const unique=[...new Set(matches)];
  if(unique.length===0)throw new Error('IBU_EVENT_NOT_FOUND');
  if(unique.length!==1)throw new Error('IBU_EVENT_AMBIGUOUS');
  const eventText=unique[0];
  if(!/\b\d{1,2}\s*[—–-]\s*\d{1,2}\s+Nov\s+2026\b/.test(eventText))throw new Error('IBU_EVENT_DATE_CONTRACT_FAILED');
  if(eventText.length>160)throw new Error('IBU_EVENT_TEXT_TOO_LONG');
  return `Season ${SEASON}. ${eventText}.`;
}

export function buildIbuKontiolahtiCandidate({html,observedAt,sourceUrl=IBU_KONTIOLAHTI_SOURCE_URL,language='ru'}){
  const url=new URL(sourceUrl);
  if(url.protocol!=='https:'||url.hostname!=='www.biathlonworld.com'||url.searchParams.get('EventId')!==EVENT_ID||url.searchParams.get('SeasonId')!=='2627')throw new Error('IBU_SOURCE_URL_CONTRACT_FAILED');
  const observedMs=Date.parse(observedAt);
  if(!Number.isFinite(observedMs)||observedMs>Date.now()+5*60_000)throw new Error('IBU_OBSERVED_AT_INVALID');
  if(!['ru','en'].includes(language))throw new Error('IBU_LANGUAGE_INVALID');
  const evidence=extractIbuKontiolahtiEvidence(html);
  const revision=createHash('sha256').update(`ibu|${evidence}`,'utf8').digest('hex');
  return {
    schemaVersion:1,
    sourceKey:'ibu',
    storyKey:`ibu-kontiolahti-2627-${revision.slice(0,16)}`,
    topic:'Календарь IBU 2026/27: Контиолахти',
    sourceUrl:url.toString(),
    evidence,
    observedAt:new Date(observedMs).toISOString(),
    language,
    namedPersonMedia:false,
    revision
  };
}
