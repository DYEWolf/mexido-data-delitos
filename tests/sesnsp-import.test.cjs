'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  CONTRACT_2015_2025,
  CONTRACT_RNID_2026,
  createManualImportContract,
  validateHeaderSample,
} = require('../src/sesnsp/import-contract.cjs');
const { runCli } = require('../scripts/import-sesnsp.cjs');

function tempCsv(contents) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sesnsp-import-'));
  const filePath = path.join(directory, 'official.csv');
  fs.writeFileSync(filePath, contents);
  return filePath;
}

test('manual import contract records local official file provenance without fetching network', () => {
  const filePath = tempCsv('Año,Clave_Ent,Entidad,Cve. Municipio,Municipio,Total\n2025,14,Jalisco,14039,Guadalajara,1\n');
  const contract = createManualImportContract({
    filePath,
    sourceUrl: 'https://www.gob.mx/sesnsp/documentos/datos-abiertos-de-incidencia-delictiva',
    cutoff: '2025-12-31',
    contractId: CONTRACT_2015_2025,
    methodology: CONTRACT_2015_2025,
    operator: 'test',
  });

  assert.equal(contract.kind, 'SesnspManualImportContract');
  assert.equal(contract.networkFetched, false);
  assert.equal(contract.fileName, 'official.csv');
  assert.match(contract.sha256, /^[a-f0-9]{64}$/);
  assert.equal(contract.validation.skipped, false);
});

test('header validation rejects missing required columns where practical', () => {
  assert.deepEqual(validateHeaderSample('Año,Entidad,Municipio', CONTRACT_2015_2025), {
    ok: false,
    columns: ['Año', 'Entidad', 'Municipio'],
    missing: ['Clave_Ent', 'Cve. Municipio'],
  });
});

test('manual import rejects mixed methodology contracts without explicit mapping', () => {
  const filePath = tempCsv('Año,Clave_Ent,Entidad,Cve. Municipio,Municipio\n2026,14,Jalisco,14039,Guadalajara\n');
  assert.throws(() => createManualImportContract({
    filePath,
    sourceUrl: 'https://www.gob.mx/sesnsp/',
    cutoff: '2026-01-31',
    contractId: CONTRACT_RNID_2026,
    methodology: CONTRACT_RNID_2026,
    inputContracts: [CONTRACT_2015_2025],
  }), /without explicit mapping/);
});

test('CLI emits contract JSON and does not require a remote fetch', async () => {
  const filePath = tempCsv('Año,Clave_Ent,Entidad,Cve. Municipio,Municipio\n2026,14,Jalisco,14039,Guadalajara\n');
  const stdout = [];
  const stderr = [];
  const result = await runCli([
    '--file', filePath,
    '--source-url', 'https://www.gob.mx/sesnsp/',
    '--cutoff', '2026-01-31',
    '--contract', CONTRACT_RNID_2026,
  ], {
    writeStdout: (line) => stdout.push(line),
    writeStderr: (line) => stderr.push(line),
  });

  assert.equal(result.exitCode, 0);
  assert.equal(stderr.length, 0);
  const parsed = JSON.parse(stdout.join('\n'));
  assert.equal(parsed.contractId, CONTRACT_RNID_2026);
  assert.equal(parsed.networkFetched, false);
});
