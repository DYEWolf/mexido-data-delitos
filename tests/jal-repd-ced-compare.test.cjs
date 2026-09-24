'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { buildManifest, hashNormalizedRecord } = require('../src/jal-repd-ced/manifest.cjs');
const { normalizeRecord } = require('../src/jal-repd-ced/normalize.cjs');
const { RECORD_FIELDS } = require('../src/jal-repd-ced/schema.cjs');
const { runBaseline } = require('../src/jal-repd-ced/baseline.cjs');
const { compareBaselines } = require('../src/jal-repd-ced/compare-baselines.cjs');

const cli = path.resolve(__dirname, '../scripts/jal-repd-ced-compare.cjs');
const endpoint = 'https://repd.jalisco.gob.mx/api/v1/version_publica/repd-version-publica-cedulas-busqueda/?estado=14';
const secret = 'SYNTHETIC_SECRET_TOKEN_PRIVATE_123';

function record(id, changes = {}) {
  const raw = Object.fromEntries(RECORD_FIELDS.map((field) => [field, `synthetic-${field}`]));
  Object.assign(raw, {
    id_cedula_busqueda: id, nombre_completo: secret, edad_momento_desaparicion: 22,
    estatura: null, descripcion_sena_particular: [], descripcion_vestimenta: [],
    ruta_foto: 'https://assets.invalid/old.jpg',
  }, changes);
  return normalizeRecord(raw);
}

function snapshot(rows, at, overrides = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ced-compare-synthetic-'));
  const manifest = {
    ...buildManifest({ response: { count: rows.length, total_pages: 1 }, normalizedRecords: rows,
      observedAt: at, sourceEndpoint: endpoint, scope: 'complete_within_scope' }),
    baseline: { assetPolicy: 'skip', pages: { startPage: 1, lastPage: 1,
      lastDiscoveredPage: 1, pageSize: 100, maxPages: null }, duplicateCount: 0,
    failedPageCount: 0, schemaErrorCount: 0,
    boundsCheck: { checked: true, changed: false,
      start: { count: rows.length, totalPages: 1 }, end: { count: rows.length, totalPages: 1 } } },
  };
  const checkpoint = { schemaVersion: '1', sourceId: 'JAL-REPD-CED', nextPage: 2,
    discovered: { count: rows.length, totalPages: 1 }, completedPages: [1],
    duplicateCount: 0, failedPageCount: 0, schemaErrorCount: 0, dryRun: false };
  for (const [name, value] of Object.entries({ 'manifest.json': manifest,
    'checkpoint.json': checkpoint, 'records.ndjson': rows,
    'failed-pages.ndjson': [], 'schema-errors.ndjson': [] })) {
    fs.writeFileSync(path.join(dir, name), name.endsWith('.ndjson')
      ? value.map((entry) => JSON.stringify(entry)).join('\n') + (value.length ? '\n' : '')
      : JSON.stringify(value));
  }
  if (overrides.manifest) mutate(dir, 'manifest.json', overrides.manifest);
  if (overrides.checkpoint) mutate(dir, 'checkpoint.json', overrides.checkpoint);
  return dir;
}

function mutate(dir, name, transform) {
  const target = path.join(dir, name);
  const value = JSON.parse(fs.readFileSync(target, 'utf8'));
  transform(value);
  fs.writeFileSync(target, JSON.stringify(value));
}

function invoke(a, b, ...extra) {
  const before = [a, b].flatMap((dir) => ['manifest.json', 'checkpoint.json', 'records.ndjson',
    'failed-pages.ndjson', 'schema-errors.ndjson'].map((name) => fs.readFileSync(path.join(dir, name))));
  const result = spawnSync(process.execPath, [cli, '--before', a, '--after', b, ...extra], { encoding: 'utf8' });
  const after = [a, b].flatMap((dir) => ['manifest.json', 'checkpoint.json', 'records.ndjson',
    'failed-pages.ndjson', 'schema-errors.ndjson'].map((name) => fs.readFileSync(path.join(dir, name))));
  assert.deepEqual(after, before, 'snapshot input must not change');
  assert.equal(result.stderr.includes(secret), false);
  assert.equal(result.stdout.includes(secret), false);
  assert.equal(result.stderr.includes(a), false);
  assert.equal(result.stdout.includes(a), false);
  assert.equal(result.stderr.includes(endpoint), false);
  return result;
}

