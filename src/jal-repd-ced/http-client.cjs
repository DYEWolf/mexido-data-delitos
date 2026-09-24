'use strict';

const DEFAULTS = Object.freeze({ timeoutMs: 20000, maxBytes: 1048576,
  minIntervalMs: 1000, maxAttempts: 3, maxWaitMs: 20000 });

function fail(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function retryDelay(value, now) {
  if (value == null) return 0;
  const seconds = Number(value);
  if (value.trim() !== '' && Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? 0 : Math.max(0, date - now);
}

function createJsonClient(options = {}) {
  const settings = { ...DEFAULTS };
  for (const [key, ceiling] of Object.entries(DEFAULTS)) {
    if (options[key] !== undefined) {
      const value = options[key];
      if (!Number.isSafeInteger(value) || value < 1 || value > ceiling) throw fail('invalid_transport_options');
      settings[key] = value;
    }
  }
  const fetcher = options.fetch === undefined ? globalThis.fetch : options.fetch;
  const now = options.now === undefined ? Date.now : options.now;
  const sleep = options.sleep === undefined ? (ms) => new Promise((resolve) => setTimeout(resolve, ms)) : options.sleep;
  if (typeof fetcher !== 'function' || typeof now !== 'function' || typeof sleep !== 'function') {
    throw fail('invalid_transport_options');
  }
  let previousAttempt = null;
  let inFlight = false;

  async function get(url) {
    if (inFlight) throw fail('request_in_progress');
    inFlight = true;
    try {
      let delay = 0;
      for (let attempt = 1; attempt <= settings.maxAttempts; attempt += 1) {
        if (previousAttempt !== null) {
          const wait = Math.max(settings.minIntervalMs - (now() - previousAttempt), delay);
          if (!Number.isFinite(wait) || wait > settings.maxWaitMs) throw fail('retry_wait_exceeded');
          if (wait > 0) await sleep(wait);
        }
        previousAttempt = now();
        const controller = new AbortController();
        let response;
        let reader;
        let timer;
        try {
          // Race even a fetch/stream that ignores AbortSignal; abort releases the real transport.
          const timeout = new Promise((_, reject) => {
            timer = setTimeout(() => { controller.abort(); reject(fail('request_timeout')); }, settings.timeoutMs);
          });
          const request = (async () => {
            response = await fetcher(url, { method: 'GET', redirect: 'manual', signal: controller.signal,
              headers: { accept: 'application/json' } });
            if (!response || typeof response.status !== 'number' || !response.headers
              || typeof response.headers.get !== 'function') throw fail('invalid_response');
            if (response.status >= 300 && response.status < 400) throw fail('redirect_rejected');
            if (response.status === 429 || (response.status >= 500 && response.status <= 599)) {
              const error = fail('http_retryable');
              error.retryAfter = response.headers.get('retry-after');
              throw error;
            }
            if (response.status < 200 || response.status >= 300) throw fail('http_rejected');
            if (!/^application\/(?:json|[\w.-]+\+json)(?:\s*;|\s*$)/i.test(response.headers.get('content-type') || '')) {
              throw fail('invalid_content_type');
            }
            if (!response.body || typeof response.body.getReader !== 'function') throw fail('invalid_response');
            reader = response.body.getReader();
            const chunks = [];
            let size = 0;
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              if (!(value instanceof Uint8Array)) throw fail('invalid_response');
              size += value.byteLength;
              if (size > settings.maxBytes) throw fail('body_too_large');
              chunks.push(value);
            }
            const bytes = Buffer.concat(chunks, size);
            try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
            catch (_) { throw fail('invalid_json'); }
          })();
          return await Promise.race([request, timeout]);
        } catch (error) {
          controller.abort();
          try {
            if (reader) Promise.resolve(reader.cancel()).catch(() => {});
            else if (response?.body) Promise.resolve(response.body.cancel()).catch(() => {});
          } catch (_) { /* Abort already released the request. */ }
          const known = new Set(['network_failed', 'request_timeout', 'http_retryable',
            'http_rejected', 'redirect_rejected', 'invalid_content_type', 'invalid_response',
            'body_too_large', 'invalid_json']);
          const code = known.has(error?.code) ? error.code : 'network_failed';
          if (!['network_failed', 'request_timeout', 'http_retryable'].includes(code)
            || attempt === settings.maxAttempts) throw fail(code);
          delay = Math.max(2 ** (attempt - 1) * settings.minIntervalMs,
            retryDelay(error.retryAfter, now()));
          if (delay > settings.maxWaitMs) throw fail('retry_wait_exceeded');
        } finally {
          clearTimeout(timer);
        }
      }
      throw fail('network_failed');
    } finally { inFlight = false; }
  }
  return Object.freeze({ get });
}

module.exports = Object.freeze({ createJsonClient });
