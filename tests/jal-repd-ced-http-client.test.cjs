'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createJsonClient } = require('../src/jal-repd-ced/http-client.cjs');

const url = 'https://repd.jalisco.gob.mx/api/v1/version_publica/repd-version-publica-cedulas-busqueda/?estado=14&page=1&limit=100';
const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), {
  status, headers: { 'content-type': 'application/json', ...headers },
});

function clock() {
  let time = 0;
  const waits = [];
  return { now: () => time, sleep: async (ms) => { waits.push(ms); time += ms; }, waits };
}

test('rate limits attempts, retries transient status, and honors Retry-After seconds', async () => {
  const fake = clock();
  const times = [];
  const client = createJsonClient({ ...fake, fetch: async (_, init) => {
    assert.equal(init.redirect, 'manual');
    times.push(fake.now());
    return times.length === 1 ? json({}, 429, { 'retry-after': '3' }) : json({ ok: true });
  } });
  assert.deepEqual(await client.get(url), { ok: true });
  assert.deepEqual(times, [0, 3000]);
});

test('three attempts maximum for transient errors and no retries on auth, redirects, malformed JSON or content type', async () => {
  for (const [status, expected] of [[401, 'http_rejected'], [403, 'http_rejected'], [302, 'redirect_rejected']]) {
    let calls = 0;
    const client = createJsonClient({ ...clock(), fetch: async () => { calls++; return json({}, status); } });
    await assert.rejects(client.get(url), { code: expected });
    assert.equal(calls, 1);
  }
  for (const response of [new Response('private', { headers: { 'content-type': 'text/plain' } }),
    new Response('private', { headers: { 'content-type': 'application/json' } })]) {
    const client = createJsonClient({ ...clock(), fetch: async () => response });
    await assert.rejects(client.get(url), (error) => !error.message.includes('private'));
  }
  let calls = 0;
  const fake = clock();
  await assert.rejects(createJsonClient({ ...fake, fetch: async () => { calls++; throw Error('private network detail'); } }).get(url),
    (error) => error.code === 'network_failed' && !error.message.includes('private'));
  assert.equal(calls, 3);
  assert.deepEqual(fake.waits, [1000, 2000]);
});

test('excessive Retry-After stops without trying early', async () => {
  let calls = 0;
  const client = createJsonClient({ ...clock(), fetch: async () => { calls++; return json({}, 503, { 'retry-after': '999' }); } });
  await assert.rejects(client.get(url), { code: 'retry_wait_exceeded' });
  assert.equal(calls, 1);
});

test('streaming oversized chunks abort and cancel without retaining an unbounded body', async () => {
  let canceled = false;
  let aborted = false;
  const body = new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(600000)); },
    cancel() { canceled = true; },
  });
  const client = createJsonClient({ ...clock(), fetch: async (_, { signal }) => {
    signal.addEventListener('abort', () => { aborted = true; });
    return new Response(body, { headers: { 'content-type': 'application/json' } });
  } });
  await assert.rejects(client.get(url), { code: 'body_too_large' });
  assert.equal(canceled, true);
  assert.equal(aborted, true);
});

test('deadline covers stalled response body even if the stream never completes', async () => {
  let aborted = false;
  const client = createJsonClient({ ...clock(), timeoutMs: 20, fetch: async (_, { signal }) => {
    signal.addEventListener('abort', () => { aborted = true; });
    return new Response(new ReadableStream({ start() {} }), { headers: { 'content-type': 'application/json' } });
  } });
  await assert.rejects(client.get(url), { code: 'request_timeout' });
  assert.equal(aborted, true);
});

test('connection deadline is bounded even when fetch ignores abort', async () => {
  let aborted = false;
  const client = createJsonClient({ ...clock(), timeoutMs: 10, fetch: (_, { signal }) => {
    signal.addEventListener('abort', () => { aborted = true; });
    return new Promise(() => {});
  } });
  await assert.rejects(client.get(url), { code: 'request_timeout' });
  assert.equal(aborted, true);
});

test('non-success bodies are canceled, including authentication responses', async () => {
  let canceled = false;
  const body = new ReadableStream({ start() {}, cancel() { canceled = true; } });
  const client = createJsonClient({ ...clock(), fetch: async () => new Response(body, { status: 403 }) });
  await assert.rejects(client.get(url), { code: 'http_rejected' });
  assert.equal(canceled, true);
});

test('invalid runtime overrides fail closed', () => {
  for (const settings of [{ timeoutMs: Infinity }, { timeoutMs: 0 }, { maxBytes: -1 },
    { minIntervalMs: 0 }, { maxAttempts: 4 }, { maxWaitMs: Infinity }, { fetch: 7 }]) {
    assert.throws(() => createJsonClient(settings), { code: 'invalid_transport_options' });
  }
});
