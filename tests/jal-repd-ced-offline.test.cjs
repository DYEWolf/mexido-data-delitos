'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { validateResponse } = require('../src/jal-repd-ced/schema.cjs');
const { normalizeRecord, redactForPublic } = require('../src/jal-repd-ced/normalize.cjs');
const { buildManifest, hashNormalizedRecord } = require('../src/jal-repd-ced/manifest.cjs');
const { runCli } = require('../scripts/jal-repd-ced-offline.cjs');

function syntheticRecord(overrides = {}) {
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
    id_cedula_busqueda: 'SYNTHETIC-001',
    municipio: 'synthetic-municipality',
    nacionalidad: null,
    nombre_completo: 'SYNTHETIC SUBJECT',
    ojos_color: 'synthetic-eye-color',
    ruta_foto: 'https://assets.invalid/synthetic-photo.jpg',
    sexo: 'synthetic-sex',
    tez: 'synthetic-complexion',
    ...overrides,
  };
}

function syntheticResponse(records = [syntheticRecord()]) {
  return { count: records.length, total_pages: 1, results: records };
}

function fakeFileSystem(input) {
  const files = new Map([['fixture.json', input]]);
  const directories = [];
  return {
    files,
    directories,
    readFileSync(filePath) {
      if (!files.has(filePath)) throw new Error('missing input');
      return files.get(filePath);
    },
    mkdirSync(directory) {
      directories.push(directory);
    },
    writeFileSync(filePath, contents) {
      files.set(filePath, contents);
    },
  };
}

test('validates the observed response and all 21 record fields', () => {
  const result = validateResponse(syntheticResponse());
  assert.deepEqual(result, { valid: true, errors: [] });
});

test('returns structured missing-field errors without throwing on source data', () => {
  const record = syntheticRecord();
  delete record.sexo;

  assert.doesNotThrow(() => validateResponse({ count: 1, total_pages: 1, results: [record] }));
  const result = validateResponse({ count: 1, total_pages: 1, results: [record] });
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [{
    path: 'response.results[0].sexo',
    code: 'missing_field',
    expected: 'present',
    actual: 'missing',
  }]);
});

test('normalization preserves the internal observed record and public redaction leaks no source fields', () => {
  const raw = syntheticRecord();
  const normalized = normalizeRecord(raw);
  const publicSummary = redactForPublic(normalized);
  const publicText = JSON.stringify(publicSummary);

  assert.equal(normalized.sourceId, 'SYNTHETIC-001');
  assert.deepEqual(normalized.internalRecord, raw);
  assert.notEqual(normalized.internalRecord, raw);
  assert.deepEqual(publicSummary, { source: 'JAL-REPD-CED', sourceId: 'SYNTHETIC-001' });
  for (const sensitiveValue of [raw.nombre_completo, raw.colonia, raw.ruta_foto, raw.descripcion_vestimenta[0]]) {
    assert.doesNotMatch(publicText, new RegExp(sensitiveValue));
  }
});

test('normalized hashes and manifests are idempotent and warn for sample scope', () => {
  const response = syntheticResponse([
    syntheticRecord({ id_cedula_busqueda: 'SYNTHETIC-002' }),
    syntheticRecord({ id_cedula_busqueda: 'SYNTHETIC-001' }),
  ]);
  const normalized = response.results.map(normalizeRecord);
  const options = {
    response,
    normalizedRecords: normalized,
    observedAt: '2026-01-03T04:05:06.000Z',
    sourceEndpoint: 'https://example.invalid/observed-endpoint',
    scope: 'sample',
  };

  const first = buildManifest(options);
  const second = buildManifest(options);
  assert.deepEqual(first, second);
  assert.equal(hashNormalizedRecord(normalized[0]), hashNormalizedRecord(normalized[0]));
  assert.deepEqual(first.sourceIds, ['SYNTHETIC-001', 'SYNTHETIC-002']);
  assert.match(first.recordHashes[0].sha256, /^[a-f0-9]{64}$/);
  assert.equal(first.warnings[0].code, 'sample_scope');
});

test('the CLI rejects http(s) inputs before it can read a remote path', () => {
  let reads = 0;
  const result = runCli([
    'https://example.invalid/records.json', 'out', '--observed-at', '2026-01-03T04:05:06.000Z',
  ], {
    fs: { readFileSync() { reads += 1; } },
    writeStderr() {},
  });

  assert.equal(result.exitCode, 1);
  assert.equal(result.error.code, 'remote_input_rejected');
  assert.equal(reads, 0);
});

test('the CLI writes deterministic normalized NDJSON and a manifest from local synthetic JSON', () => {
  const input = JSON.stringify(syntheticResponse());
  const firstFs = fakeFileSystem(input);
  const secondFs = fakeFileSystem(input);
  const stdout = [];
  const args = ['fixture.json', 'out', '--observed-at', '2026-01-03T04:05:06.000Z'];

  const first = runCli(args, { fs: firstFs, writeStdout: (line) => stdout.push(line), writeStderr() {} });
  const second = runCli(args, { fs: secondFs, writeStdout() {}, writeStderr() {} });
  const recordsPath = path.join('out', 'records.ndjson');
  const manifestPath = path.join('out', 'manifest.json');

  assert.equal(first.exitCode, 0);
  assert.equal(second.exitCode, 0);
  assert.deepEqual(firstFs.directories, ['out']);
  assert.equal(firstFs.files.get(recordsPath), secondFs.files.get(recordsPath));
  assert.equal(firstFs.files.get(manifestPath), secondFs.files.get(manifestPath));
  assert.equal(JSON.parse(firstFs.files.get(recordsPath)).sourceId, 'SYNTHETIC-001');
  assert.equal(JSON.parse(firstFs.files.get(manifestPath)).recordCount, 1);
  assert.deepEqual(JSON.parse(stdout[0]), { status: 'ok', recordCount: 1 });
});
