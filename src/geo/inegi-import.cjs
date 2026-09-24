'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createGeoUnit } = require('./canonical.cjs');
const { assertNewDestination } = require('../private-output.cjs');

const URLS = Object.freeze({
  catalog: 'https://gaia.inegi.org.mx/wscatgeo/v2/mgem/14',
  geometry: 'https://gaia.inegi.org.mx/wscatgeo/v2/geo/mgem/14',
});
const LIMITS = { catalog: 1048576, geometry: 67108864, acquisition: 1048576 };
function fail(code) { throw new Error(code); }
function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function readLocal(file, limit) {
  if (typeof file !== 'string' || !file || /^[a-z][a-z\d+.-]*:\/\//i.test(file)) fail('invalid_input');
  let stat;
  try { stat = fs.lstatSync(file); } catch { fail('invalid_input'); }
  if (!stat.isFile() || stat.size > limit || stat.size === 0) fail('invalid_input');
  try { return fs.readFileSync(file); } catch { fail('invalid_input'); }
}
function parse(buffer, code) {
  try { return JSON.parse(buffer.toString('utf8')); } catch { fail(code); }
}
function sha(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }
function validCode(row, kind) {
  if (!object(row) || typeof row.cvegeo !== 'string' || !/^14\d{3}$/.test(row.cvegeo) ||
    row.cve_ent !== '14' || typeof row.cve_mun !== 'string' || !/^\d{3}$/.test(row.cve_mun) ||
    row.cvegeo !== row.cve_ent + row.cve_mun || typeof row.nomgeo !== 'string' || !row.nomgeo.trim() ||
    /^(SE IGNORA|NO ESPECIFICAD[OA])$/i.test(row.nomgeo.trim())) fail(kind);
  return row.cvegeo;
}
function ring(points) {
  return Array.isArray(points) && points.length >= 4 && points.every((point) =>
    Array.isArray(point) && (point.length === 2 || point.length === 3) &&
    point.every((number) => typeof number === 'number' && Number.isFinite(number))) &&
    points[0].length === points.at(-1).length && points[0].every((n, i) => n === points.at(-1)[i]);
}
function stateMetadata(value, code) {
  if (!object(value)) return;
  for (const key of ['cve_ent', 'CVE_ENT', 'state_code']) {
    if (Object.hasOwn(value, key) && value[key] !== '14') fail(code);
  }
  if (Object.hasOwn(value, 'cvegeo') && (typeof value.cvegeo !== 'string' || !value.cvegeo.startsWith('14'))) fail(code);
}
function validGeometry(value) {
  if (!object(value) || !['Polygon', 'MultiPolygon'].includes(value.type)) return false;
  const polygons = value.type === 'Polygon' ? [value.coordinates] : value.coordinates;
  return Array.isArray(polygons) && polygons.length > 0 && polygons.every((poly) =>
    Array.isArray(poly) && poly.length > 0 && poly.every(ring));
}
function checkedAcquisition(acquisition, kind, bytes, file) {
  const record = acquisition.artifacts?.[kind];
  if (!object(record) || record.state !== 'complete' || record.file !== path.basename(file) ||
    record.sourceUrl !== URLS[kind] || record.finalUrl !== URLS[kind] || record.status !== 200 ||
    record.mime !== 'application/json' || record.bytes !== bytes.length || record.sha256 !== sha(bytes) ||
    typeof record.observedAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d/.test(record.observedAt) ||
    Number.isNaN(Date.parse(record.observedAt))) fail('invalid_acquisition');
  return {
    sourceUrl: record.sourceUrl, finalUrl: record.finalUrl, status: record.status,
    mime: record.mime, bytes: record.bytes, sha256: record.sha256,
    observedAt: record.observedAt, lastModified: record.lastModified ?? null, etag: record.etag ?? null,
  };
}
function importInegi({ catalogPath, geometryPath, acquisitionPath, outputDir } = {}) {
  const acquisition = parse(readLocal(acquisitionPath, LIMITS.acquisition), 'invalid_acquisition');
  if (!object(acquisition) || acquisition.source !== 'MX-INEGI-GEO' || !object(acquisition.artifacts)) fail('invalid_acquisition');
  const catalogBytes = readLocal(catalogPath, LIMITS.catalog);
  const geometryBytes = readLocal(geometryPath, LIMITS.geometry);
  const artifacts = {
    catalog: checkedAcquisition(acquisition, 'catalog', catalogBytes, catalogPath),
    geometry: checkedAcquisition(acquisition, 'geometry', geometryBytes, geometryPath),
  };
  const catalog = parse(catalogBytes, 'invalid_catalog');
  const collection = parse(geometryBytes, 'invalid_geometry');
  if (!object(catalog) || !Array.isArray(catalog.datos) || !object(catalog.metadatos) ||
    catalog.numReg !== 125 || catalog.datos.length !== 125) fail('invalid_catalog');
  stateMetadata(catalog.metadatos, 'invalid_catalog');
  const rows = new Map();
  for (const row of catalog.datos) {
    const code = validCode(row, 'invalid_catalog');
    if (rows.has(code)) fail('invalid_catalog');
    rows.set(code, row);
  }
  if (!object(collection) || collection.type !== 'FeatureCollection' || !Array.isArray(collection.features) ||
    !object(collection.metadatos) || collection.totalReg !== 125 || collection.features.length !== 125 ||
    (collection.crs !== undefined && !object(collection.crs))) fail('invalid_geometry');
  stateMetadata(collection, 'invalid_geometry');
  stateMetadata(collection.metadatos, 'invalid_geometry');
  const version = collection.metadatos.Fuente_informacion_vectorial;
  if (version !== undefined && (typeof version !== 'string' || !version.trim())) fail('invalid_geometry');
  const seen = new Set();
  const units = [];
  for (const feature of collection.features) {
    if (!object(feature) || feature.type !== 'Feature' || !object(feature.properties)) fail('invalid_geometry');
    stateMetadata(feature, 'invalid_geometry');
    if (feature.crs !== undefined && (!object(feature.crs) || JSON.stringify(feature.crs) !== JSON.stringify(collection.crs))) fail('invalid_geometry');
    const code = validCode(feature.properties, 'invalid_geometry');
    if (seen.has(code) || !rows.has(code) || !validGeometry(feature.geometry)) fail('invalid_geometry');
    seen.add(code);
    const original = rows.get(code);
    for (const [key, value] of Object.entries(feature.properties)) {
      if (Object.hasOwn(original, key) && original[key] !== value) fail('invalid_geometry');
    }
    units.push({
      ...createGeoUnit({ ...original, name: original.nomgeo, geometry: feature.geometry, source_version: version || 'unknown' }),
      featureMetadata: Object.fromEntries(Object.entries(feature).filter(([key]) => !['type', 'properties', 'geometry'].includes(key))),
    });
  }
  if (seen.size !== rows.size) fail('invalid_geometry');
  units.sort((a, b) => a.cvegeo.localeCompare(b.cvegeo));
  assertNewDestination(outputDir);
  try { fs.mkdirSync(outputDir, { mode: 0o700 }); } catch { fail('invalid_input'); }
  const unitsBytes = Buffer.from(JSON.stringify(units));
  const manifest = {
    source: 'MX-INEGI-GEO', stateCode: '14', count: units.length,
    sourceVersion: version || 'unknown',
    crs: collection.crs === undefined ? { status: 'not_explicitly_declared' } : { status: 'explicit', value: collection.crs },
    catalogMetadata: catalog.metadatos, collectionMetadata: collection.metadatos,
    artifacts, materialized: { file: 'geo-units.json', bytes: unitsBytes.length, sha256: sha(unitsBytes) },
  };
  // Exclusive files in the newly created private directory; failed writes remain visible for inspection.
  for (const [name, bytes] of [['geo-units.json', unitsBytes], ['manifest.json', Buffer.from(JSON.stringify(manifest, null, 2))]]) {
    const descriptor = fs.openSync(path.join(outputDir, name), 'wx', 0o600);
    try { fs.writeFileSync(descriptor, bytes); fs.fsyncSync(descriptor); } finally { fs.closeSync(descriptor); }
  }
  return { count: units.length, sourceVersion: manifest.sourceVersion, crsStatus: manifest.crs.status };
}
module.exports = Object.freeze({ importInegi });
