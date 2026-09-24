'use strict';

const MAX_BODY = 2 * 1024 * 1024;
const ORIGIN = 'https://repd.jalisco.gob.mx';
function validUrl(value) {
  try {
    if (typeof value !== 'string' || !value.startsWith(`${ORIGIN}/`) || /[\u0000-\u001f\\]/.test(value)) return false;
    const url = new URL(value);
    return url.origin === ORIGIN && url.protocol === 'https:' && url.hostname === 'repd.jalisco.gob.mx' &&
      url.port === '' && !url.username && !url.password && !url.hash && url.href === value;
  } catch { return false; }
}
function signature(bytes, mime) {
  if (mime === 'image/jpeg' && bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 &&
    bytes[2] === 255 && bytes[bytes.length - 2] === 255 && bytes[bytes.length - 1] === 217) return 'jpg';
  if (mime === 'image/png' && bytes.length >= 45 && bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) &&
    bytes.readUInt32BE(8) === 13 && bytes.subarray(12, 16).toString('ascii') === 'IHDR' &&
    bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0 &&
    bytes.readUInt32BE(16) * bytes.readUInt32BE(20) <= 40_000_000 &&
    bytes.readUInt32BE(bytes.length - 12) === 0 &&
    bytes.subarray(bytes.length - 8, bytes.length - 4).toString('ascii') === 'IEND') return 'png';
  return null;
}
// Header/signature/terminal marker checks only: not a full image decoder or pixel assurance.
async function fetchImage(url, { fetcher = globalThis.fetch, timeoutMs = 20000 } = {}) {
  const controller = new AbortController();
  let timer, reader, response, consumed = 0, expired = false;
  try {
    const work = (async () => {
      response = await fetcher(url, { method: 'GET', redirect: 'manual', signal: controller.signal,
        headers: { accept: 'image/jpeg, image/png' } });
      if (!response || !Number.isInteger(response.status) || !response.headers?.get) return { code: 'invalid_response' };
      if (response.status >= 300 && response.status < 400) return { code: 'redirect_rejected' };
      if ([401, 403, 429].includes(response.status)) return { code: 'source_stop' };
      if (response.status >= 500 && response.status <= 599) return { code: 'http_transient' };
      if (response.status !== 200) return { code: 'http_rejected' };
      const mime = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (!['image/jpeg', 'image/png'].includes(mime)) return { code: 'invalid_mime' };
      const length = response.headers.get('content-length');
      if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BODY || Number(length) === 0)) {
        return { code: 'body_too_large' };
      }
      if (!response.body?.getReader) return { code: 'invalid_response' };
      reader = response.body.getReader();
      const chunks = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (expired) return { code: 'request_timeout' };
        if (done) break;
        if (!(value instanceof Uint8Array)) return { code: 'invalid_response' };
        consumed += value.byteLength;
        if (consumed > MAX_BODY) return { code: 'body_too_large' };
        chunks.push(value);
      }
      const bytes = Buffer.concat(chunks, consumed);
      const ext = signature(bytes, mime);
      return ext ? { code: 'validated', bytes, ext, mime } : { code: 'invalid_image' };
    })();
    const result = await Promise.race([work, new Promise((resolve) => {
      timer = setTimeout(() => { expired = true; controller.abort(); resolve({ code: 'request_timeout' }); }, timeoutMs);
    })]);
    return { ...result, consumed };
  } catch { return { code: 'network_failed', consumed }; }
  finally {
    clearTimeout(timer);
    controller.abort();
    try {
      if (reader) Promise.resolve(reader.cancel()).catch(() => {});
      else if (response?.body) Promise.resolve(response.body.cancel()).catch(() => {});
    } catch { /* Abort is already requested. */ }
  }
}
module.exports = Object.freeze({ fetchImage, validUrl, signature, MAX_BODY });
