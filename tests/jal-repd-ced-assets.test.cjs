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
const { runAssets, verifyAssets } = require('../src/jal-repd-ced/assets.cjs');

const origin = 'https://repd.jalisco.gob.mx';
const endpoint = `${origin}/api/v1/version_publica/repd-version-publica-cedulas-busqueda/?estado=14`;
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 0xff, 0xd9]);
// Synthetic header and terminal marker only; test does not assert PNG decoding or CRC validity.
const png = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000000000000000000049454e4400000000', 'hex');
function root() { return fs.realpathSync(fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'asset-synthetic-'))); }
function record(id, url = `${origin}/synthetic.jpg`) {
  const raw = Object.fromEntries(RECORD_FIELDS.map((field) => [field, `synthetic-${field}`]));
  Object.assign(raw, { id_cedula_busqueda: id, ruta_foto: url, edad_momento_desaparicion: 22,
    estatura: null, descripcion_sena_particular: [], descripcion_vestimenta: [] });
  return normalizeRecord(raw);
}
function fixture(ids = ['SYN-2', 'SYN-1'], urls = {}) {
  const dir = root();
  const baselineDir = path.join(dir, 'baseline');
  fs.mkdirSync(baselineDir, { mode: 0o700 });
  const rows = ids.map((id) => record(id, Object.hasOwn(urls, id) ? urls[id] : `${origin}/${id}.jpg`));
  const manifest = { ...buildManifest({ response: { count: rows.length, total_pages: 1 },
    normalizedRecords: rows, observedAt: '2026-01-01T00:00:00.000Z', sourceEndpoint: endpoint,
    scope: 'complete_within_scope' }), baseline: { assetPolicy: 'skip', pages: { startPage: 1,
    lastPage: 1, lastDiscoveredPage: 1, pageSize: 100, maxPages: null }, duplicateCount: 0,
    failedPageCount: 0, schemaErrorCount: 0, boundsCheck: { checked: true, changed: false,
      start: { count: rows.length, totalPages: 1 }, end: { count: rows.length, totalPages: 1 } } } };
  const checkpoint = { schemaVersion: '1', sourceId: 'JAL-REPD-CED', nextPage: 2,
    discovered: { count: rows.length, totalPages: 1 }, completedPages: [1], duplicateCount: 0,
    failedPageCount: 0, schemaErrorCount: 0, dryRun: false };
  for (const [name, value] of Object.entries({ 'manifest.json': manifest, 'checkpoint.json': checkpoint,
    'records.ndjson': rows, 'failed-pages.ndjson': [], 'schema-errors.ndjson': [] })) {
    fs.writeFileSync(path.join(baselineDir, name), name.endsWith('.ndjson')
      ? value.map((entry) => JSON.stringify(entry)).join('\n') + (value.length ? '\n' : '') : JSON.stringify(value));
  }
  return { dir, baselineDir, outputDir: path.join(dir, 'output') };
}
function response(bytes = jpeg, status = 200, type = 'image/jpeg', headers = {}) {
  return new Response(bytes, { status, headers: { 'content-type': type, ...headers } });
}
function client(responses, starts = []) {
  return async (url, options) => {
    starts.push({ url, options });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    return typeof next === 'function' ? next() : next;
  };
}
function options(f, responses, starts = [], extra = {}) {
  return { baselineDir: f.baselineDir, outputDir: f.outputDir, fetch: client(responses, starts),
    sleep: async () => {}, ...extra };
}
function state(f) { return JSON.parse(fs.readFileSync(path.join(f.outputDir, 'state.json'), 'utf8')); }

test('textual stable selection, limit, metadata denominators and completed offline replay', async () => {
  const f = fixture(['SYN-2', 'SYN-10', 'SYN-1', 'SYN-3'], { 'SYN-3': null });
  const starts = [];
  const result = await runAssets(options(f, [response(), response(png, 200, 'image/png')], starts, { limit: 2 }));
  assert.equal(result.selected, 2);
  assert.equal(result.metadataTotal, 4);
  assert.equal(result.missingReferences, 1);
  assert.equal(result.unselected, 1);
  assert.equal(result.validated, 2);
  assert.equal(result.bodyBytes, jpeg.length + png.length);
  assert.deepEqual(state(f).selected.map((row) => row.sourceId), ['SYN-1', 'SYN-10']);
  assert.equal(starts.length, 2);
  const replay = await runAssets(options(f, [], [], { limit: 2, resume: true,
    fetch: () => { throw Error('network on replay'); } }));
  assert.deepEqual(replay, result);
  assert.equal(verifyAssets({ baselineDir: f.baselineDir, outputDir: f.outputDir, limit: 2 }).validated, 2);
  assert.equal(fs.statSync(f.outputDir).mode & 0o777, 0o700);
  assert.equal(fs.statSync(path.join(f.outputDir, 'state.json')).mode & 0o777, 0o600);
});