function pair() {
  return [snapshot([record('SYN-1'), record('SYN-2'), record('SYN-3')], '2026-01-01T00:00:00.000Z'),
    snapshot([record('SYN-1'), record('SYN-2', { ruta_foto: 'https://assets.invalid/changed.jpg' }),
      record('SYN-4', { cabello: 'changed metadata' })], '2026-02-01T00:00:00.000Z')];
}

test('actual producer snapshots including clean resume pass comparator and CLI; partial cannot', async () => {
  async function produce(at, ids, resume) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ced-produced-'));
    const fetchPage = ({ page }) => ({ count: ids.length, total_pages: 2,
      results: ids.slice(page - 1, page).map((id) => record(id).internalRecord) });
    const options = { outputDirectory: dir, observedAt: at, pageSize: 1, assets: 'skip', fetchPage };
    if (resume) {
      const partial = await runBaseline({ ...options, maxPages: 1 });
      assert.equal(partial.manifest.scope, 'partial');
      assert.equal(partial.ok, false);
      return { dir, options, finish: () => runBaseline({ ...options, maxPages: 2 }) };
    }
    const complete = await runBaseline(options);
    assert.equal(complete.manifest.scope, 'complete_within_scope');
    return { dir };
  }
  const a = await produce('2026-01-01T00:00:00.000Z', ['SYN-1', 'SYN-2'], false);
  const b = await produce('2026-02-01T00:00:00.000Z', ['SYN-1', 'SYN-3'], true);
  assert.throws(() => compareBaselines(a.dir, b.dir), { code: 'incomplete_scope' });
  assert.equal(invoke(a.dir, b.dir).status, 1);
  const finished = await b.finish();
  assert.equal(finished.manifest.scope, 'complete_within_scope');
  assert.deepEqual(readJsonForTest(path.join(b.dir, 'checkpoint.json')).completedPages, [1, 2]);
  assert.equal(compareBaselines(a.dir, b.dir).summary.source_missing, 1);
  assert.equal(invoke(a.dir, b.dir).status, 0);
});

