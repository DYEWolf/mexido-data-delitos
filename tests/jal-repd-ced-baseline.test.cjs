'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { runBaseline } = require('../src/jal-repd-ced/baseline.cjs');
const {
  DEFAULT_BASELINE_SOURCE_ENDPOINT,
  buildEndpointUrl,
  runCli,
  parseArgs,
} = require('../scripts/jal-repd-ced-baseline.cjs');

function syntheticRecord(id, overrides = {}) {
  return {
    autorizacion_informacion_publica: 'SYNTHETIC_AUTHORIZED',
    cabello: 'synthetic-hair',
    colonia: 'synthetic-colony',
    complexion: 'synthetic-build',
    condicion_localizacion: 'synthetic-status',
    descripcion_sena_particular: ['synthetic-mark'],
    descripcion_vestimenta: ['synthetic-clothing'],
    edad_momento_desaparicion: 21,
    estado: 'synthetic-state',
    estatura: 1.7,
    estatus_persona_desaparecida: 'synthetic-missing-status',
    fecha_desaparicion: '2026-01-02',
    genero: 'synthetic-gender',
    id_cedula_busqueda: id,
    municipio: 'synthetic-municipality',
    nacionalidad: null,
    nombre_completo: `SYNTHETIC SUBJECT ${id}`,
    ojos_color: 'synthetic-eye-color',
    ruta_foto: `https://assets.invalid/${id}.jpg`,
    sexo: 'synthetic-sex',
    tez: 'synthetic-complexion',
    ...overrides,
  };
}

function response(count, totalPages, results) {
  return { count, total_pages: totalPages, results };
}

