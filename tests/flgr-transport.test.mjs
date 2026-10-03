import {test} from 'node:test';
import assert from 'node:assert/strict';
import {writeFile, access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fetchOfficialHtml, describeSourceError} from '../scripts/lib/fetch-official.mjs';
import {fetchFlgrWithCurl, OFFICIAL_USER_AGENT} from '../scripts/lib/fetch-flgr-curl.mjs';
const url = 'https://flgr-results.ru/calendar';
const reset = () => new TypeError('fetch failed', {cause: Object.assign(new Error('read ECONNRESET'), {code: 'ECONNRESET'})});
const html = '<html>Official FLGR calendar</html>';
const buffer = Buffer.from(html);
const success = async () => ({buffer, httpStatus: 200});
const failFetch = async () => {throw reset();};

test('same-source fallback preserves hash, source URL and original failure', async () => {
  const result = await fetchOfficialHtml(url, {fetchImpl: failFetch, curlImpl: async (actual, options) => {
    assert.equal(actual, url); assert.equal(options.maxBytes, 2097152); return success();
  }});
  assert.equal(result.sourceUrl, url); assert.equal(result.html, html);
  assert.equal(result.transport, 'curl_https'); assert.equal(result.tlsVerified, true);
  assert.equal(result.transportFallback.reason, 'ECONNRESET');
  assert.equal(result.documentSha256, createHash('sha256').update(buffer).digest('hex'));
});
test('successful native fetch does not call fallback', async () => {
  const result = await fetchOfficialHtml(url, {fetchImpl: async () => new Response(html, {headers: {'content-type': 'text/html'}}), curlImpl: async () => assert.fail('unnecessary fallback')});
  assert.equal(result.transport, 'node_fetch'); assert.equal(result.transportFallback, undefined);
});
test('fallback cannot be used for other sources or non-calendar FLGR paths', async () => {
  for (const source of ['https://www.fis-ski.com/', 'https://flgr-results.ru/login', 'https://fis.flgr-results.ru/calendar']) {
    await assert.rejects(fetchOfficialHtml(source, {fetchImpl: failFetch, curlImpl: async () => assert.fail('out-of-scope fallback')}), /fetch failed/);
  }
});
test('HTTP denials and redirects never trigger transport fallback', async () => {
  for (const status of [301, 302, 403, 429, 500]) {
    await assert.rejects(fetchOfficialHtml(url, {fetchImpl: async () => new Response('', {status}), curlImpl: async () => assert.fail('HTTP bypass')}), new RegExp(`HTTP_${status}`));
  }
});
test('certificate failures including nested errors are not retried', async () => {
  const cert = Object.assign(new Error('certificate failure'), {code: 'CERT_HAS_EXPIRED'});
  const error = new TypeError('fetch failed', {cause: new AggregateError([reset(), cert])});
  assert.equal(describeSourceError(error).category, 'tls');
  await assert.rejects(fetchOfficialHtml(url, {fetchImpl: async () => {throw error;}, curlImpl: async () => assert.fail('TLS bypass')}), /fetch failed/);
});
test('invalid document is not retried and empty bodies are rejected', async () => {
  for (const [body, contentType, expected] of [['{}','application/json',/CONTENT_TYPE/], ['', 'text/html', /EMPTY_BODY/], ['abc','text/html',/TOO_LARGE/]]) {
    await assert.rejects(fetchOfficialHtml(url, {maxBytes: 2, fetchImpl: async () => new Response(body, {headers: {'content-type': contentType}}), curlImpl: async () => assert.fail('document bypass')}), expected);
  }
});
test('limits and untrusted URL are rejected before network access', async () => {
  for (const maxBytes of [0, -1, 2.5, 2097153]) await assert.rejects(fetchOfficialHtml(url, {maxBytes, fetchImpl: async () => assert.fail()}), /LIMIT_INVALID/);
  for (const source of ['http://flgr-results.ru/calendar', 'https://flgr-results.ru.evil.test/calendar', 'https://u:p@flgr-results.ru/calendar', 'https://127.0.0.1/calendar']) {
    await assert.rejects(fetchFlgrWithCurl(source, {execFileImpl: async () => assert.fail()}), /NOT_ALLOWED/);
  }
});
function fakeCurl({status = 200, type = 'text/html; charset=utf-8', effective = url, verify = '0', body = html, inspect = () => {}} = {}) {
  return async (command, args, options) => {
    const output = args[args.indexOf('--output') + 1];
    inspect({command, args, options, output});
    await writeFile(output, body);
    return {stdout: `${status}\n${type}\n${effective}\n${verify}`, stderr: ''};
  };
}
test('curl requires TLS, no proxies, no redirects, fixed UA and no shell', async () => {
  let file;
  const result = await fetchFlgrWithCurl(url, {execFileImpl: fakeCurl({inspect: ({command,args,options,output}) => {
    file = output; assert.equal(command, 'curl'); assert.equal(args[0], '--disable');
    assert.equal(options.shell, false); assert.equal(args[args.indexOf('--proto') + 1], '=https');
    assert.equal(args[args.indexOf('--noproxy') + 1], '*');
    assert.equal(args[args.indexOf('--user-agent') + 1], OFFICIAL_USER_AGENT);
    assert.equal(args[args.indexOf('--max-filesize') + 1], '2097152');
    for (const forbidden of ['-k','--insecure','-L','--location','--proxy-insecure']) assert.ok(!args.includes(forbidden));
  }})});
  assert.equal(result.buffer.toString(), html); assert.equal(result.httpStatus, 200);
  await assert.rejects(access(file), /ENOENT/);
});
test('curl rejects HTTP, TLS, effective URL, MIME, empty and size anomalies', async () => {
  const cases = [[{status:403}, /HTTP_403/], [{status:302}, /HTTP_302/], [{verify:'10'}, /TLS_VERIFY/], [{effective:'https://evil.test/'}, /REDIRECT/], [{type:'application/json'}, /CONTENT_TYPE/], [{body:''}, /EMPTY_BODY/], [{body:'x'.repeat(41)}, /TOO_LARGE/]];
  for (const [settings, expected] of cases) await assert.rejects(fetchFlgrWithCurl(url, {maxBytes:40, execFileImpl:fakeCurl(settings)}), expected);
});
test('curl execution failures clean up temporary files and surface exit code', async () => {
  let file;
  await assert.rejects(fetchFlgrWithCurl(url, {execFileImpl: async (_command,args) => {
    file = args[args.indexOf('--output') + 1]; await writeFile(file, 'partial');
    throw Object.assign(new Error('curl transfer rejected'), {code:63});
  }}), /TOO_LARGE/);
  await assert.rejects(access(file), /ENOENT/);
});
test('raw transport detail separates network, TLS and document failures', () => {
  assert.deepEqual(describeSourceError(reset()), {category:'transport', code:'ECONNRESET', message:'fetch failed'});
  assert.equal(describeSourceError(new Error('SOURCE_HTTP_429')).category,'http');
  assert.equal(describeSourceError(new Error('FLGR_CALENDAR_CONTRACT_MISMATCH')).category,'parser');
});