function readJsonForTest(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

test('producer transport failure never becomes comparable complete evidence', async () => {
  const a = fs.mkdtempSync(path.join(os.tmpdir(), 'ced-actual-a-'));
  const b = fs.mkdtempSync(path.join(os.tmpdir(), 'ced-actual-failed-'));
  const stable = { count: 2, total_pages: 2, results: [record('SYN-1').internalRecord] };
  await runBaseline({ outputDirectory: a, assets: 'skip', observedAt: '2026-01-01T00:00:00.000Z',
    fetchPage: ({ page }) => ({ ...stable, results: [record(`SYN-${page}`).internalRecord] }) });
  const failed = await runBaseline({ outputDirectory: b, assets: 'skip',
    observedAt: '2026-02-01T00:00:00.000Z', fetchPage: ({ page }) => {
      if (page === 2) throw Error(secret);
      return stable;
    } });
  assert.equal(failed.ok, false);
  assert.equal(failed.manifest.scope, 'partial');
  assert.equal(invoke(a, b).status, 1);
});

test('valid offline comparison returns only safe aggregate status and never changes input', () => {
  const [a, b] = pair();
  const result = invoke(a, b);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  const output = JSON.parse(result.stdout);
  assert.equal(output.runStatus, 'success');
  assert.deepEqual(output.summary, { new: 1, unchanged: 1, changed: 1,
    asset_changed: 0, source_missing: 1, failed: 0, suppressed: 0 });
  assert.equal(output.humanReviewRequired, true);
  assert.equal(output.publicationMutationsBlocked, false);
  assert.equal(output.summary.located, undefined);
  assert.equal(JSON.stringify(output).includes('SYN-'), false);
});

test('rejects invalid observations before reconciliation with fixed safe reasons', () => {
  const cases = [
    ['partial', 'manifest.json', (m) => { m.scope = 'partial'; }],
    ['bounds', 'manifest.json', (m) => { m.baseline.boundsCheck.checked = false; }],
    ['asset', 'manifest.json', (m) => { m.baseline.assetPolicy = 'metadata_only'; }],
    ['endpoint', 'manifest.json', (m) => { m.sourceEndpoint = `${endpoint}&token=${secret}`; }],
    ['source', 'manifest.json', (m) => { m.sourceId = 'OTHER'; }],
    ['count', 'manifest.json', (m) => { m.count = '3'; }],
    ['hash', 'manifest.json', (m) => { m.recordHashes[0].sha256 = '0'.repeat(64); }],
    ['coverage', 'checkpoint.json', (c) => { c.completedPages = []; }],
    ['next page', 'checkpoint.json', (c) => { c.nextPage = 1; }],
    ['failure', 'checkpoint.json', (c) => { c.failedPageCount = 1; }],
    ['dry run', 'checkpoint.json', (c) => { c.dryRun = true; }],
  ];
  for (const [label, name, change] of cases) {
    const [a, b] = pair();
    mutate(b, name, change);
    const result = invoke(a, b);
    assert.equal(result.status, 1, label);
    assert.match(result.stdout, /^\{"ok":false,"reason":"[a-z_]+"\}\n$/);
    assert.equal(result.stderr, '');
  }
});

test('rejects corrupt, duplicate, missing and contradictory log evidence', () => {
  for (const change of [
    (dir) => fs.writeFileSync(path.join(dir, 'manifest.json'), `{ "secret": "${secret}"`),
    (dir) => fs.appendFileSync(path.join(dir, 'records.ndjson'), `${secret}\n`),
    (dir) => fs.appendFileSync(path.join(dir, 'records.ndjson'), fs.readFileSync(path.join(dir, 'records.ndjson'), 'utf8').split('\n')[0] + '\n'),
    (dir) => fs.writeFileSync(path.join(dir, 'failed-pages.ndjson'), JSON.stringify({ page: 1, message: secret }) + '\n'),
    (dir) => fs.writeFileSync(path.join(dir, 'schema-errors.ndjson'), 'not json\n'),
    (dir) => fs.writeFileSync(path.join(dir, 'checkpoint.json'), '{}'),
  ]) {
    const [a, b] = pair();
    change(b);
    const result = invoke(a, b);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /^\{"ok":false,"reason":"[a-z_]+"\}\n$/);
    assert.equal(result.stderr, '');
  }
});

test('rejects incompatible dates, pagination, query and directory alias', () => {
  for (const change of [
    (m) => { m.observedAt = '2026-01-01T00:00:00.000Z'; },
    (m) => { m.observedAt = 'tomorrow'; },
    (m) => { m.baseline.pages.pageSize = 7; },
    (m) => { m.sourceEndpoint = `${endpoint}&limit=7`; },
    (m) => { m.baseline.pages.lastDiscoveredPage = 2; },
  ]) {
    const [a, b] = pair();
    mutate(b, 'manifest.json', change);
    assert.equal(invoke(a, b).status, 1);
  }
  const [a] = pair();
  assert.equal(invoke(a, path.join(a, '.')).status, 1);
});

