'use strict';
// Usage: node scripts/jal-repd-ced-freshness.cjs --reference LOCAL_SNAPSHOT --output NEW_PRIVATE_DIR
// One bounded GET of page 1 (count/total_pages only), no redirects, 20 s timeout, 1 MiB cap.
// Writes a private probe record; stdout carries only the classification and aggregate numbers.
// Date/Age or missing validators never prove origin freshness: without a count change or a strong
// validator the result is "no_change_detected", never "fresh"; any doubt is "unknown".
const fs = require('node:fs');
const path = require('node:path');
const { readValidatedSnapshot } = require('../src/jal-repd-ced/compare-baselines.cjs');
const { assertNewDestination } = require('../src/private-output.cjs');

const BASE = 'https://repd.jalisco.gob.mx/api/v1/version_publica/repd-version-publica-cedulas-busqueda/?estado=14&page=1';
// total_pages depends on page size (server default 10); probe with the reference's size.
const endpointFor = (pageSize) => `${BASE}&limit=${pageSize}`;
const HEADERS = ['date', 'age', 'etag', 'last-modified', 'cache-control', 'expires', 'vary', 'content-type',
  'content-length', 'x-cache', 'cf-cache-status', 'server-timing', 'via'];
const MAX = 1048576;

function fail(code) { const e = new Error(code); e.code = code; throw e; }

async function probe(url, fetcher = globalThis.fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  const started = performance.now();
  try {
    const res = await fetcher(url, { redirect: 'manual', signal: controller.signal, headers: { accept: 'application/json' } });
    const firstByteMs = Math.round(performance.now() - started);
    const headers = Object.fromEntries(HEADERS.filter((h) => res.headers.has(h)).map((h) => [h, res.headers.get(h)]));
    const reader = res.body?.getReader();
    const chunks = []; let size = 0;
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX) { controller.abort(); fail('oversize'); }
      chunks.push(value);
    }
    const totalMs = Math.round(performance.now() - started);
    let body = null;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { /* classified below */ }
    return { status: res.status, headers, firstByteMs, totalMs, bytes: size,
      count: Number.isSafeInteger(body?.count) ? body.count : null,
      totalPages: Number.isSafeInteger(body?.total_pages) ? body.total_pages : null };
  } catch (e) {
    return { status: null, error: e.code === 'oversize' ? 'oversize' : (e.name === 'AbortError' ? 'timeout' : 'network_error'),
      totalMs: Math.round(performance.now() - started) };
  } finally { clearTimeout(timer); }
}

function classify(result, reference) {
  if (result.status !== 200 || result.count === null || result.totalPages === null) {
    return { classification: 'unknown', reason: result.error || (result.status === 200 ? 'unparseable_body' : `http_${result.status}`),
      action: 'escalate' };
  }
  if (result.count !== reference.count || result.totalPages !== reference.totalPages) {
    return { classification: 'changed', reason: 'count_or_pages_differ', action: 'run_full_metadata_capture' };
  }
  const validators = ['etag', 'last-modified'].filter((h) => result.headers[h]);
  return { classification: 'no_change_detected', reason: validators.length ? 'counts_equal_validators_recorded' : 'counts_equal_no_validators',
    action: 'none_until_next_cadence',
    caveat: 'Equal counts can hide simultaneous add+remove or field edits; schedule the periodic full capture anyway.' };
}

async function main(args) {
  const o = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--reference', '--output'].includes(args[i]) || o[args[i]] || !args[i + 1]) return usage();
    o[args[i]] = args[i + 1];
  }
  if (!o['--reference'] || !o['--output']) return usage();
  process.umask(0o077);
  try {
    const snapshot = readValidatedSnapshot(o['--reference']);
    assertNewDestination(o['--output']);
    const reference = { observedAt: snapshot.manifest.observedAt, count: snapshot.manifest.count,
      totalPages: snapshot.manifest.totalPages, pageSize: snapshot.manifest.baseline.pages.pageSize };
    if (!Number.isSafeInteger(reference.pageSize) || reference.pageSize < 1 || reference.pageSize > 100) fail('invalid_files');
    const endpoint = endpointFor(reference.pageSize);
    const observedAt = new Date().toISOString();
    const result = await probe(endpoint);
    const verdict = classify(result, reference);
    fs.mkdirSync(o['--output'], { mode: 0o700 });
    fs.writeFileSync(path.join(o['--output'], 'probe.json'), JSON.stringify({ version: 1, observedAt,
      endpoint, reference, result, ...verdict }, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    process.stdout.write(JSON.stringify({ ok: true, ...verdict, count: result.count, referenceCount: reference.count,
      status: result.status, totalMs: result.totalMs, validators: result.headers
        ? ['etag', 'last-modified', 'cache-control', 'age'].filter((h) => result.headers[h]) : [] }) + '\n');
    return verdict.classification === 'unknown' ? 3 : 0;
  } catch (e) {
    process.stdout.write(JSON.stringify({ ok: false, reason: e.code || 'invalid_files' }) + '\n');
    return 1;
  }
}
function usage() { process.stdout.write('{"ok":false,"reason":"invalid_arguments"}\n'); return 1; }

if (require.main === module) main(process.argv.slice(2)).then((code) => { process.exitCode = code; });
module.exports = Object.freeze({ classify });
