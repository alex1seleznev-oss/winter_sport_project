import {load} from 'cheerio';

export const FIS_EVENT_DETAIL_VERSION = 'fis-event-detail/1.1.0';
const clean = value => String(value ?? '').normalize('NFKC').replace(/\s+/gu, ' ').trim();
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
const allowedSeries = {'FIS Cross-Country World Cup': 'WC', 'Cross-Country Stage World Cup': 'SWC'};

function officialUrl(value, path) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'www.fis-ski.com' || url.pathname !== path || url.username || url.password || url.port || url.hash) throw new Error('FIS_EVENT_SOURCE_NOT_ALLOWED');
  for (const key of new Set(url.searchParams.keys())) if (url.searchParams.getAll(key).length !== 1) throw new Error('FIS_EVENT_SOURCE_IDENTITY');
  return url;
}

export function checkFisEventDetailUrl(value) {
  const url = officialUrl(value, '/DB/general/event-details.html');
  if (!/^[1-9]\d*$/.test(url.searchParams.get('eventid') || '') || !/^20\d{2}$/.test(url.searchParams.get('seasoncode') || '') || url.searchParams.get('sectorcode') !== 'CC') throw new Error('FIS_EVENT_SOURCE_IDENTITY');
  if ([...url.searchParams.keys()].some(key => !['eventid', 'seasoncode', 'sectorcode'].includes(key))) throw new Error('FIS_EVENT_SOURCE_IDENTITY');
  return url;
}

function same(values, contract) {
  if (!values.length || values.some(value => !value || value !== values[0])) throw new Error(contract);
  return values[0];
}

