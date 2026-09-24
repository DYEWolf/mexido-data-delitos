'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { buildManifest } = require('../src/jal-repd-ced/manifest.cjs');
const { normalizeRecord } = require('../src/jal-repd-ced/normalize.cjs');
const { RECORD_FIELDS } = require('../src/jal-repd-ced/schema.cjs');
const { runAssets, inspectValidatedAssets } = require('../src/jal-repd-ced/assets.cjs');
const { upload, BUCKET, ensureLedgerRoot } = require('../src/jal-repd-ced/private-r2-upload.cjs');
const { parsePreflight, runProcess, makeWrangler } = require('../src/jal-repd-ced/wrangler-r2.cjs');
const jpeg = Buffer.from([255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1, 255, 217]);
function fixture() {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'r2-synthetic-')));
  const baselineDir = path.join(dir, 'baseline'), outputDir = path.join(dir, 'assets');
  fs.mkdirSync(baselineDir, { mode: 0o700 });
  const rows = ['SYN-1', 'SYN-2'].map((id) => {
    const raw = Object.fromEntries(RECORD_FIELDS.map((field) => [field, `synthetic-${field}`]));
    Object.assign(raw, { id_cedula_busqueda: id, ruta_foto: `https://repd.jalisco.gob.mx/${id}.jpg`,
      edad_momento_desaparicion: 22, estatura: null, descripcion_sena_particular: [], descripcion_vestimenta: [] });
    return normalizeRecord(raw);
  });
  const endpoint = 'https://repd.jalisco.gob.mx/api/v1/version_publica/repd-version-publica-cedulas-busqueda/?estado=14';
  const manifest = { ...buildManifest({ response: { count: 2, total_pages: 1 }, normalizedRecords: rows,
    observedAt: '2026-01-01T00:00:00.000Z', sourceEndpoint: endpoint, scope: 'complete_within_scope' }),
    baseline: { assetPolicy: 'skip', pages: { startPage: 1, lastPage: 1, lastDiscoveredPage: 1,
      pageSize: 100, maxPages: null }, duplicateCount: 0, failedPageCount: 0, schemaErrorCount: 0,
      boundsCheck: { checked: true, changed: false, start: { count: 2, totalPages: 1 },
        end: { count: 2, totalPages: 1 } } } };
  const checkpoint = { schemaVersion: '1', sourceId: 'JAL-REPD-CED', nextPage: 2,
    discovered: { count: 2, totalPages: 1 }, completedPages: [1], duplicateCount: 0,
    failedPageCount: 0, schemaErrorCount: 0, dryRun: false };
  for (const [name, data] of Object.entries({ 'manifest.json': manifest, 'checkpoint.json': checkpoint,
    'records.ndjson': rows, 'failed-pages.ndjson': [], 'schema-errors.ndjson': [] })) {
    fs.writeFileSync(path.join(baselineDir, name), name.endsWith('.ndjson')
      ? data.map((x) => JSON.stringify(x)).join('\n') + (data.length ? '\n' : '') : JSON.stringify(data));
  }
  return { dir, baselineDir, outputDir, ledgerDir: path.join(dir, 'ledger') };
}
async function ready(quarantine = true) {
  const f = fixture();
  const responses = [new Response(jpeg, { headers: { 'content-type': 'image/jpeg' } }),
    new Response(quarantine ? Buffer.from('invalid') : Buffer.concat([jpeg.subarray(0, -2), Buffer.from([1, 255, 217])]), { headers: { 'content-type': 'image/jpeg' } })];
  await runAssets({ baselineDir: f.baselineDir, outputDir: f.outputDir, limit: 2,
    fetch: async () => responses.shift(), sleep: async () => {} });
  return f;
}
function mock(initial = new Map()) {
  const objects = initial, calls = { get: 0, put: 0, preflight: 0 };
  return { calls, objects, client: {
    async preflight() { calls.preflight++; return true; },
    async get(key) { calls.get++; return objects.has(key) ? { status: 'found', bytes: objects.get(key), consumed: objects.get(key).length } : { status: 'missing', consumed: 0 }; },
    async put(key, bytes) { calls.put++; objects.set(key, Buffer.from(bytes)); return { ok: true, consumed: bytes.length }; },
  } };
}
function args(f, client, extra = {}) { return { baselineDir: f.baselineDir, outputDir: f.outputDir,
  ledgerDir: f.ledgerDir, limit: 2, client, ...extra }; }

