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
    if(Number.isFinite(ms))return iso;
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
