/** Shared, dependency-free publication and formatting rules. */
export function safeHttpsUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443')) return null;
    if (!u.hostname.includes('.') || /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.)/i.test(u.hostname)) return null;
    return u.href;
  } catch { return null; }
}
export function raceStatus(value) {
  return ({scheduled:'Запланировано',tentative:'Предварительно',provisional:'Проект календаря',completed:'Завершено',cancelled:'Отменено',postponed:'Перенесено'})[value] || 'Статус уточняется';
}
export function moscowDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const get = key => parts.find(p => p.type === key)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value+'T00:00:00Z').toISOString().slice(0,10) === value;
}
export function raceStart(date, time) {
  if (!validDate(date)) return null;
  if (!time) return date; // A date is NOT an invented midnight start.
  if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(time)) return null;
  return `${date}T${time.length === 5 ? time+':00' : time}+03:00`;
}
export function formatDate(value) {
  return validDate(value) ? new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Moscow'}).format(new Date(value+'T12:00:00+03:00')) : 'Дата уточняется';
}
export function sportLabel(value) { return value === 'biathlon' ? 'Биатлон' : 'Лыжные гонки'; }
export function genderLabel(value) { return ({men:'Мужчины',women:'Женщины',mixed:'Смешанная гонка'})[value] || 'Категория уточняется'; }
export function normalizeFilters(params = {}) {
  return {sport:['biathlon','cross_country'].includes(params.sport) ? params.sport : undefined, scope:['russia','international'].includes(params.scope) ? params.scope : undefined};
}
export function jsonForHtml(value) { return JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029'); }
export const MEDIA_MIME_TYPES = Object.freeze({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif','video/mp4':'mp4','video/quicktime':'mov','video/webm':'webm'});
export const MEDIA_MAX_BYTES = 50 * 1024 * 1024;
export function validateMediaRequest(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.hasOwn(MEDIA_MIME_TYPES,value.mimeType) && Number.isSafeInteger(value.sizeBytes) && value.sizeBytes > 0 && value.sizeBytes <= MEDIA_MAX_BYTES && ['owned','licensed','public_domain'].includes(value.rightsStatus) && typeof value.rightsEvidence === 'string' && value.rightsEvidence.trim().length >= 10 && value.rightsEvidence.length <= 2000;
}
