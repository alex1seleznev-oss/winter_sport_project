import {createHash} from 'node:crypto';
import {fetchFlgrWithCurl, isFlgrTransportUrl, OFFICIAL_USER_AGENT} from './fetch-flgr-curl.mjs';
const hosts = new Set(['www.fis-ski.com','www.biathlonworld.com','biathlonrus.com','flgr.ru','www.flgr-results.ru','flgr-results.ru','fis.flgr-results.ru','data.flgr-results.ru']);
const recoverable = new Set(['ECONNRESET','UND_ERR_SOCKET','ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT']);

export function describeSourceError(error) {
  const chain = [];
  const visit = (entry, depth = 0) => {
    if (!entry || depth > 4) return;
    chain.push(String(entry.code || entry.name || 'Error'));
    visit(entry.cause, depth + 1);
    for (const nested of entry.errors?.slice(0, 4) || []) visit(nested, depth + 1);
  };
  visit(error);
  const message = String(error?.message || 'Unknown source error').slice(0, 200);
  const tlsCode = chain.find(code => /CERT|TLS|SSL|UNABLE_TO_VERIFY|SELF_SIGNED/.test(code));
  const transportCode = chain.find(code => recoverable.has(code));
  const category = tlsCode || /SOURCE_TLS/.test(message) || error?.curlExitCode === 60 ? 'tls' :
    /SOURCE_HTTP_/.test(message) ? 'http' :
    /NOT_ALLOWED|LIMIT_INVALID|REDIRECT/.test(message) ? 'policy' :
    /CONTENT_TYPE|TOO_LARGE|EMPTY_BODY|METADATA/.test(message) ? 'document' :
    transportCode ? 'transport' : /FLGR_.*(?:CONTRACT|COVERAGE|DATE)/.test(message) ? 'parser' : 'unknown';
  return {category, code: tlsCode || transportCode || String(error?.code || error?.name || 'Error'), message};
}

export async function fetchOfficialHtml(sourceUrl, {fetchImpl = fetch, maxBytes = 2 * 1024 * 1024, curlImpl = fetchFlgrWithCurl} = {}) {
  const url = new URL(sourceUrl);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash || !hosts.has(url.hostname)) throw new Error('SOURCE_NOT_ALLOWED');
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 2 * 1024 * 1024) throw new Error('SOURCE_LIMIT_INVALID');
  let buffer, httpStatus, fallback = null;
  let transport = 'node_fetch';
  try {
    const response = await fetchImpl(url, {
      redirect: 'manual', signal: AbortSignal.timeout(20000),
      headers: {'user-agent': OFFICIAL_USER_AGENT},
    });
    if (!response.ok) { await response.body?.cancel(); throw new Error(`SOURCE_HTTP_${response.status}`); }
    if (!/^text\/html(?:\s*;|$)/i.test(response.headers.get('content-type')?.trim() || '')) {
      await response.body?.cancel(); throw new Error('SOURCE_CONTENT_TYPE_INVALID');
    }
    if (!response.body) throw new Error('SOURCE_EMPTY_BODY');
    const reader = response.body.getReader();
    const chunks = []; let bytes = 0;
    try {
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > maxBytes) { await reader.cancel(); throw new Error('SOURCE_TOO_LARGE'); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    buffer = Buffer.concat(chunks);
    httpStatus = response.status;
  } catch (error) {
    const failure = describeSourceError(error);
    if (!curlImpl || !isFlgrTransportUrl(url) || failure.category !== 'transport') throw error;
    // Deliberately do not retry a certificate error, HTTP denial, redirect or bad document.
    ({buffer, httpStatus} = await curlImpl(url.href, {maxBytes}));
    transport = 'curl_https';
    fallback = {from: 'node_fetch', reason: failure.code};
  }
  if (!buffer?.byteLength) throw new Error('SOURCE_EMPTY_BODY');
  if (buffer.byteLength > maxBytes) throw new Error('SOURCE_TOO_LARGE');
  return {
    html: buffer.toString('utf8'), sourceUrl: url.href, fetchedAt: new Date().toISOString(),
    httpStatus, bytes: buffer.byteLength, documentSha256: createHash('sha256').update(buffer).digest('hex'),
    transport, tlsVerified: true, ...(fallback ? {transportFallback: fallback} : {}),
  };
}