export function parseFisEventDetail(html, {sourceUrl, expected = {}}) {
  const url = checkFisEventDetailUrl(sourceUrl);
  if (typeof html !== 'string' || !html.length || Buffer.byteLength(html) > 2 * 1024 * 1024) throw new Error('FIS_EVENT_DOCUMENT_SIZE');
  const $ = load(html);
  const properties = [...html.matchAll(/window\.fisProperties\s*=\s*(\{[^;]*\})\s*;/gu)];
  if (properties.length !== 1) throw new Error('FIS_EVENT_IDENTITY');
  let identity;
  try { identity = JSON.parse(properties[0][1]); } catch { throw new Error('FIS_EVENT_IDENTITY'); }
  const eventId = url.searchParams.get('eventid'), seasonCode = url.searchParams.get('seasoncode');
  if (String(identity.eventId) !== eventId || String(identity.seasonCode) !== seasonCode || identity.disciplineCode !== 'CC' || identity.pageSubtype !== 'event-details') throw new Error('FIS_EVENT_IDENTITY');
  $('script,style,noscript,template,nav,footer').remove();
  const venue = clean($('h1').first().text());
  const seriesLabels = $('.section__header h3').map((_, element) => clean($(element).text())).get().filter(value => Object.hasOwn(allowedSeries, value));
  const series = same(seriesLabels, 'FIS_EVENT_SERIES_CONTRACT'), category = allowedSeries[series];
  if (!venue || (expected.venue && venue !== expected.venue + ' (' + expected.country + ')') || (expected.category && expected.category !== category)) throw new Error('FIS_EVENT_IDENTITY');
  if ((expected.eventId && String(expected.eventId) !== eventId) || (expected.seasonCode && String(expected.seasonCode) !== seasonCode)) throw new Error('FIS_EVENT_IDENTITY');
  const containers = $('#eventdetailscontent');
  if (containers.length !== 1) throw new Error('FIS_EVENT_ROW_CONTRACT');
  const entries = containers.children('.table-row');
  if (!entries.length || entries.length > 200) throw new Error('FIS_EVENT_ROW_CONTRACT');
  const rows = entries.map((_, element) => {
    const entry = $(element), dates = entry.find('.timezone-date');
    if (dates.length !== 1) throw new Error('FIS_EVENT_DATE_CONTRACT');
    const date = dates.attr('data-date') || '';
    if (!validDate(date) || date < (Number(seasonCode) - 1) + '-07-01' || date > seasonCode + '-06-30' || (expected.startDate && date < expected.startDate) || (expected.endDate && date > expected.endDate)) throw new Error('FIS_EVENT_DATE_CONTRACT');
    const sourceTimezone = dates.attr('data-timezone');
    try { new Intl.DateTimeFormat('en', {timeZone: sourceTimezone}).format(0); } catch { throw new Error('FIS_EVENT_TIMEZONE_CONTRACT'); }
    if (!sourceTimezone) throw new Error('FIS_EVENT_TIMEZONE_CONTRACT');
    const localTime = dates.attr('data-time') || null;
    if (localTime && !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(localTime)) throw new Error('FIS_EVENT_TIME_CONTRACT');
    const event = same(entry.find('.clip').map((_, label) => clean($(label).text())).get(), 'FIS_EVENT_LABEL_CONTRACT');
    if (!/^(?:\d+(?:\.\d+)?(?:x\d+(?:\.\d+)?)?km\s+)?(?:Interval Start|Heat Mass Start|Mass Start|Sprint Qualification|Sprint Final|Team Sprint Qualification|Team Sprint|Relay|Pursuit|Skiathlon)\s+(?:Classic\/Free|Classic|Free)$/.test(event)) throw new Error('FIS_EVENT_LABEL_CONTRACT');
    const anchors = entry.find('a');
    const codexValues = anchors.map((_, anchor) => clean($(anchor).text())).get().filter(value => /^\d{4}$/.test(value));
    if (codexValues.length !== 1) throw new Error('FIS_EVENT_CODEX_CONTRACT');
    const codex = codexValues[0];
    const categories = anchors.map((_, anchor) => clean($(anchor).text())).get().filter(value => /^(?:WC|SWC)$/.test(value));
    if (same(categories, 'FIS_EVENT_CATEGORY_CONTRACT') !== category) throw new Error('FIS_EVENT_CATEGORY_CONTRACT');
    const genderCode = same(entry.find('.gender__item').map((_, gender) => clean($(gender).text())).get(), 'FIS_EVENT_GENDER_CONTRACT');
    if (!['M', 'W', 'A'].includes(genderCode)) throw new Error('FIS_EVENT_GENDER_CONTRACT');
    const links = anchors.map((_, anchor) => $(anchor).attr('href')).get().filter(href => href.includes('results.html'));
    const raceId = same(links.map(href => {
      const raceUrl = officialUrl(href, '/DB/general/results.html');
      const id = raceUrl.searchParams.get('raceid');
      if (!/^[1-9]\d*$/.test(id || '') || raceUrl.searchParams.get('sectorcode') !== 'CC') throw new Error('FIS_EVENT_RACE_IDENTITY');
      return id;
    }), 'FIS_EVENT_RACE_IDENTITY');
    const flags = entry.find('.status__item').map((_, flag) => clean($(flag).attr('title'))).get();
    const cancellation = flags.filter(flag => /^(?:Not cancelled|Cancelled)$/i.test(flag));
    if (cancellation.length !== 1) throw new Error('FIS_EVENT_STATUS_CONTRACT');
    return {date, codex, raceId, event, category, gender: {M: 'men', W: 'women', A: 'mixed'}[genderCode], localTime, sourceTimezone, cancelled: cancellation[0].toLowerCase() === 'cancelled'};
  }).get();
  if (new Set(rows.map(row => row.codex)).size !== rows.length || new Set(rows.map(row => row.raceId)).size !== rows.length) throw new Error('FIS_EVENT_DUPLICATE_IDENTITY');
  return {venue, eventId, seasonCode, series, sourceUrl: url.href, parserVersion: FIS_EVENT_DETAIL_VERSION, rows};
}

export function summarizeFisSessions(parsed) {
  return {rowCount: parsed.rows.length, qualification: parsed.rows.filter(row => /Qualification/.test(row.event)).length, finals: parsed.rows.filter(row => /Sprint Final|Team Sprint (?:Classic|Free)$/.test(row.event)).length, codex: parsed.rows.map(row => row.codex).sort()};
}