test('accepts complete multi-page producer ranges and normalized endpoint pagination', () => {
  const rows = [record('SYN-1'), record('SYN-2'), record('SYN-3')];
  function twoPages(at, url) {
    return snapshot(rows, at, {
      manifest(m) {
        m.totalPages = 2;
        m.sourceEndpoint = url;
        m.baseline.pages = { startPage: 1, lastPage: 2,
          lastDiscoveredPage: 2, pageSize: 2, maxPages: 2 };
        m.baseline.boundsCheck.start.totalPages = 2;
        m.baseline.boundsCheck.end.totalPages = 2;
        m.warnings = [{ code: 'multiple_pages_reported', message: 'Synthetic warning.' }];
      },
      checkpoint(c) { c.discovered.totalPages = 2; c.completedPages = [1, 2]; c.nextPage = 3; },
    });
  }
  const a = twoPages('2026-01-01T00:00:00.000Z', `${endpoint}&page=1&limit=2`);
  const b = twoPages('2026-02-01T00:00:00.000Z', `${endpoint}&limit=2&page=1`);
  assert.equal(invoke(a, b).status, 0);
  mutate(b, 'checkpoint.json', (c) => { c.completedPages = [1, 1]; });
  assert.equal(invoke(a, b).status, 1);
});

test('jurisdiction follows source; unknown and external record geographies are retained', () => {
  const a = snapshot([record('SYN-1', { estado: 'outside', municipio: 'unknown' })], '2026-01-01T00:00:00.000Z');
  const b = snapshot([record('SYN-1', { estado: 'outside', municipio: 'unknown' }),
    record('SYN-2', { estado: 'outside', municipio: 'unknown' })], '2026-02-01T00:00:00.000Z');
  assert.deepEqual(JSON.parse(invoke(a, b).stdout).summary, {
    new: 1, unchanged: 1, changed: 0, asset_changed: 0,
    source_missing: 0, failed: 0, suppressed: 0,
  });
});

test('large count drop remains source_missing and reports the circuit breaker', () => {
  const a = snapshot(Array.from({ length: 6 }, (_, i) => record(`SYN-${i}`)), '2026-01-01T00:00:00.000Z');
  const b = snapshot([record('SYN-0')], '2026-02-01T00:00:00.000Z');
  const output = JSON.parse(invoke(a, b).stdout);
  assert.equal(output.runStatus, 'anomalous');
  assert.deepEqual(output.anomalyCodes, ['abrupt_count_drop']);
  assert.equal(output.summary.source_missing, 5);
  assert.equal(output.summary.failed, 0);
  assert.equal(output.publicationMutationsBlocked, true);
});

test('missing evidence and invalid normalized schema fail without echoing private values', () => {
  const [a, b] = pair();
  fs.unlinkSync(path.join(b, 'schema-errors.ndjson'));
  const missing = spawnSync(process.execPath, [cli, '--before', a, '--after', b], { encoding: 'utf8' });
  assert.equal(missing.status, 1);
  assert.equal(missing.stdout, '{"ok":false,"reason":"invalid_files"}\n');
  assert.equal(missing.stderr, '');
  const [c, d] = pair();
  mutate(d, 'manifest.json', (m) => { m.recordHashes[0].sha256 = hashNormalizedRecord({ secret }); });
  assert.equal(invoke(c, d).status, 1);
  const [e, f] = pair();
  const file = path.join(f, 'records.ndjson');
  const lines = fs.readFileSync(file, 'utf8').trimEnd().split('\n');
  const row = JSON.parse(lines[0]);
  row.internalRecord.edad_momento_desaparicion = '22';
  lines[0] = JSON.stringify(row);
  fs.writeFileSync(file, `${lines.join('\n')}\n`);
  assert.equal(invoke(e, f).status, 1);
});

test('strict CLI arguments and help do not leak arguments or paths', () => {
  const [a, b] = pair();
  assert.equal(invoke(a, b, '--unexpected', secret).status, 1);
  const remote = spawnSync(process.execPath, [cli, '--before', `https://example.invalid/${secret}`,
    '--after', b], { encoding: 'utf8' });
  assert.equal(remote.status, 1);
  assert.equal(remote.stdout, '{"ok":false,"reason":"invalid_arguments"}\n');
  assert.equal(remote.stderr, '');
  const help = spawnSync(process.execPath, [cli, '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /--before.*--after/);
  assert.equal(help.stderr, '');
});