test('rejects altered baseline before output or resume; never coerces raw identity', async () => {
  const f = fixture(['SYN-1']);
  const file = path.join(f.baselineDir, 'records.ndjson');
  const row = JSON.parse(fs.readFileSync(file, 'utf8'));
  row.internalRecord.id_cedula_busqueda = 1;
  fs.writeFileSync(file, JSON.stringify(row) + '\n');
  await assert.rejects(runAssets(options(f, [])), /invalid_records/);
  assert.equal(fs.existsSync(f.outputDir), false);
  const g = fixture(['SYN-1']);
  await runAssets(options(g, [response()]));
  const baselineManifest = path.join(g.baselineDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(baselineManifest));
  manifest.observedAt = '2026-02-01T00:00:00.000Z';
  fs.writeFileSync(baselineManifest, JSON.stringify(manifest));
  await assert.rejects(runAssets(options(g, [], [], { resume: true })), /invalid_state/);
});

test('rejects invalid origins, userinfo, ports and redirects without following or leaking URL', async () => {
  for (const url of ['http://repd.jalisco.gob.mx/a.jpg', 'https://outside.invalid/a.jpg',
    'https://user:password@repd.jalisco.gob.mx/a.jpg', 'https://repd.jalisco.gob.mx:8443/a.jpg']) {
    const f = fixture(['SYN-1'], { 'SYN-1': url });
    const starts = [];
    const result = await runAssets(options(f, [], starts));
    assert.equal(starts.length, 0);
    assert.equal(result.quarantined, 1);
    assert.equal(JSON.stringify(result).includes(url), false);
  }
  const f = fixture(['SYN-1']);
  const starts = [];
  const result = await runAssets(options(f, [response(null, 302, 'text/plain')], starts));
  assert.equal(starts.length, 1);
  assert.equal(starts[0].options.redirect, 'manual');
  assert.equal(result.quarantined, 1);
  assert.equal(result.attempts, 1);
});

test('auth and rate limiting stop cohort; transient failures have two attempts only', async () => {
  for (const status of [401, 403, 429]) {
    const f = fixture();
    const starts = [];
    const result = await runAssets(options(f, [response(null, status)], starts));
    assert.equal(result.attempts, 1);
    assert.equal(result.pending, 1);
    assert.equal(result.failed, 1);
    assert.equal(result.stopCode, 'source_stop');
  }
  const f = fixture(['SYN-1']);
  const result = await runAssets(options(f, [response(null, 503), response()], [], { limit: 1 }));
  assert.equal(result.attempts, 2);
  assert.equal(result.validated, 1);
  assert.equal((await runAssets(options(f, [], [], { limit: 1, resume: true }))).attempts, 2);
});

test('rejects MIME, magic, empty, truncated and oversize bodies with reason-only quarantine', async () => {
  const cases = [response(jpeg, 200, 'text/html'), response(Buffer.alloc(0)),
    response(Buffer.from([0xff, 0xd8, 0xff])), response(Buffer.from('wrong')),
    response(jpeg, 200, 'image/jpeg', { 'content-length': String(3 * 1024 * 1024) }),
    response(Buffer.alloc(2 * 1024 * 1024 + 1))];
  for (const next of cases) {
    const f = fixture(['SYN-1']);
    const result = await runAssets(options(f, [next]));
    assert.equal(result.quarantined, 1);
    assert.equal(result.validated, 0);
    assert.equal(result.attempts, 1);
  }
});