function tempDirectory(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readNdjson(filePath) {
  const contents = fs.readFileSync(filePath, 'utf8').trim();
  return contents ? contents.split('\n').map((line) => JSON.parse(line)) : [];
}

test('rejects unsafe sources before injected transport and before creating output', async () => {
  for (const suffix of ['&estado=14', '&token=private', '&page=2', '#fragment']) {
    const outputDirectory = path.join(tempDirectory('jal-invalid'), 'not-created');
    let calls = 0;
    await assert.rejects(runBaseline({ outputDirectory,
      sourceEndpoint: `${DEFAULT_BASELINE_SOURCE_ENDPOINT}${suffix}`,
      fetchPage: () => { calls++; return response(1, 1, []); } }), { code: 'invalid_source' });
    assert.equal(calls, 0);
    assert.equal(fs.existsSync(outputDirectory), false);
  }
  for (const sourceEndpoint of ['http://repd.jalisco.gob.mx/api/v1/version_publica/repd-version-publica-cedulas-busqueda/?estado=14',
    DEFAULT_BASELINE_SOURCE_ENDPOINT.replace('repd.jalisco.gob.mx', 'evil.invalid'),
    DEFAULT_BASELINE_SOURCE_ENDPOINT.replace('repd.jalisco.gob.mx', 'repd.jalisco.gob.mx:444'),
    DEFAULT_BASELINE_SOURCE_ENDPOINT.replace('https://', 'https://user:pass@')]) {
    await assert.rejects(runBaseline({ outputDirectory: tempDirectory('jal-source'), sourceEndpoint,
      fetchPage: () => { throw Error('must not fetch'); } }), { code: 'invalid_source' });
  }
});

test('default live endpoint targets the Jalisco CED JSON API with limit pagination', () => {
  const url = buildEndpointUrl(DEFAULT_BASELINE_SOURCE_ENDPOINT, { page: 7, pageSize: 12 });

  assert.equal(url.origin, 'https://repd.jalisco.gob.mx');
  assert.equal(url.pathname, '/api/v1/version_publica/repd-version-publica-cedulas-busqueda/');
  assert.equal(url.searchParams.get('estado'), '14');
  assert.equal(url.searchParams.get('page'), '7');
  assert.equal(url.searchParams.get('limit'), '12');
  assert.equal(url.searchParams.has('page_size'), false);
});

test('baseline discovers bounds from the first response and does not hardcode the last page', async () => {
  const outputDirectory = tempDirectory('jal-baseline-discover');
  const calls = [];
  const pages = new Map([
    [1, response(3, 3, [syntheticRecord('SYN-001')])],
    [2, response(3, 3, [syntheticRecord('SYN-002')])],
    [3, response(3, 3, [syntheticRecord('SYN-003')])],
  ]);

  const result = await runBaseline({
    outputDirectory,
    observedAt: '2026-01-03T04:05:06.000Z',
    pageSize: 1,
    fetchPage(request) {
      calls.push(request);
      return pages.get(request.page);
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls.map((call) => call.page), [1, 1, 2, 3, 1]);
  assert.equal(result.discovered.totalPages, 3);
  assert.equal(result.records.length, 3);
  assert.equal(readJson(path.join(outputDirectory, 'manifest.json')).baseline.pages.lastDiscoveredPage, 3);
});

test('bounded checkpoint resume continues from the next unfinished page', async () => {
  const outputDirectory = tempDirectory('jal-baseline-resume');
  const firstCalls = [];
  const pages = new Map([
    [1, response(3, 3, [syntheticRecord('SYN-001')])],
    [2, response(3, 3, [syntheticRecord('SYN-002')])],
    [3, response(3, 3, [syntheticRecord('SYN-003')])],
  ]);

  await runBaseline({
    outputDirectory,
    observedAt: '2026-01-03T04:05:06.000Z',
    maxPages: 1,
    requeryBounds: false,
    fetchPage(request) {
      firstCalls.push(request.page);
      return pages.get(request.page);
    },
  });
  assert.deepEqual(firstCalls, [1, 1]);
  assert.equal(readJson(path.join(outputDirectory, 'checkpoint.json')).nextPage, 2);

  const secondCalls = [];
  const result = await runBaseline({
    outputDirectory,
    observedAt: '2026-01-03T04:05:06.000Z',
    maxPages: 3,
    requeryBounds: false,
    fetchPage(request) {
      secondCalls.push(request.page);
      return pages.get(request.page);
    },
  });

  assert.equal(result.ok, false, 'unchecked bounds cannot certify completion');
  assert.deepEqual(secondCalls, [2, 3]);
  assert.deepEqual(readNdjson(path.join(outputDirectory, 'records.ndjson')).map((record) => record.sourceId), ['SYN-001', 'SYN-002', 'SYN-003']);
  assert.deepEqual(readJson(path.join(outputDirectory, 'checkpoint.json')).completedPages, [1, 2, 3]);
});

test('rejects legacy and mismatched checkpoints without fetching or rewriting', async () => {
  const outputDirectory = tempDirectory('jal-corrupt-checkpoint');
  await runBaseline({ outputDirectory, maxPages: 1, requeryBounds: false,
    fetchPage: () => response(3, 3, [syntheticRecord('SYN-001')]) });
  const file = path.join(outputDirectory, 'checkpoint.json');
  const original = readJson(file);
  for (const mutation of [
    (c) => { delete c.completedPages; },
    (c) => { c.nextPage = 3; },
    (c) => { c.pageSize = 5; },
    (c) => { c.discovered.totalPages = -1; },
    (c) => { c.recordDigest = 'bad'; },
  ]) {
    const changed = structuredClone(original);
    mutation(changed);
    fs.writeFileSync(file, JSON.stringify(changed));
    const bytes = fs.readFileSync(file);
    let calls = 0;
    await assert.rejects(runBaseline({ outputDirectory, fetchPage: () => { calls++; } }), { code: 'invalid_checkpoint' });
    assert.equal(calls, 0);
    assert.deepEqual(fs.readFileSync(file), bytes);
  }
});

test('failure holds nextPage at the failed page and rejects unsupported failed resume', async () => {
  const outputDirectory = tempDirectory('jal-failure-resume');
  await runBaseline({ outputDirectory, requeryBounds: false, fetchPage: ({ page }) => {
    if (page === 1) return response(2, 2, [syntheticRecord('SYN-001')]);
    throw Error('private failure');
  } });
  assert.equal(readJson(path.join(outputDirectory, 'checkpoint.json')).nextPage, 2);
  let calls = 0;
  await assert.rejects(runBaseline({ outputDirectory, fetchPage: () => { calls++; } }), { code: 'failed_resume_unsupported' });
  assert.equal(calls, 0);
});

test('CLI errors never echo URLs, private paths or raw transport exceptions', async () => {
  const privateValue = 'PRIVATE_SENTINEL';
  for (const argv of [
    ['--output-dir', `/private/${privateValue}`, '--source-endpoint', `https://evil.invalid/${privateValue}`],
    ['--output-dir', `/private/${privateValue}`, '--unknown', privateValue],
  ]) {
    const lines = [];
    const result = await runCli(argv, { fetchPage: () => { throw Error(privateValue); },
      writeStderr: (line) => lines.push(line), writeStdout: (line) => lines.push(line) });
    assert.equal(result.exitCode, 1);
    assert.equal(lines.join('').includes(privateValue), false);
  }
});

test('baseline counts duplicate source IDs and keeps one normalized record', async () => {
  const outputDirectory = tempDirectory('jal-baseline-duplicates');
  const result = await runBaseline({
    outputDirectory,
    observedAt: '2026-01-03T04:05:06.000Z',
    requeryBounds: false,
    fetchPage({ page }) {
      if (page === 1) return response(2, 2, [syntheticRecord('SYN-001')]);
      return response(2, 2, [syntheticRecord('SYN-001')]);
    },
  });

  assert.equal(result.ok, false, 'duplicate evidence cannot certify completeness');
  assert.equal(result.duplicateCount, 1);
  assert.equal(readNdjson(path.join(outputDirectory, 'records.ndjson')).length, 1);
  assert.equal(readJson(path.join(outputDirectory, 'manifest.json')).baseline.duplicateCount, 1);
});

test('failed pages are recorded without deleting successful records or reporting success', async () => {
  const outputDirectory = tempDirectory('jal-baseline-failure');
  const result = await runBaseline({
    outputDirectory,
    observedAt: '2026-01-03T04:05:06.000Z',
    requeryBounds: false,
    fetchPage({ page }) {
      if (page === 1) return response(2, 2, [syntheticRecord('SYN-001')]);
      const error = new Error('synthetic outage');
      error.code = 'synthetic_failure';
      throw error;
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.failedPages.length, 1);
  assert.equal(readNdjson(path.join(outputDirectory, 'records.ndjson')).length, 1);
  assert.equal(readNdjson(path.join(outputDirectory, 'failed-pages.ndjson'))[0].code, 'fetch_failed');
});

test('manifest and checkpoint output is idempotent for the same synthetic run', async () => {
  const firstDirectory = tempDirectory('jal-baseline-idem-a');
  const secondDirectory = tempDirectory('jal-baseline-idem-b');
  const fetchPage = ({ page }) => response(1, 1, [syntheticRecord(`SYN-00${page}`)]);
  const options = {
    observedAt: '2026-01-03T04:05:06.000Z',
    requeryBounds: false,
    fetchPage,
  };

  await runBaseline({ ...options, outputDirectory: firstDirectory });
  await runBaseline({ ...options, outputDirectory: secondDirectory });

  assert.equal(
    fs.readFileSync(path.join(firstDirectory, 'manifest.json'), 'utf8'),
    fs.readFileSync(path.join(secondDirectory, 'manifest.json'), 'utf8'),
  );
  assert.equal(
    fs.readFileSync(path.join(firstDirectory, 'checkpoint.json'), 'utf8'),
    fs.readFileSync(path.join(secondDirectory, 'checkpoint.json'), 'utf8'),
  );
});

test('CLI rejects repository output unless the explicit test override is set', async () => {
  const stdout = [];
  const stderr = [];
  const rejected = await runCli([
    '--output-dir', path.join(process.cwd(), 'reports', 'baseline-test'),
    '--max-pages', '1',
  ], {
    fetchPage: () => response(1, 1, [syntheticRecord('SYN-001')]),
    writeStdout: (line) => stdout.push(line),
    writeStderr: (line) => stderr.push(line),
  });

  assert.equal(rejected.exitCode, 1);
  assert.equal(rejected.error.code, 'repo_output_rejected');
  assert.equal(stdout.length, 0);

  const accepted = parseArgs([
    '--output-dir', path.join(process.cwd(), 'reports', 'baseline-test'),
    '--max-pages', '1',
    '--allow-repo-output-for-tests',
  ]);
  assert.equal(accepted.ok, true);
  assert.equal(accepted.allowRepoOutputForTests, true);
});

test('schema-invalid pages are not treated as successful pages', async () => {
  const outputDirectory = tempDirectory('jal-baseline-schema');
  const invalid = syntheticRecord('SYN-002');
  delete invalid.sexo;

  const result = await runBaseline({
    outputDirectory,
    observedAt: '2026-01-03T04:05:06.000Z',
    requeryBounds: false,
    fetchPage({ page }) {
      if (page === 1) return response(2, 2, [syntheticRecord('SYN-001')]);
      return response(2, 2, [invalid]);
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.schemaErrors.length, 1);
  assert.equal(readJson(path.join(outputDirectory, 'checkpoint.json')).schemaErrorCount, 1);
  assert.equal(readNdjson(path.join(outputDirectory, 'records.ndjson')).length, 1);
});
