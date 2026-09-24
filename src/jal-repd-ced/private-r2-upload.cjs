'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { inspectValidatedAssets } = require('./assets.cjs');
const { assertPrivateDestination, assertNewDestination } = require('../private-output.cjs');

const BUCKET = 'seguridad-jalisco-private';
const MAX_BODY = 2 * 1024 * 1024;
const MAX_TOTAL = 64 * 1024 * 1024;
const MAX_RUN_MS = 900000;
function fail(code) { const e = new Error(code); e.code = code; throw e; }
function sha(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function encoded(value) { return Buffer.from(JSON.stringify(value) + '\n'); }
function privateFile(file, max = 1048576) {
  try {
    const s = fs.lstatSync(file);
    if (!s.isFile() || (s.mode & 0o077) || s.size > max) fail('invalid_ledger');
    return fs.readFileSync(file);
  } catch { fail('invalid_ledger'); }
}
function writeNew(file, bytes) {
  const fd = fs.openSync(file, 'wx', 0o600);
  try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function writeState(dir, state, initial = false) {
  const file = path.join(dir, 'state.json');
  if (initial) { writeNew(file, encoded(state)); return; }
  privateFile(file);
  const temp = path.join(dir, `.state-${crypto.randomBytes(12).toString('hex')}`);
  writeNew(temp, encoded(state));
  fs.renameSync(temp, file);
}
function checkDirectory(dir, expected) {
  try {
    const s = fs.lstatSync(dir);
    if (!s.isDirectory() || s.uid !== process.getuid() || (s.mode & 0o777) !== 0o700 ||
      fs.realpathSync(dir) !== dir ||
      fs.readdirSync(dir).sort().join('\0') !== [...expected].sort().join('\0')) fail('invalid_ledger');
  } catch { fail('invalid_ledger'); }
}
function checkMetadataFile(file, max) {
  try {
    const s = fs.lstatSync(file);
    if (!s.isFile() || s.uid !== process.getuid() || (s.mode & 0o777) !== 0o600 || s.size > max) fail('invalid_ledger');
  } catch { fail('invalid_ledger'); }
}
// Only Wrangler's observed account-cache shape is permitted; never open its payload.
function ensureLedgerRoot(dir, mode) {
  if (!['preflight', 'initial', 'resume'].includes(mode)) fail('invalid_arguments');
  assertPrivateDestination(dir);
  if (fs.statSync(path.dirname(dir)).uid !== process.getuid()) fail('private_parent_required');
  if (!fs.existsSync(dir)) {
    if (mode === 'resume') fail('invalid_ledger');
    assertNewDestination(dir);
    fs.mkdirSync(dir, { mode: 0o700 });
  }
  const root = fs.lstatSync(dir);
  if (!root.isDirectory() || root.uid !== process.getuid() ||
    (root.mode & 0o777) !== 0o700 || fs.realpathSync(dir) !== dir) fail('invalid_ledger');
  const entries = fs.readdirSync(dir);
  const has = (name) => entries.includes(name);
  const ledger = has('manifest.json') && has('state.json');
  if (has('manifest.json') !== has('state.json') ||
    (mode === 'initial' && ledger) || (mode === 'resume' && !ledger)) fail('invalid_ledger');
  checkDirectory(dir, [...(ledger ? ['manifest.json', 'state.json'] : []),
    ...(has('wrangler.log') ? ['wrangler.log'] : []), ...(has('.wrangler') ? ['.wrangler'] : [])]);
  if (has('wrangler.log')) checkMetadataFile(path.join(dir, 'wrangler.log'), 64 * 1024 * 1024);
  if (ledger) for (const name of ['manifest.json', 'state.json']) {
    checkMetadataFile(path.join(dir, name), 1048576);
  }
  if (has('.wrangler')) {
    const provider = path.join(dir, '.wrangler');
    checkDirectory(provider, ['cache']);
    const cache = path.join(provider, 'cache');
    const account = 'wrangler-account.json';
    const cacheStat = fs.lstatSync(cache);
    if (!cacheStat.isDirectory() || cacheStat.uid !== process.getuid() ||
      (cacheStat.mode & 0o777) !== 0o700 || fs.realpathSync(cache) !== cache) fail('invalid_ledger');
    const names = fs.readdirSync(cache);
    checkDirectory(cache, names.includes(account) ? [account] : []);
    if (names.includes(account)) checkMetadataFile(path.join(cache, account), 1048576);
  }
  return dir;
}
function frozen(inspection, sample) {
  const namespace = `jal-repd-ced/c05c/${inspection.bindingDigest}`;
  const descriptors = inspection.descriptors.map((d) => ({ ...d,
    key: `${namespace}/${sha(Buffer.from(`${inspection.bindingDigest}:${d.index}:${d.sha256}`))}` }));
  if (descriptors.length < 1 || descriptors.length > 89 || new Set(descriptors.map((d) => d.sha256)).size !== descriptors.length ||
    descriptors.some((d) => !Number.isSafeInteger(d.size) || d.size < 1 || d.size > MAX_BODY ||
      !/^[a-f0-9]{64}$/.test(d.sha256) || !['image/jpeg', 'image/png'].includes(d.mime) ||
      !/^\d{4}\.(jpg|png)$/.test(d.file))) fail('invalid_selection');
  // A sample keeps the same keys as the full run, so a later full run reuses what the sample uploaded.
  if (sample === undefined) return { version: 1, bucket: BUCKET, namespace, baselineDigest: inspection.baselineDigest,
    bindingDigest: inspection.bindingDigest, descriptors };
  if (!Number.isSafeInteger(sample) || sample < 1 || sample > descriptors.length) fail('invalid_arguments');
  return { version: 1, bucket: BUCKET, namespace, baselineDigest: inspection.baselineDigest,
    bindingDigest: inspection.bindingDigest, sample, descriptors: descriptors.slice(0, sample) };
}
function validateState(state, manifest) {
  if (state.version !== 1 || state.manifestDigest !== sha(encoded(manifest)) ||
    !Array.isArray(state.rows) || state.rows.length !== manifest.descriptors.length ||
    state.rows.some((row, i) => row.key !== manifest.descriptors[i].key ||
      !['pending', 'put_inflight', 'verified'].includes(row.phase))) fail('invalid_ledger');
}
function readLocal(outputDir, d) {
  const file = path.join(outputDir, 'images', d.file);
  let fd;
  try {
    fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    const s = fs.fstatSync(fd);
    if (!s.isFile() || (s.mode & 0o077) || s.size !== d.size || s.size > MAX_BODY) fail('local_changed');
    const bytes = Buffer.alloc(s.size);
    let position = 0;
    while (position < bytes.length) {
      const n = fs.readSync(fd, bytes, position, bytes.length - position, position);
      if (!n) fail('local_changed');
      position += n;
    }
    if (sha(bytes) !== d.sha256 || fs.fstatSync(fd).size !== s.size) fail('local_changed');
    return bytes;
  } catch { fail('local_changed'); }
  finally { if (fd !== undefined) fs.closeSync(fd); }
}
async function upload({ baselineDir, outputDir, ledgerDir, limit = 100, sample, client, resume = false,
  now = Date.now } = {}) {
  if (!client || typeof client.preflight !== 'function' || typeof client.get !== 'function' ||
    typeof client.put !== 'function' || typeof resume !== 'boolean' || typeof now !== 'function') fail('invalid_arguments');
  const previousUmask = process.umask(0o077);
  const started = now();
  let lock, lockIno;
  try {
    const manifest = frozen(inspectValidatedAssets({ baselineDir, outputDir, limit }), sample);
    ensureLedgerRoot(ledgerDir, resume ? 'resume' : 'initial');
    if (!resume) {
      writeNew(path.join(ledgerDir, 'manifest.json'), encoded(manifest));
      writeState(ledgerDir, { version: 1, manifestDigest: sha(encoded(manifest)),
        rows: manifest.descriptors.map((d) => ({ key: d.key, phase: 'pending' })) }, true);
    }
    // Never remove somebody else's lock or accept unexpected artifacts on resume.
    ensureLedgerRoot(ledgerDir, 'resume');
    lock = path.join(ledgerDir, '.lock');
    writeNew(lock, Buffer.from(String(process.pid)));
    lockIno = fs.lstatSync(lock).ino;
    if (!privateFile(path.join(ledgerDir, 'manifest.json')).equals(encoded(manifest))) fail('invalid_ledger');
    const state = JSON.parse(privateFile(path.join(ledgerDir, 'state.json')).toString());
    validateState(state, manifest);
    const stats = { ok: false, selected: manifest.descriptors.length, verified: 0,
      puts: 0, gets: 0, reused: 0, verifiedBytes: 0, readBytes: 0, putBytes: 0,
      payloadBytes: 0, preflights: 0, bucket: BUCKET };
    const deadline = started + MAX_RUN_MS;
    if (!Number.isSafeInteger(deadline)) fail('invalid_arguments');
    function account(bytes) {
      if (!Number.isSafeInteger(bytes) || bytes < 0) fail('byte_budget_exceeded');
      stats.payloadBytes += bytes;
      if (stats.payloadBytes > MAX_TOTAL) fail('byte_budget_exceeded');
    }
    function time() { if (now() >= deadline) fail('deadline_exceeded'); }
    async function preflight() {
      time(); stats.preflights++;
      const safe = await client.preflight(BUCKET, deadline);
      time();
      if (safe !== true) fail('unsafe_bucket');
    }
    async function get(d) {
      time();
      if (stats.payloadBytes + MAX_BODY > MAX_TOTAL) fail('byte_budget_exceeded');
      stats.gets++;
      let result;
      try { result = await client.get(d.key, deadline); }
      catch (e) { account(e?.consumed ?? 0); time(); fail('remote_uncertain'); }
      account(result?.consumed ?? 0);
      time();
      const control = result?.controlBytes ?? 0;
      if (!Number.isSafeInteger(result?.consumed) || !Number.isSafeInteger(control) ||
        control < 0 || control > 1 || control > result.consumed) fail('remote_uncertain');
      stats.readBytes += result.consumed - control;
      if (result.status === 'missing' && control === result.consumed &&
        result.consumed <= 1 && result.bytes === undefined) return 'missing';
      if (result.status !== 'found' || control !== 0 || !Buffer.isBuffer(result.bytes) ||
        result.bytes.length !== result.consumed || result.bytes.length > MAX_BODY) fail('remote_uncertain');
      if (result.bytes.length !== d.size || sha(result.bytes) !== d.sha256) fail('remote_conflict');
      return 'same';
    }
    await preflight();
    for (let i = 0; i < manifest.descriptors.length; i++) {
      const d = manifest.descriptors[i], row = state.rows[i];
      time();
      const bytes = readLocal(outputDir, d);
      account(bytes.length);
      time();
      const remote = await get(d);
      if (remote === 'missing' && row.phase !== 'pending') fail('remote_uncertain');
      if (remote === 'missing') {
        // A committed transition precedes the only authorized PUT. An interrupted PUT is GET-reconciled,
        // never blindly retried, even when subsequent GET reports missing.
        row.phase = 'put_inflight'; writeState(ledgerDir, state);
        const verifiedBuffer = readLocal(outputDir, d);
        account(verifiedBuffer.length);
        if (stats.payloadBytes + verifiedBuffer.length > MAX_TOTAL) fail('byte_budget_exceeded');
        time();
        stats.puts++;
        let put;
        try { put = await client.put(d.key, verifiedBuffer, d.mime, deadline); }
        catch (e) { account(e?.consumed ?? 0); time(); fail('put_uncertain'); }
        account(put?.consumed ?? verifiedBuffer.length);
        stats.putBytes += put?.consumed ?? verifiedBuffer.length;
        time();
        if (put?.ok !== true) fail('put_uncertain');
        if (await get(d) !== 'same') fail('remote_uncertain');
      } else stats.reused++;
      time();
      row.phase = 'verified'; writeState(ledgerDir, state);
      time();
      stats.verified++; stats.verifiedBytes += d.size;
    }
    await preflight();
    time();
    stats.ok = true;
    return stats;
  } finally {
    if (lock && lockIno !== undefined) {
      try { if (fs.lstatSync(lock).ino === lockIno) fs.unlinkSync(lock); } catch { /* Retain evidence if lock changed. */ }
    }
    process.umask(previousUmask);
  }
}
module.exports = Object.freeze({ upload, ensureLedgerRoot, BUCKET, MAX_BODY, MAX_TOTAL, MAX_RUN_MS });