test('inspection filters quarantine and binds cohort with private descriptors', async () => {
  const f = await ready();
  const v = inspectValidatedAssets({ baselineDir: f.baselineDir, outputDir: f.outputDir, limit: 2 });
  assert.equal(v.descriptors.length, 1);
  assert.equal(v.descriptors[0].size, jpeg.length);
  assert.match(v.bindingDigest, /^[a-f0-9]{64}$/);
  assert.equal(v.descriptors[0].sourceId, 'SYN-1');
});
test('first upload verifies GET before and after PUT; replay GETs only', async () => {
  const f = await ready(false), m = mock();
  const first = await upload(args(f, m.client));
  assert.equal(first.verified, 2); assert.equal(first.puts, 2); assert.equal(first.gets, 4);
  const replay = await upload(args(f, m.client, { resume: true }));
  assert.equal(replay.verified, 2); assert.equal(replay.puts, 0); assert.equal(replay.gets, 2);
  assert.equal(fs.statSync(f.ledgerDir).mode & 0o777, 0o700);
  for (const name of ['manifest.json', 'state.json']) assert.equal(fs.statSync(path.join(f.ledgerDir, name)).mode & 0o777, 0o600);
});
test('private preflight log-only root can be initialized once; unexpected artifact refused', async () => {
  const f = await ready(), m = mock();
  fs.mkdirSync(f.ledgerDir, { mode: 0o700 });
  fs.writeFileSync(path.join(f.ledgerDir, 'wrangler.log'), 'synthetic', { mode: 0o600 });
  assert.equal((await upload(args(f, m.client))).verified, 1);
  const g = await ready(), n = mock();
  fs.mkdirSync(g.ledgerDir, { mode: 0o700 });
  fs.writeFileSync(path.join(g.ledgerDir, 'extra'), 'unexpected', { mode: 0o600 });
  await assert.rejects(upload(args(g, n.client)), /invalid_ledger/);
  assert.equal(n.calls.put, 0);
});
function providerCache(dir) {
  fs.mkdirSync(path.join(dir, '.wrangler'), { mode: 0o700 });
  fs.mkdirSync(path.join(dir, '.wrangler', 'cache'), { mode: 0o700 });
  fs.writeFileSync(path.join(dir, '.wrangler', 'cache', 'wrangler-account.json'),
    'synthetic-opaque-cache', { mode: 0o600 });
}
test('new and repeated preflight reuse only the same private root without manifest/state', () => {
  const f = fixture();
  ensureLedgerRoot(f.ledgerDir, 'preflight');
  assert.deepEqual(fs.readdirSync(f.ledgerDir), []);
  fs.writeFileSync(path.join(f.ledgerDir, 'wrangler.log'), 'synthetic', { mode: 0o600 });
  providerCache(f.ledgerDir);
  ensureLedgerRoot(f.ledgerDir, 'preflight');
  assert.equal(fs.existsSync(path.join(f.ledgerDir, 'manifest.json')), false);
  assert.equal(fs.existsSync(path.join(f.ledgerDir, 'state.json')), false);
});
test('provider cache layout permits initial upload and ledger resume; preflight keeps both', async () => {
  const f = await ready(), m = mock();
  ensureLedgerRoot(f.ledgerDir, 'preflight');
  fs.writeFileSync(path.join(f.ledgerDir, 'wrangler.log'), 'synthetic', { mode: 0o600 });
  providerCache(f.ledgerDir);
  assert.equal((await upload(args(f, m.client))).verified, 1);
  ensureLedgerRoot(f.ledgerDir, 'preflight');
  assert.equal((await upload(args(f, m.client, { resume: true }))).puts, 0);
  assert.equal(fs.readdirSync(f.ledgerDir).sort().join(','), '.wrangler,manifest.json,state.json,wrangler.log');
});
test('unknown, symlinked or nonprivate cache and partial ledgers fail closed', () => {
  for (const mutation of [
    (f) => fs.writeFileSync(path.join(f.ledgerDir, 'unknown'), 'x', { mode: 0o600 }),
    (f) => fs.symlinkSync(f.dir, path.join(f.ledgerDir, '.wrangler')),
    (f) => { providerCache(f.ledgerDir); fs.chmodSync(path.join(f.ledgerDir, '.wrangler', 'cache'), 0o755); },
    (f) => { providerCache(f.ledgerDir); fs.symlinkSync(f.dir, path.join(f.ledgerDir, '.wrangler', 'cache', 'extra')); },
    (f) => { providerCache(f.ledgerDir); fs.chmodSync(path.join(f.ledgerDir, '.wrangler', 'cache', 'wrangler-account.json'), 0o644); },
    (f) => fs.writeFileSync(path.join(f.ledgerDir, 'manifest.json'), '{}', { mode: 0o600 }),
  ]) {
    const f = fixture();
    fs.mkdirSync(f.ledgerDir, { mode: 0o700 });
    mutation(f);
    assert.throws(() => ensureLedgerRoot(f.ledgerDir, 'preflight'), /invalid_ledger/);
    assert.throws(() => ensureLedgerRoot(f.ledgerDir, 'initial'), /invalid_ledger/);
  }
});
test('different or uncertain remote content refuses overwrite', async () => {
  for (const result of [{ status: 'found', bytes: Buffer.from('different'), consumed: 9 }, { status: 'uncertain', consumed: 0 }]) {
    const f = await ready(), m = mock(); m.client.get = async () => { m.calls.get++; return result; };
    await assert.rejects(upload(args(f, m.client)), /remote_conflict|remote_uncertain/);
    assert.equal(m.calls.put, 0);
  }
});
test('PUT ambiguity reconciles once without blind retry; resume checks remote', async () => {
  const f = await ready(), m = mock();
  m.client.put = async (key, bytes) => { m.calls.put++; m.objects.set(key, Buffer.from(bytes)); throw Error('synthetic timeout'); };
  await assert.rejects(upload(args(f, m.client)), /put_uncertain/);
  assert.equal(m.calls.put, 1);
  const replay = await upload(args(f, m.client, { resume: true }));
  assert.equal(replay.puts, 0); assert.equal(replay.verified, 1);
});
test('ledger tamper and local mutation fail before remote PUT', async () => {
  const f = await ready(), m = mock();
  await upload(args(f, m.client));
  fs.writeFileSync(path.join(f.ledgerDir, 'state.json'), '{}');
  await assert.rejects(upload(args(f, m.client, { resume: true })), /invalid_ledger/);
  const g = await ready(), n = mock();
  fs.writeFileSync(path.join(g.outputDir, 'images', '0000.jpg'), 'changed');
  await assert.rejects(upload(args(g, n.client)), /invalid_state/);
  assert.equal(n.calls.put, 0);
});
test('missing after an uncertain PUT cannot authorize another PUT', async () => {
  const f = await ready(), m = mock();
  m.client.put = async () => { m.calls.put++; throw Error('synthetic timeout'); };
  await assert.rejects(upload(args(f, m.client)), /put_uncertain/);
  await assert.rejects(upload(args(f, m.client, { resume: true })), /remote_uncertain/);
  assert.equal(m.calls.put, 1);
});
test('truncated, oversized and wrong-hash remote bodies reject without PUT', async () => {
  for (const bytes of [jpeg.subarray(0, -1), Buffer.alloc(2 * 1024 * 1024 + 1),
    Buffer.alloc(jpeg.length)]) {
    const f = await ready(), m = mock();
    m.client.get = async () => ({ status: 'found', bytes, consumed: bytes.length });
    await assert.rejects(upload(args(f, m.client)), /remote_conflict|remote_uncertain/);
    assert.equal(m.calls.put, 0);
  }
});
test('local bytes mutated during remote GET fail on pre-PUT reopening', async () => {
  const f = await ready(), m = mock();
  m.client.get = async () => {
    fs.writeFileSync(path.join(f.outputDir, 'images', '0000.jpg'), 'changed');
    return { status: 'missing', consumed: 0 };
  };
  await assert.rejects(upload(args(f, m.client)), /local_changed/);
  assert.equal(m.calls.put, 0);
});
test('preflight refusal and concurrent lock fail without PUT', async () => {
  const f = await ready(), m = mock();
  m.client.preflight = async () => false;
  await assert.rejects(upload(args(f, m.client)), /unsafe_bucket/);
  assert.equal(m.calls.put, 0);
  fs.writeFileSync(path.join(f.ledgerDir, '.lock'), 'synthetic', { mode: 0o600 });
  await assert.rejects(upload(args(f, m.client, { resume: true })), /invalid_ledger/);
  assert.equal(fs.readFileSync(path.join(f.ledgerDir, '.lock'), 'utf8'), 'synthetic');
});
function missingRenderer(ledgerDir) {
  // Installed Wrangler 4.136.1: esbuild error formatter + console.error newline + log-location notice.
  return Buffer.from('\x1b[31m✘ \x1b[41;31m[\x1b[41;97mERROR\x1b[41;31m]\x1b[0m \x1b[1mThe specified key does not exist.\x1b[0m\n\n\n' +
    `🪵  Logs were written to "${path.join(ledgerDir, 'wrangler.log')}"\n`);
}
function processClient(ledgerDir, response) {
  return makeWrangler(ledgerDir, { run: async () => response });
}
test('installed missing-key rendering treats one control byte as consumed, not object payload', async () => {
  const ledgerDir = '/Users/chris/Documents/seguridad-mexico/s2-assets-r2-89-v1';
  const stderr = missingRenderer(ledgerDir);
  assert.equal(stderr.length, 190);
  const r = await processClient(ledgerDir, { code: 'process_failed', exitCode: 1,
    consumed: 1, stdout: Buffer.from('\n'), stderr }).get(`jal-repd-ced/c05c/${'a'.repeat(64)}/${'b'.repeat(64)}`);
  assert.deepEqual(r, { status: 'missing', consumed: 1, controlBytes: 1 });
});
test('missing classification rejects malformed protocol and never trims found binary bodies', async () => {
  const f = fixture(), stderr = missingRenderer(f.ledgerDir);
  const key = `jal-repd-ced/c05c/${'a'.repeat(64)}/${'b'.repeat(64)}`;
  for (const change of [
    { stdout: Buffer.from('private'), consumed: 7 },
    { stdout: Buffer.from(' '.repeat(64)), consumed: 64 },
    ...['\t', '\r', ' ', '\n\n', '\r\n'].map((bytes) =>
      ({ stdout: Buffer.from(bytes), consumed: Buffer.byteLength(bytes) })),
    { stdout: Buffer.from([0]), consumed: 1 },
    { exitCode: 2 }, { code: 'process_timeout' }, { code: 'process_oversize' },
    { stderr: Buffer.concat([stderr, Buffer.from('unexpected')]) },
    { stderr: Buffer.from('HTTP 403 The specified key does not exist.') },
    { stderr: Buffer.from('HTTP 429 The specified key does not exist.') },
    { stderr: Buffer.from('network failed The specified key does not exist.') },
  ]) {
    const r = { code: 'process_failed', exitCode: 1, consumed: 1,
      stdout: Buffer.from('\n'), stderr, ...change };
    await assert.rejects(processClient(f.ledgerDir, r).get(key), /remote_uncertain/);
  }
  const binary = Buffer.from([0, 10, 32, 255, 13]);
  const found = await processClient(f.ledgerDir, { code: 'ok', exitCode: 0, consumed: binary.length,
    stdout: binary, stderr: Buffer.alloc(0) }).get(key);
  assert.deepEqual(found.bytes, binary);
  const legacy = await processClient(f.ledgerDir, { code: 'process_failed', exitCode: 1,
    consumed: 0, stdout: Buffer.alloc(0), stderr }).get(key);
  assert.deepEqual(legacy, { status: 'missing', consumed: 0, controlBytes: 0 });
});
test('core counts known missing control byte but excludes it from object readBytes', async () => {
  const f = await ready(), m = mock();
  const get = m.client.get;
  m.client.get = async (key) => {
    const r = await get(key);
    return r.status === 'missing' ? { status: 'missing', consumed: 1, controlBytes: 1 } : r;
  };
  const stats = await upload(args(f, m.client));
  assert.equal(stats.puts, 1); assert.equal(stats.gets, 2);
  assert.equal(stats.payloadBytes, jpeg.length * 4 + 1);
  assert.equal(stats.readBytes, jpeg.length);
  const g = await ready(), n = mock();
  n.client.get = async () => ({ status: 'missing', consumed: 2, controlBytes: 1 });
  await assert.rejects(upload(args(g, n.client)), /remote_uncertain/);
  assert.equal(n.calls.put, 0);
});
test('GET reaching the whole-run deadline cannot authorize a PUT', async () => {
  const f = await ready(), m = mock();
  let clock = 1000;
  m.client.get = async () => { m.calls.get++; clock += 900001; return { status: 'missing', consumed: 0 }; };
  await assert.rejects(upload(args(f, m.client, { now: () => clock })), /deadline_exceeded/);
  assert.equal(m.calls.put, 0);
  assert.equal(m.calls.get, 1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.ledgerDir, 'state.json'))).rows[0].phase, 'pending');
});
test('PUT completing after deadline keeps uncertain ledger, no post-PUT GET', async () => {
  const f = await ready(), m = mock();
  let clock = 1000;
  m.client.put = async (key, bytes) => {
    m.calls.put++; m.objects.set(key, Buffer.from(bytes)); clock += 900001;
    return { ok: true, consumed: bytes.length };
  };
  await assert.rejects(upload(args(f, m.client, { now: () => clock })), /deadline_exceeded/);
  assert.equal(m.calls.put, 1); assert.equal(m.calls.get, 1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.ledgerDir, 'state.json'))).rows[0].phase, 'put_inflight');
  const replay = await upload(args(f, m.client, { resume: true, now: () => 1000 }));
  assert.equal(replay.puts, 0); assert.equal(replay.verified, 1);
});
test('post-PUT GET completing late keeps inflight rather than marking verified', async () => {
  const f = await ready(), m = mock();
  let clock = 1000;
  const get = m.client.get;
  m.client.get = async (key) => { const r = await get(key); if (m.calls.get === 2) clock += 900001; return r; };
  await assert.rejects(upload(args(f, m.client, { now: () => clock })), /deadline_exceeded/);
  assert.equal(m.calls.get, 2); assert.equal(m.calls.put, 1);
  assert.equal(m.calls.preflight, 1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.ledgerDir, 'state.json'))).rows[0].phase, 'put_inflight');
});
test('final preflight completing late cannot return ok', async () => {
  const f = await ready(), m = mock(new Map());
  let clock = 1000;
  m.client.get = async () => { m.calls.get++; return { status: 'found', bytes: jpeg, consumed: jpeg.length }; };
  m.client.preflight = async () => { m.calls.preflight++; if (m.calls.preflight === 2) clock += 900001; return true; };
  await assert.rejects(upload(args(f, m.client, { now: () => clock })), /deadline_exceeded/);
  assert.equal(m.calls.get, 1); assert.equal(m.calls.put, 0); assert.equal(m.calls.preflight, 2);
});
test('Wrangler recalculates remaining deadline for every command in a preflight', async () => {
  const f = fixture();
  let clock = 1000;
  const timeouts = [];
  const client = makeWrangler(f.ledgerDir, { now: () => clock, run: async (_bin, _args, options) => {
    timeouts.push(options.timeoutMs);
    clock += timeouts.length === 1 ? 12 : 9;
    return { code: 'ok', stdout: Buffer.from('synthetic'), consumed: 9 };
  } });
  await assert.rejects(client.preflight(BUCKET, 1020), /deadline_exceeded/);
  assert.deepEqual(timeouts, [20, 8]);
});
test('real Wrangler 4.136.1 banner, update, progress and labelled lifecycle parse without weakening policy', () => {
  const banner = (update = '') => {
    const title = ` ⛅️ wrangler 4.136.1${update}`;
    return `\n${title}\n${'─'.repeat(title.length)}\n`;
  };
  const dev = `${banner()}Public access via the r2.dev URL is disabled.\n`;
  const domains = `${banner(' (update available 4.137.0)')}Listing custom domains connected to bucket 'seguridad-jalisco-private'...\nThere are no custom domains connected to this bucket.\n`;
  const lifecycle = `${banner()}Listing lifecycle rules for bucket 'seguridad-jalisco-private'...\nname:     Default Multipart Abort Rule\nenabled:  Yes\nprefix:   (all prefixes)\naction:   Abort incomplete multipart uploads after 7 days\n`;
  assert.equal(parsePreflight(dev, domains, lifecycle), true);
  for (const altered of [
    [dev + 'Public access via the r2.dev URL is disabled.\n', domains, lifecycle],
    [dev + 'mystery line\n', domains, lifecycle],
    [dev.replace('disabled', 'enabled'), domains, lifecycle],
    [dev, domains.replace('seguridad-jalisco-private', 'other-bucket'), lifecycle],
    [dev, domains.replace('There are no custom domains connected to this bucket.', 'example.org'), lifecycle],
    [dev, domains, lifecycle + '\nname: extra\n'],
    [dev, domains, lifecycle.replace('Abort incomplete multipart uploads', 'Expire objects')],
    [dev, domains, lifecycle.replace('after 7 days', 'after 30 days')],
    [dev, domains, lifecycle.replace('enabled:  Yes', 'enabled:  No')],
    [dev, domains, lifecycle.replace('(all prefixes)', 'images/')],
    [dev, domains, lifecycle.replace('Listing lifecycle rules for bucket \'seguridad-jalisco-private\'',
      'Listing lifecycle rules for bucket \'other-bucket\'')],
    [dev, domains, lifecycle.replace('action:', 'unknown:')],
  ]) assert.throws(() => parsePreflight(...altered), /unsafe_bucket/);
});
test('preflight accepts only disabled public exposure and multipart abort', () => {
  const good = ['Public access via the r2.dev URL is disabled.',
    'There are no custom domains connected to this bucket.',
    'Name: Default Multipart Abort Rule\nEnabled: Yes\nPrefix: (all prefixes)\nAction: Abort incomplete multipart uploads after 7 days'];
  assert.equal(parsePreflight(...good), true);
  for (const i of [0, 1, 2]) {
    const bad = [...good]; bad[i] = 'unknown policy';
    assert.throws(() => parsePreflight(...bad), /unsafe_bucket/);
  }
  assert.throws(() => parsePreflight(good[0], good[1], 'Delete objects after 30 days'), /unsafe_bucket/);
});
test('bounded process handles timeout and never forwards raw control output', async () => {
  const r = await runProcess(process.execPath, ['-e', 'process.stdout.write("secret-canary");setInterval(()=>{},1000)'],
    { timeoutMs: 40, maxBytes: 100, env: process.env });
  assert.equal(r.code, 'process_timeout');
  assert.equal(JSON.stringify(r).includes('secret-canary'), false);
});
test('bounded process terminates a synthetic descendant on oversize', async () => {
  const r = await runProcess(process.execPath, ['-e',
    'require("node:child_process").spawn(process.execPath,["-e","setInterval(()=>{},1000)"],{stdio:"ignore"});process.stdout.write("x".repeat(256));setInterval(()=>{},1000)'],
  { timeoutMs: 200, maxBytes: 64 });
  assert.equal(r.code, 'process_oversize');
  assert.equal(r.stdout.length, 0);
});
test('CLI emits stable reason only on bad invocation', () => {
  const cli = path.resolve(__dirname, '../scripts/jal-repd-ced-private-r2.cjs');
  const r = spawnSync(process.execPath, [cli, '--bad', 'secret-canary'], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.equal(r.stderr, '');
  assert.equal(r.stdout, '{"ok":false,"reason":"invalid_arguments"}\n');
});
