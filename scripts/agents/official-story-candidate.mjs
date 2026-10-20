import {createHash} from 'node:crypto';
import {IBU_EVENTS_API_URL,assertIbuEventsApiUrl} from '../lib/fetch-ibu-datacenter.mjs';

export const IBU_KONTIOLAHTI_SOURCE_URL=IBU_EVENTS_API_URL;
const EVENT_ID='BT2627SWRLCP01';
const VENUE='Kontiolahti';
const SEASON_START='2026-07-01';
const SEASON_END='2027-05-01';

export function normalizeOfficialText(value){
  return String(value??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
}

function normalizeApiDate(value,label){
  const text=normalizeOfficialText(value);
  const iso=text.match(/^(\d{4}-\d{2}-\d{2})(?:T|$)/)?.[1];
  if(iso){
    const ms=Date.parse(`${iso}T00:00:00Z`);
    if(Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===iso)return iso;
  }
  const dotNet=text.match(/^\/Date\((\d{10,14})(?:[+-]\d{4})?\)\/$/);
  if(dotNet){
    const raw=Number(dotNet[1]);
    const ms=dotNet[1].length===10?raw*1000:raw;
    if(Number.isFinite(ms))return new Date(ms).toISOString().slice(0,10);
  }
  throw new Error(`IBU_EVENT_${label}_INVALID`);
}

export function extractIbuKontiolahtiEvidence(events){
  if(!Array.isArray(events))throw new Error('IBU_API_SHAPE_INVALID');
  const matches=events.filter((event)=>event&&typeof event==='object'&&event.EventId===EVENT_ID);
  if(matches.length===0)throw new Error('IBU_EVENT_NOT_FOUND');
  if(matches.length!==1)throw new Error('IBU_EVENT_AMBIGUOUS');
  const event=matches[0];
  const venueFields=[event.ShortDescription,event.Description,event.Organizer,event.Venue,event.Location].map(normalizeOfficialText).filter(Boolean);
  if(!venueFields.some((value)=>value.toLowerCase().includes(VENUE.toLowerCase())))throw new Error('IBU_EVENT_VENUE_CONTRACT_FAILED');
  const venue=venueFields.find((value)=>value.toLowerCase().includes(VENUE.toLowerCase()))||VENUE;
  if(venue.length>160)throw new Error('IBU_EVENT_TEXT_TOO_LONG');
  const startDate=normalizeApiDate(event.StartDate,'START_DATE');
  const endDate=normalizeApiDate(event.EndDate,'END_DATE');
  if(startDate>endDate)throw new Error('IBU_EVENT_DATE_ORDER_INVALID');
  if(startDate<SEASON_START||endDate>SEASON_END)throw new Error('IBU_EVENT_SEASON_WINDOW_INVALID');
  return `IBU Datacenter event ${EVENT_ID}. Venue: ${venue}. Start: ${startDate}. End: ${endDate}.`;
}

export function buildIbuKontiolahtiCandidate({events,observedAt,sourceUrl=IBU_KONTIOLAHTI_SOURCE_URL,language='ru'}){
  const url=assertIbuEventsApiUrl(sourceUrl);
  const observedMs=Date.parse(observedAt);
  if(!Number.isFinite(observedMs)||observedMs>Date.now()+5*60_000)throw new Error('IBU_OBSERVED_AT_INVALID');
  if(!['ru','en'].includes(language))throw new Error('IBU_LANGUAGE_INVALID');
  const evidence=extractIbuKontiolahtiEvidence(events);
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


// Rotate across actual World Cup events from the same approved official feed.
// One event per invocation keeps model work bounded; unchanged evidence reuses jobs.
export function selectIbuWorldCupEvent(events,rotation=0){
  if(!Array.isArray(events))throw new Error('IBU_API_SHAPE_INVALID');
  if(!Number.isSafeInteger(rotation)||rotation<0)throw new Error('IBU_ROTATION_INVALID');
  const rows=events.filter(event=>event&&/^BT2627SWRLCP0[1-9]$/.test(event.EventId));
  if(rows.length===0)throw new Error('IBU_WORLD_CUP_EVENTS_MISSING');
  if(new Set(rows.map(event=>event.EventId)).size!==rows.length)throw new Error('IBU_EVENT_AMBIGUOUS');
  rows.sort((a,b)=>a.EventId.localeCompare(b.EventId));
  return {event:rows[rotation%rows.length],coverage:rows.length};
}

export function buildIbuWorldCupCandidate({events,rotation=0,observedAt,sourceUrl=IBU_KONTIOLAHTI_SOURCE_URL,language='ru'}){
  const {event,coverage}=selectIbuWorldCupEvent(events,rotation);
  if(event.EventId===EVENT_ID)return {candidate:buildIbuKontiolahtiCandidate({events,observedAt,sourceUrl,language}),eventId:EVENT_ID,coverage};
  const url=assertIbuEventsApiUrl(sourceUrl);
  const observedMs=Date.parse(observedAt);
  if(!Number.isFinite(observedMs)||observedMs>Date.now()+5*60_000)throw new Error('IBU_OBSERVED_AT_INVALID');
  if(!['ru','en'].includes(language))throw new Error('IBU_LANGUAGE_INVALID');
  const venue=[event.ShortDescription,event.Venue,event.Location,event.Description,event.Organizer].map(normalizeOfficialText).find(Boolean);
  if(!venue||venue.length>160)throw new Error('IBU_EVENT_VENUE_CONTRACT_FAILED');
  const startDate=normalizeApiDate(event.StartDate,'START_DATE'),endDate=normalizeApiDate(event.EndDate,'END_DATE');
  if(startDate>endDate)throw new Error('IBU_EVENT_DATE_ORDER_INVALID');
  if(startDate<SEASON_START||endDate>SEASON_END)throw new Error('IBU_EVENT_SEASON_WINDOW_INVALID');
  const evidence=`IBU Datacenter event ${event.EventId}. Venue: ${venue}. Start: ${startDate}. End: ${endDate}.`;
  const revision=createHash('sha256').update(`ibu|${evidence}`,'utf8').digest('hex');
  return {eventId:event.EventId,coverage,candidate:{
    schemaVersion:1,sourceKey:'ibu',storyKey:`ibu-event-${event.EventId.toLowerCase()}-${revision.slice(0,16)}`,
    topic:`Календарь IBU 2026/27: ${venue}`,sourceUrl:url.toString(),evidence,
    observedAt:new Date(observedMs).toISOString(),language,namedPersonMedia:false,revision
  }};
}
