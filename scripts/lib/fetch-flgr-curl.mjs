import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp, readFile, rm, stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const execute = promisify(execFile);
const flgrHosts = new Set(['flgr-results.ru', 'www.flgr-results.ru']);
export const OFFICIAL_USER_AGENT = 'WinterSportsHub/1.3 official-source-check';

export function isFlgrTransportUrl(url) {
  return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
    !url.hash && flgrHosts.has(url.hostname) &&
    /^\/(?:calendar\/?|results\/\d+\/?)$/.test(url.pathname);
}

// Same official URL, same identifying UA. No proxy, TLS exceptions or redirects.
// curl is used only for a classified Node transport failure, not HTTP denials.
export async function fetchFlgrWithCurl(sourceUrl, {maxBytes = 2 * 1024 * 1024, execFileImpl = execute} = {}) {
  const url = new URL(sourceUrl);
  if (!isFlgrTransportUrl(url)) throw new Error('SOURCE_NOT_ALLOWED');
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 2 * 1024 * 1024) {
    throw new Error('SOURCE_LIMIT_INVALID');
  }
  const directory = await mkdtemp(join(tmpdir(), 'winter-flgr-'));
  const output = join(directory, 'document.html');
  try {
    const args = [
      '--disable', '--silent', '--show-error', '--globoff',
      '--proto', '=https', '--proto-redir', '=https', '--noproxy', '*',
      '--connect-timeout', '10', '--max-time', '20', '--max-redirs', '0',
      '--max-filesize', String(maxBytes), '--user-agent', OFFICIAL_USER_AGENT,
      '--header', 'Accept: text/html', '--header', 'Accept-Encoding: identity',
      '--output', output, '--write-out',
      '%{http_code}\n%{content_type}\n%{url_effective}\n%{ssl_verify_result}',
      '--url', url.href,
    ];
    let stdout;
    try {
      ({stdout} = await execFileImpl('curl', args, {
        encoding: 'utf8', timeout: 22000, maxBuffer: 8192, windowsHide: true,
        shell: false,
      }));
    } catch (cause) {
      const error = new Error(cause.code === 63 ? 'SOURCE_TOO_LARGE' : 'SOURCE_CURL_FAILED', {cause});
      error.code = cause.code === 63 ? 'SOURCE_TOO_LARGE' : 'SOURCE_CURL_FAILED';
      error.curlExitCode = Number.isInteger(cause.code) ? cause.code : null;
      throw error;
    }
    const parts = String(stdout).trimEnd().split('\n');
    if (parts.length !== 4 || !/^\d{3}$/.test(parts[0])) throw new Error('SOURCE_CURL_METADATA_INVALID');
    const [status, contentType, effectiveUrl, verifyResult] = parts;
    if (verifyResult !== '0') throw new Error('SOURCE_TLS_VERIFY_FAILED');
    if (effectiveUrl !== url.href) throw new Error('SOURCE_REDIRECT_REJECTED');
    const httpStatus = Number(status);
    if (httpStatus < 200 || httpStatus >= 300) throw new Error(`SOURCE_HTTP_${status}`);
    if (!/^text\/html(?:\s*;|$)/i.test(contentType.trim())) throw new Error('SOURCE_CONTENT_TYPE_INVALID');
    const {size} = await stat(output);
    if (!size) throw new Error('SOURCE_EMPTY_BODY');
    if (size > maxBytes) throw new Error('SOURCE_TOO_LARGE');
    const buffer = await readFile(output);
    if (buffer.byteLength > maxBytes) throw new Error('SOURCE_TOO_LARGE');
    return {buffer, httpStatus};
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
}
