'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { importInegi } = require('../src/geo/inegi-import.cjs');

const CATALOG = 'https://gaia.inegi.org.mx/wscatgeo/v2/mgem/14';
const GEOMETRY = 'https://gaia.inegi.org.mx/wscatgeo/v2/geo/mgem/14';
const observedAt = '2026-09-23T22:20:00Z';
const square = { type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]]] };
function fixture(change = () => {}) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'inegi-synthetic-')));
  const rows = Array.from({ length: 125 }, (_, i) => {
    const cve_mun = String(i + 1).padStart(3, '0');
    return { cvegeo: `14${cve_mun}`, cve_ent: '14', cve_mun, nomgeo: `municipio ${cve_mun}` };
  });
  const catalog = { datos: rows, metadatos: { Fuente_informacion_estadistica: 'synthetic' }, numReg: 125 };
  const geometry = { type: 'FeatureCollection', metadatos: { Fuente_informacion_vectorial: 'synthetic version' }, totalReg: 125, features: rows.map((row) => ({ type: 'Feature', properties: { ...row }, numReg: 1, geometry: structuredClone(square) })) };
  const acquisition = { source: 'MX-INEGI-GEO', artifacts: {} };
  const options = { catalogPath: path.join(dir, 'catalog.json'), geometryPath: path.join(dir, 'geometry.json'), acquisitionPath: path.join(dir, 'acquisition-manifest.json'), outputDir: path.join(dir, 'output') };
  change({ catalog, geometry, acquisition, options });
  for (const [kind, value, url] of [['catalog', catalog, CATALOG], ['geometry', geometry, GEOMETRY]]) {
    const file = Buffer.from(JSON.stringify(value));
    fs.writeFileSync(options[`${kind}Path`], file, { mode: 0o600 });
    acquisition.artifacts[kind] = { state: 'complete', file: `${kind}.json`, sourceUrl: url, finalUrl: url, status: 200, mime: 'application/json', bytes: file.length, sha256: crypto.createHash('sha256').update(file).digest('hex'), observedAt, lastModified: null, etag: null };
  }
  fs.writeFileSync(options.acquisitionPath, JSON.stringify(acquisition), { mode: 0o600 });
  return { dir, catalog, geometry, acquisition, options };
}
function runFailure(change, pattern) {
  const f = fixture(change);
  assert.throws(() => importInegi(f.options), pattern);
  assert.equal(fs.existsSync(f.options.outputDir), false);
}

test('exact textual join materializes 125 private units with lowercase nomgeo and source geometry', () => {
  const f = fixture();
  const result = importInegi(f.options);
  const units = JSON.parse(fs.readFileSync(path.join(f.options.outputDir, 'geo-units.json')));
  const manifest = JSON.parse(fs.readFileSync(path.join(f.options.outputDir, 'manifest.json')));
  assert.equal(result.count, 125);
  assert.equal(units.length, 125);
  assert.equal(units[0].cvegeo, '14001');
  assert.equal(units[0].name, 'municipio 001');
  assert.deepEqual(units[0].geometry, square);
  assert.equal(units[0].sourceVersion, 'synthetic version');
  assert.equal(manifest.sourceVersion, 'synthetic version');
  assert.equal(manifest.crs.status, 'not_explicitly_declared');
  assert.deepEqual(manifest.collectionMetadata, f.geometry.metadatos);
  assert.equal(manifest.artifacts.catalog.sha256, f.acquisition.artifacts.catalog.sha256);
  assert.equal(fs.statSync(f.options.outputDir).mode & 0o777, 0o700);
  assert.equal(fs.statSync(path.join(f.options.outputDir, 'geo-units.json')).mode & 0o777, 0o600);
  assert.throws(() => importInegi(f.options), /output_exists/);
});

test('explicit CRS retained; missing vector version remains unknown independent of observedAt', () => {
  const f = fixture(({ geometry }) => { geometry.metadatos = {}; geometry.crs = { type: 'name', properties: { name: 'synthetic-crs' } }; });
  importInegi(f.options);
  const manifest = JSON.parse(fs.readFileSync(path.join(f.options.outputDir, 'manifest.json')));
  assert.equal(manifest.sourceVersion, 'unknown');
  assert.deepEqual(manifest.crs, { status: 'explicit', value: f.geometry.crs });
  assert.equal(manifest.artifacts.geometry.observedAt, observedAt);
});

