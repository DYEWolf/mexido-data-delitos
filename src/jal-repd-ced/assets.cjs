'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { readValidatedSnapshot } = require('./compare-baselines.cjs');
const { fetchImage, validUrl, signature, MAX_BODY } = require('./asset-http-client.cjs');
const { assertPrivateDestination, assertNewDestination } = require('../private-output.cjs');

const MAX_TOTAL = 64 * 1024 * 1024;
const NAMES = ['manifest.json', 'checkpoint.json', 'records.ndjson', 'failed-pages.ndjson', 'schema-errors.ndjson'];
function fail(code) { const error = new Error(code); error.code = code; throw error; }
function hash(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function safeFile(file, max = 1048576) {
  try {
    const s = fs.lstatSync(file);
    if (!s.isFile() || (s.mode & 0o077) || s.size > max) fail('invalid_state');
    return fs.readFileSync(file);
  } catch { fail('invalid_state'); }
}
function save(file, data, initial = false) {
  const bytes = Buffer.from(JSON.stringify(data) + '\n');
  const temp = path.join(path.dirname(file), `.state-${crypto.randomBytes(12).toString('hex')}`);
  let fd;
  try {
    if (!initial) safeFile(file);
    fd = fs.openSync(temp, 'wx', 0o600);
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
    fs.closeSync(fd); fd = undefined;
    fs.renameSync(temp, file);
  } catch { fail('invalid_state'); }
  finally { if (fd !== undefined) fs.closeSync(fd); }
}
function strictDir(dir, names) {
  try {
    const s = fs.lstatSync(dir);
    if (!s.isDirectory() || (s.mode & 0o077) || fs.realpathSync(dir) !== dir ||
      fs.readdirSync(dir).sort().join('\0') !== [...names].sort().join('\0')) fail('invalid_state');
  } catch { fail('invalid_state'); }
}
function source(baselineDir, limit) {
  // The comparator checks complete scope, page coverage, normalized record identity and every record hash.
  const snapshot = readValidatedSnapshot(baselineDir);
  if (snapshot.manifest.sourceId !== 'JAL-REPD-CED') fail('invalid_source');
  const dir = fs.realpathSync(baselineDir);
  const baselineDigest = hash(Buffer.concat(NAMES.map((name) => {
    const bytes = fs.readFileSync(path.join(dir, name));
    return Buffer.concat([Buffer.from(`${name}:${bytes.length}:`), bytes]);
  })));
  const usable = snapshot.records.filter((row) => typeof row.internalRecord.ruta_foto === 'string' &&
    row.internalRecord.ruta_foto.trim() !== '');
  usable.sort((a, b) => a.sourceId < b.sourceId ? -1 : a.sourceId > b.sourceId ? 1 : 0);
  const selected = usable.slice(0, limit).map((row) => ({ source: row.source,
    sourceId: row.sourceId, reference: row.internalRecord.ruta_foto }));
  return { version: 1, source: 'JAL-REPD-CED', baselineDigest, observedAt: snapshot.manifest.observedAt,
    normalizationVersion: snapshot.records[0].normalizationVersion, limit,
    metadataTotal: snapshot.records.length, usableReferences: usable.length,
    missingReferences: snapshot.records.length - usable.length, unselected: usable.length - selected.length,
    selected };
}
function validateState(outputDir, frozen) {
  strictDir(outputDir, ['manifest.json', 'state.json', 'images']);
  let manifest, s;
  try {
    manifest = JSON.parse(safeFile(path.join(outputDir, 'manifest.json')).toString());
    s = JSON.parse(safeFile(path.join(outputDir, 'state.json')).toString());
  } catch { fail('invalid_state'); }
  if (JSON.stringify(manifest) !== JSON.stringify(frozen)) fail('invalid_state');
  if (s.version !== 1 || s.baselineDigest !== frozen.baselineDigest ||
    !Array.isArray(s.selected) || s.selected.length !== frozen.selected.length || s.inFlight ||
    !Number.isSafeInteger(s.bodyBytes) || s.bodyBytes < 0 || s.bodyBytes > MAX_TOTAL ||
    !Number.isSafeInteger(s.attempts) || s.attempts < 0 ||
    (s.lastStart !== null && (!Number.isSafeInteger(s.lastStart) || s.lastStart < 0))) fail('invalid_state');
  let attempts = 0, bytes = 0;
  const cached = [];
  s.selected.forEach((row, i) => {
    if (row.sourceId !== frozen.selected[i].sourceId || row.reference !== frozen.selected[i].reference ||
      !['pending', 'validated', 'quarantined', 'failed'].includes(row.status) ||
      !Number.isSafeInteger(row.attempts) || row.attempts < 0 || row.attempts > 2 ||
      !Number.isSafeInteger(row.bytes) || row.bytes < 0 || row.bytes > row.attempts * MAX_BODY + row.attempts ||
      (row.status === 'pending' && row.attempts > 1) ||
      (row.status !== 'validated' && (row.file !== null || row.sha256 !== null || row.mime !== null)) ||
      (row.status === 'validated' && (row.attempts < 1 || !/^[a-f\d]{64}$/.test(row.sha256 || '') ||
        !['image/jpeg', 'image/png'].includes(row.mime)))) fail('invalid_state');
    attempts += row.attempts; bytes += row.bytes;
    if (row.status === 'validated') {
      const expected = `${String(i).padStart(4, '0')}.${row.mime === 'image/jpeg' ? 'jpg' : 'png'}`;
      if (row.file !== expected) fail('invalid_state');
      cached.push(expected);
      const content = safeFile(path.join(outputDir, 'images', expected), MAX_BODY);
      if (hash(content) !== row.sha256 || !signature(content, row.mime)) fail('invalid_state');
    }
  });
  if (attempts !== s.attempts || bytes !== s.bodyBytes) fail('invalid_state');
  strictDir(path.join(outputDir, 'images'), cached);
  return s;
}
function result(s, frozen) {
  const counts = Object.fromEntries(['pending', 'validated', 'quarantined', 'failed'].map((status) =>
    [status, s.selected.filter((row) => row.status === status).length]));
  return { ok: counts.pending === 0 && counts.failed === 0 && !s.stopCode,
    metadataTotal: frozen.metadataTotal, usableReferences: frozen.usableReferences,
    missingReferences: frozen.missingReferences, unselected: frozen.unselected,
    selected: s.selected.length, ...counts, attempts: s.attempts, bodyBytes: s.bodyBytes,
    stopCode: s.stopCode };
}
function prepare({ baselineDir, outputDir, limit, resume }) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) fail('invalid_arguments');
  assertPrivateDestination(outputDir);
  if (fs.statSync(path.dirname(outputDir)).uid !== process.getuid()) fail('private_parent_required');
  const frozen = source(baselineDir, limit);
  if (resume) return { frozen, s: validateState(outputDir, frozen) };
  assertNewDestination(outputDir);
  fs.mkdirSync(outputDir, { mode: 0o700 });
  fs.mkdirSync(path.join(outputDir, 'images'), { mode: 0o700 });
  const fd = fs.openSync(path.join(outputDir, 'manifest.json'), 'wx', 0o600);
  try { fs.writeFileSync(fd, JSON.stringify(frozen) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  const s = { version: 1, baselineDigest: frozen.baselineDigest, inFlight: false,
    lastStart: null, stopCode: null, bodyBytes: 0, attempts: 0,
    selected: frozen.selected.map((row) => ({ sourceId: row.sourceId, reference: row.reference,
      status: 'pending', attempts: 0, bytes: 0, file: null, sha256: null, mime: null, reason: null })) };
  save(path.join(outputDir, 'state.json'), s, true);
  return { frozen, s };
}
function verifyAssets({ baselineDir, outputDir, limit = 100 } = {}) {
  const { frozen, s } = prepare({ baselineDir, outputDir, limit, resume: true });
  return result(s, frozen);
}
function inspectValidatedAssets({ baselineDir, outputDir, limit = 100 } = {}) {
  const { frozen, s } = prepare({ baselineDir, outputDir, limit, resume: true });
  if (!result(s, frozen).ok) fail('invalid_state');
  const descriptors = s.selected.flatMap((row, index) => row.status === 'validated'
    ? [{ index, sourceId: row.sourceId, reference: row.reference, file: row.file,
      sha256: row.sha256, mime: row.mime,
      size: fs.lstatSync(path.join(outputDir, 'images', row.file)).size }] : []);
  return { baselineDigest: frozen.baselineDigest,
    bindingDigest: hash(Buffer.from(JSON.stringify({ frozen, selected: s.selected, descriptors }))), descriptors };
}
async function runAssets({ baselineDir, outputDir, limit = 100, resume = false, fetch = globalThis.fetch,
  now = Date.now, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  timeoutMs = 20000, maxTotalBytes = MAX_TOTAL, deadlineMs = 600000 } = {}) {
  if (typeof fetch !== 'function' || typeof now !== 'function' || typeof sleep !== 'function' ||
    !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 20000 ||
    !Number.isSafeInteger(maxTotalBytes) || maxTotalBytes < MAX_BODY || maxTotalBytes > MAX_TOTAL ||
    !Number.isSafeInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > 600000) fail('invalid_arguments');
  const { frozen, s } = prepare({ baselineDir, outputDir, limit, resume });
  // A completed replay validates all cached bytes, selection and baseline without any request/write.
  if (!s.selected.some((row) => row.status === 'pending') || s.stopCode) return result(s, frozen);
  const stateFile = path.join(outputDir, 'state.json');
  const end = now() + deadlineMs;
  let consecutive = 0;
  for (let i = 0; i < s.selected.length; i++) {
    const row = s.selected[i];
    if (row.status !== 'pending') continue;
    if (!validUrl(row.reference)) {
      row.status = 'quarantined'; row.reason = 'invalid_reference'; save(stateFile, s); continue;
    }
    while (row.attempts < 2 && row.status === 'pending') {
      const wait = s.lastStart === null ? 0 : Math.max(0, 1000 - (now() - s.lastStart));
      if (now() + wait >= end || s.bodyBytes + MAX_BODY > maxTotalBytes) {
        s.stopCode = now() + wait >= end ? 'deadline_exceeded' : 'byte_budget_exceeded';
        save(stateFile, s); return result(s, frozen);
      }
      if (wait) await sleep(wait);
      if (now() >= end) { s.stopCode = 'deadline_exceeded'; save(stateFile, s); return result(s, frozen); }
      // Reserve a full attempt before the request. An interrupted attempt cannot reset the ledger.
      row.attempts++; s.attempts++; row.bytes += MAX_BODY; s.bodyBytes += MAX_BODY;
      s.inFlight = true; s.lastStart = now(); save(stateFile, s);
      const fetched = await fetchImage(row.reference, { fetcher: fetch, timeoutMs: Math.min(timeoutMs, end - now()) });
      if (fetched.consumed > MAX_BODY) {
        // A stream delivered more than the reserved maximum in one chunk: never continue this cohort.
        row.bytes += fetched.consumed - MAX_BODY; s.bodyBytes += fetched.consumed - MAX_BODY;
      } else {
        row.bytes -= MAX_BODY - fetched.consumed; s.bodyBytes -= MAX_BODY - fetched.consumed;
      }
      s.inFlight = false;
      if (s.bodyBytes > maxTotalBytes) {
        row.status = 'failed'; row.reason = 'byte_budget_exceeded'; s.stopCode = 'byte_budget_exceeded';
      } else if (fetched.code === 'validated') {
        const name = `${String(i).padStart(4, '0')}.${fetched.ext}`;
        const fd = fs.openSync(path.join(outputDir, 'images', name), 'wx', 0o600);
        try { fs.writeFileSync(fd, fetched.bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
        row.file = name; row.sha256 = hash(fetched.bytes); row.mime = fetched.mime;
        row.status = 'validated'; row.reason = null; consecutive = 0;
      } else if (fetched.code === 'source_stop') {
        row.status = 'failed'; row.reason = 'source_stop'; s.stopCode = 'source_stop';
      } else if (['network_failed', 'request_timeout', 'http_transient'].includes(fetched.code)) {
        if (row.attempts === 2) { row.status = 'failed'; row.reason = fetched.code; consecutive++; }
      } else {
        row.status = 'quarantined'; row.reason = fetched.code; consecutive = 0;
      }
      if (consecutive >= 3) s.stopCode = 'transport_stop';
      save(stateFile, s);
      if (s.stopCode) return result(s, frozen);
    }
  }
  return result(s, frozen);
}
module.exports = Object.freeze({ runAssets, verifyAssets, inspectValidatedAssets });