test('timeout covers never-ending body, consumed bytes and retries remain bounded', async () => {
  const f = fixture(['SYN-1']);
  const never = () => new Response(new ReadableStream({ pull() { return new Promise(() => {}); } }),
    { headers: { 'content-type': 'image/jpeg' } });
  const result = await runAssets(options(f, [never, never], [], { timeoutMs: 25 }));
  assert.equal(result.attempts, 2);
  assert.equal(result.failed, 1);
  const g = fixture(['SYN-1']);
  const oversized = response(Buffer.alloc(2 * 1024 * 1024 + 1));
  const bounded = await runAssets(options(g, [oversized], [], { maxTotalBytes: 2 * 1024 * 1024 }));
  // A synthetic oversized single stream chunk is counted honestly, then stops the cohort.
  assert.equal(bounded.bodyBytes, 2 * 1024 * 1024 + 1);
  assert.equal(bounded.stopCode, 'byte_budget_exceeded');
  assert.equal(bounded.failed, 1);
});

test('interrupted retry preserves attempt ledger and at most one remaining request', async () => {
  const f = fixture(['SYN-1']);
  let calls = 0;
  await assert.rejects(runAssets(options(f, [response(null, 503)], [], {
    sleep: async () => { throw Error('synthetic interruption'); },
    fetch: async () => { calls++; return response(null, 503); },
  })), /synthetic interruption/);
  assert.equal(calls, 1);
  assert.equal(state(f).selected[0].attempts, 1);
  const starts = [];
  const done = await runAssets(options(f, [response()], starts, { resume: true }));
  assert.equal(done.attempts, 2);
  assert.equal(done.validated, 1);
  assert.equal(starts.length, 1);
});

test('CLI emits safe aggregate or fixed codes, never private references', async () => {
  const f = fixture(['SYN-1']);
  const cli = path.resolve(__dirname, '../scripts/jal-repd-ced-assets.cjs');
  const bad = spawnSync(process.execPath, [cli, '--baseline-dir', f.baselineDir, '--output-dir',
    `${f.dir}/unused/../bad`, '--limit', '1'], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.equal(bad.stdout, '{"ok":false,"reason":"invalid_input"}\n');
  assert.equal(bad.stderr, '');
  const help = spawnSync(process.execPath, [cli, '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /--resume.*--verify-only/);
});

test('private path guards reject Git markers, aliases, traversal and existing output', async () => {
  const f = fixture(['SYN-1']);
  for (const marker of ['file', 'dir']) {
    const repo = path.join(f.dir, `repo-${marker}`);
    fs.mkdirSync(repo, { mode: 0o700 });
    if (marker === 'file') fs.writeFileSync(path.join(repo, '.git'), 'synthetic');
    else fs.mkdirSync(path.join(repo, '.git'));
    await assert.rejects(runAssets({ ...options(f, []), outputDir: path.join(repo, 'output') }), /repo_output_rejected/);
  }
  const alias = path.join(f.dir, 'alias');
  fs.symlinkSync(f.dir, alias);
  for (const outputDir of [path.join(alias, 'output'), `${f.dir}/unused/../other`, 'relative']) {
    await assert.rejects(runAssets({ ...options(f, []), outputDir }), /invalid_input/);
  }
  fs.mkdirSync(f.outputDir, { mode: 0o700 });
  fs.writeFileSync(path.join(f.outputDir, 'keep'), 'keep');
  await assert.rejects(runAssets(options(f, [])), /output_exists/);
  assert.equal(fs.readFileSync(path.join(f.outputDir, 'keep'), 'utf8'), 'keep');
});

test('resume refuses corrupted cached bytes, child symlinks, state tampering and never overwrites cache', async () => {
  for (const change of [
    (f) => fs.writeFileSync(path.join(f.outputDir, 'images', '0000.jpg'), 'corrupt'),
    (f) => { const file = path.join(f.outputDir, 'images', '0000.jpg'); fs.renameSync(file, `${file}.backup`); fs.symlinkSync(`${file}.backup`, file); },
    (f) => { const s = state(f); s.bodyBytes = 0; fs.writeFileSync(path.join(f.outputDir, 'state.json'), JSON.stringify(s)); },
  ]) {
    const f = fixture(['SYN-1']);
    await runAssets(options(f, [response()]));
    change(f);
    await assert.rejects(runAssets(options(f, [], [], { resume: true, fetch: () => { throw Error('network'); } })), /invalid_state/);
  }
});