test('rejects foreign or inconsistent catalog keys, numbers, counts and duplicate codes', () => {
  for (const change of [
    ({ catalog }) => { catalog.datos[0].cvegeo = '15001'; },
    ({ catalog }) => { catalog.datos[0].cve_ent = '15'; },
    ({ catalog }) => { catalog.datos[0].cve_mun = '002'; },
    ({ catalog }) => { catalog.datos[0].cve_mun = 1; },
    ({ catalog }) => { catalog.datos[0].cvegeo = 14001; },
    ({ catalog }) => { catalog.datos[0].cvegeo = catalog.datos[1].cvegeo; catalog.datos[0].cve_mun = catalog.datos[1].cve_mun; },
    ({ catalog }) => { catalog.numReg = 124; },
    ({ catalog }) => { catalog.datos[0].nomgeo = 'SE IGNORA'; },
    ({ catalog }) => { catalog.datos.push({ ...catalog.datos[0], cvegeo: '15001', cve_ent: '15' }); catalog.numReg++; },
    ({ catalog }) => { catalog.metadatos.cve_ent = '15'; },
  ]) runFailure(change, /invalid_catalog/);
});

test('rejects missing, extra, duplicate, foreign or conflicting geometry features', () => {
  for (const change of [
    ({ geometry }) => { geometry.features.pop(); geometry.totalReg--; },
    ({ geometry }) => { geometry.features.push(structuredClone(geometry.features[0])); geometry.totalReg++; },
    ({ geometry }) => { geometry.features[0].properties.cvegeo = '15001'; },
    ({ geometry }) => { geometry.features[0].properties.nomgeo = 'different'; },
    ({ geometry }) => { geometry.features[0].properties.cve_ent = '15'; },
    ({ geometry }) => { geometry.features[0].properties.cvegeo = geometry.features[1].properties.cvegeo; },
    ({ geometry }) => { geometry.features[0].properties.cve_mun = '002'; },
    ({ geometry }) => { geometry.metadatos.cve_ent = '15'; },
    ({ geometry }) => { geometry.features[0].state_code = '15'; },
    ({ geometry }) => { geometry.features[0].crs = { type: 'name', properties: { name: 'different' } }; },
  ]) runFailure(change, /invalid_geometry/);
});

test('rejects malformed rings, nonfinite coordinates, unsupported shapes and malformed collection', () => {
  for (const change of [
    ({ geometry }) => { geometry.features[0].geometry.coordinates[0][0].pop(); },
    ({ geometry }) => { geometry.features[0].geometry.coordinates[0][0][0] = [3, 3]; },
    ({ geometry }) => { geometry.features[0].geometry.coordinates = []; },
    ({ geometry }) => { geometry.features[0].geometry.type = 'Point'; },
    ({ geometry }) => { geometry.features[0].geometry.coordinates[0][0][0] = ['NaN', 0]; },
    ({ geometry }) => { geometry.features[0].geometry.coordinates[0][0][0] = [null, 0]; },
    ({ geometry }) => { geometry.type = 'unexpected'; },
  ]) runFailure(change, /invalid_geometry/);
});

test('acquisition metadata is verified before output for hash, MIME, source identity and schema', () => {
  for (const change of [
    ({ acquisition }) => { acquisition.source = 'not-INEGI'; },
    ({ catalog }) => { catalog.datos = {}; },
  ]) runFailure(change, /invalid_(acquisition|input|catalog)/);
  const remoteInput = fixture();
  remoteInput.options.catalogPath = CATALOG;
  assert.throws(() => importInegi(remoteInput.options), /invalid_input/);
  for (const mutate of [
    (a) => { a.artifacts.geometry.sha256 = '0'.repeat(64); },
    (a) => { a.artifacts.catalog.mime = 'text/html'; },
    (a) => { a.artifacts.catalog.sourceUrl = 'https://elsewhere.invalid/'; },
    (a) => { a.artifacts.geometry.state = 'failed'; },
    (a) => { a.artifacts.catalog.bytes++; },
  ]) {
    const f = fixture();
    mutate(f.acquisition);
    fs.writeFileSync(f.options.acquisitionPath, JSON.stringify(f.acquisition));
    assert.throws(() => importInegi(f.options), /invalid_acquisition/);
    assert.equal(fs.existsSync(f.options.outputDir), false);
  }
});

test('rejects private fake Git trees by directory or worktree file marker, regardless of CLI cwd', () => {
  const cli = path.resolve(__dirname, '../scripts/import-inegi.cjs');
  for (const marker of ['directory', 'file']) {
    const f = fixture();
    const repo = path.join(f.dir, 'fake-repo');
    fs.mkdirSync(repo, { mode: 0o700 });
    if (marker === 'directory') fs.mkdirSync(path.join(repo, '.git'), { mode: 0o700 });
    else fs.writeFileSync(path.join(repo, '.git'), 'gitdir: synthetic', { mode: 0o600 });
    const destination = path.join(repo, 'nested', 'output');
    fs.mkdirSync(path.dirname(destination), { mode: 0o700 });
    f.options.outputDir = destination;
    assert.throws(() => importInegi(f.options), /repo_output_rejected/);
    assert.equal(fs.existsSync(destination), false);
    const args = ['--catalog', f.options.catalogPath, '--geometry', f.options.geometryPath, '--acquisition', f.options.acquisitionPath, '--output-dir', destination];
    const cliResult = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', cwd: f.dir });
    assert.equal(cliResult.status, 1);
    assert.equal(JSON.parse(cliResult.stderr).error, 'import_failed'); // Existing CLI maps new safe failures to its fixed fallback.
    assert.equal(cliResult.stderr.includes(f.dir), false);
    assert.equal(fs.existsSync(destination), false);
  }
});

test('rejects symlinked parent and ancestor aliases before creating output, including aliases to Git', () => {
  const f = fixture();
  const privateParent = path.join(f.dir, 'private');
  fs.mkdirSync(privateParent, { mode: 0o700 });
  const alias = path.join(f.dir, 'alias');
  fs.symlinkSync(privateParent, alias);
  for (const outputDir of [path.join(alias, 'output'), path.join(alias, 'nested', 'output')]) {
    if (outputDir.includes('nested')) fs.mkdirSync(path.join(privateParent, 'nested'), { mode: 0o700 });
    assert.throws(() => importInegi({ ...f.options, outputDir }), /invalid_input/);
    assert.equal(fs.existsSync(outputDir), false);
  }
  const cli = path.resolve(__dirname, '../scripts/import-inegi.cjs');
  const aliasOutput = path.join(alias, 'cli-output');
  const args = ['--catalog', f.options.catalogPath, '--geometry', f.options.geometryPath, '--acquisition', f.options.acquisitionPath, '--output-dir', aliasOutput];
  const cliResult = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', cwd: f.dir });
  assert.equal(cliResult.status, 1);
  assert.equal(JSON.parse(cliResult.stderr).error, 'invalid_input');
  assert.equal(fs.existsSync(path.join(privateParent, 'cli-output')), false);
  const repo = path.join(f.dir, 'repo');
  fs.mkdirSync(repo, { mode: 0o700 });
  fs.mkdirSync(path.join(repo, '.git'), { mode: 0o700 });
  const repoAlias = path.join(f.dir, 'repo-alias');
  fs.symlinkSync(repo, repoAlias);
  assert.throws(() => importInegi({ ...f.options, outputDir: path.join(repoAlias, 'output') }), /invalid_input|repo_output_rejected/);
  assert.equal(fs.existsSync(path.join(repo, 'output')), false);
});

test('rejects relative and noncanonical destinations; preserves existing destination; canonical private path succeeds', () => {
  const f = fixture();
  // Construct the lexical traversal explicitly: path.join would normalize away '..'.
  const bad = [path.relative(process.cwd(), path.join(f.dir, 'relative-output')),
    `${f.dir}/unused/../normalized-output`];
  for (const outputDir of bad) {
    assert.throws(() => importInegi({ ...f.options, outputDir }), /invalid_input/);
    assert.equal(fs.existsSync(path.resolve(outputDir)), false);
  }
  fs.mkdirSync(f.options.outputDir, { mode: 0o700 });
  const marker = path.join(f.options.outputDir, 'keep.txt');
  fs.writeFileSync(marker, 'unchanged');
  assert.throws(() => importInegi(f.options), /output_exists/);
  assert.equal(fs.readFileSync(marker, 'utf8'), 'unchanged');
  assert.equal(fs.existsSync(path.join(f.options.outputDir, 'geo-units.json')), false);
  const canonicalOutput = path.join(f.dir, 'canonical-output');
  assert.equal(importInegi({ ...f.options, outputDir: canonicalOutput }).count, 125);
  assert.equal(fs.statSync(canonicalOutput).mode & 0o777, 0o700);
});

test('CLI accepts only local artifacts, has sanitized failures and no network behavior', () => {
  const f = fixture();
  const cli = path.resolve(__dirname, '../scripts/import-inegi.cjs');
  const args = ['--catalog', f.options.catalogPath, '--geometry', f.options.geometryPath, '--acquisition', f.options.acquisitionPath, '--output-dir', f.options.outputDir];
  const ok = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(JSON.parse(ok.stdout).count, 125);
  assert.equal(ok.stdout.includes(f.dir), false);
  const failed = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  assert.equal(failed.status, 1);
  assert.equal(failed.stderr.includes(f.dir), false);
  assert.equal(failed.stderr.includes('coordinates'), false);
  const remote = spawnSync(process.execPath, [cli, ...args.slice(0, 1), 'https://gaia.inegi.org.mx/test', ...args.slice(2)], { encoding: 'utf8' });
  assert.equal(remote.status, 1);
  assert.equal(fs.existsSync(path.join(f.dir, 'remote-output')), false);
});
