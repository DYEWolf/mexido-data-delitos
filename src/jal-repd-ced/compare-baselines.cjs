'use strict';

// Offline, read-only adapter: validate the complete producer evidence before reconciliation.
const fs = require('node:fs');
const path = require('node:path');
const { hashNormalizedRecord } = require('./manifest.cjs');
const { SOURCE_ID, NORMALIZATION_VERSION } = require('./normalize.cjs');
const { validateRecord } = require('./schema.cjs');
const { reconcileCedulas } = require('./reconcile.cjs');

const ENDPOINT = 'https://repd.jalisco.gob.mx/api/v1/version_publica/repd-version-publica-cedulas-busqueda/';
const FILES = ['manifest.json', 'checkpoint.json', 'records.ndjson',
  'failed-pages.ndjson', 'schema-errors.ndjson'];

function reject(reason) {
  const error = new Error(reason);
  error.code = reason;
  throw error;
}

function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function integer(value, min = 0) {
  return Number.isSafeInteger(value) && value >= min;
}
function isoTime(value) {
  return typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)
    && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value;
}
function endpointKey(value, pageSize) {
  try {
    if (typeof value !== 'string' || value.includes('#')) reject('invalid_endpoint');
    const url = new URL(value);
    if (url.origin !== new URL(ENDPOINT).origin || url.pathname !== new URL(ENDPOINT).pathname
      || url.username || url.password || url.hash) reject('invalid_endpoint');
    const params = [...url.searchParams];
    if (params.length !== new Set(params.map(([key]) => key)).size) reject('invalid_endpoint');
    if (params.some(([key]) => !['estado', 'page', 'limit'].includes(key))
      || url.searchParams.get('estado') !== '14'
      || (url.searchParams.has('page') && url.searchParams.get('page') !== '1')
      || (url.searchParams.has('limit') && url.searchParams.get('limit') !== String(pageSize))) {
      reject('invalid_endpoint');
    }
    return `${url.origin}${url.pathname}?estado=14`;
  } catch (_) { reject('invalid_endpoint'); }
}
function readSnapshot(directory) {
  let files;
  try {
    files = Object.fromEntries(FILES.map((name) => {
      const file = path.join(directory, name);
      if (!fs.lstatSync(file).isFile()) reject('invalid_files');
      return [name, fs.readFileSync(file, 'utf8')];
    }));
  } catch (_) { reject('invalid_files'); }
  function json(name) {
    try { return JSON.parse(files[name]); } catch (_) { reject('invalid_files'); }
  }
  function ndjson(name) {
    const text = files[name];
    if (text === '') return [];
    if (!text.endsWith('\n') || text.includes('\r') || text.split('\n').slice(0, -1).some((line) => !line.trim())) {
      reject('invalid_files');
    }
    try { return text.slice(0, -1).split('\n').map((line) => JSON.parse(line)); }
    catch (_) { reject('invalid_files'); }
  }
  return { manifest: json('manifest.json'), checkpoint: json('checkpoint.json'),
    records: ndjson('records.ndjson'), failedPages: ndjson('failed-pages.ndjson'),
    schemaErrors: ndjson('schema-errors.ndjson') };
}

function validateSnapshot(snapshot) {
  const { manifest: m, checkpoint: c, records, failedPages, schemaErrors } = snapshot;
  if (!object(m) || !object(c) || !object(m.baseline) || !object(m.baseline.pages)
    || !object(m.baseline.boundsCheck) || !object(c.discovered)) reject('invalid_schema');
  const { pages, boundsCheck } = m.baseline;
  if (m.schemaVersion !== '1' || c.schemaVersion !== '1' || m.sourceId !== SOURCE_ID
    || c.sourceId !== SOURCE_ID) reject('invalid_source');
  if (!isoTime(m.observedAt)) reject('invalid_time');
  if (!integer(pages.pageSize, 1)) reject('invalid_pagination');
  const endpoint = endpointKey(m.sourceEndpoint, pages.pageSize);
  if (m.scope !== 'complete_within_scope' || m.baseline.assetPolicy !== 'skip') reject('incomplete_scope');
  if (!integer(m.count, 1) || !integer(m.totalPages, 1) || !integer(m.recordCount, 1)
    || !integer(c.discovered.count) || !integer(c.discovered.totalPages, 1)
    || m.count !== m.recordCount || m.count !== records.length
    || c.discovered.count !== m.count || c.discovered.totalPages !== m.totalPages) reject('invalid_counts');
  if (pages.startPage !== 1 || pages.lastPage !== m.totalPages
    || pages.lastDiscoveredPage !== m.totalPages
    || (pages.maxPages !== null && (!integer(pages.maxPages, m.totalPages)))
    || !integer(c.nextPage, 2) || c.nextPage !== m.totalPages + 1
    || !Array.isArray(c.completedPages) || c.completedPages.length !== m.totalPages
    || c.completedPages.some((page, index) => page !== index + 1)
    || c.dryRun !== false) reject('incomplete_pages');
  if (boundsCheck.checked !== true || boundsCheck.changed !== false
    || !object(boundsCheck.start) || !object(boundsCheck.end)
    || [boundsCheck.start, boundsCheck.end].some((bound) => bound.count !== m.count
      || bound.totalPages !== m.totalPages)) reject('invalid_bounds');
  if ([m.baseline.duplicateCount, m.baseline.failedPageCount, m.baseline.schemaErrorCount,
    c.duplicateCount, c.failedPageCount, c.schemaErrorCount].some((value) => value !== 0)
    || failedPages.length || schemaErrors.length) reject('incomplete_run');
  if (!Array.isArray(m.warnings) || m.warnings.length !== (m.totalPages > 1 ? 1 : 0)
    || m.warnings.some((warning) => !object(warning) || warning.code !== 'multiple_pages_reported')
    || !Array.isArray(m.sourceIds) || !Array.isArray(m.recordHashes)
    || m.sourceIds.length !== records.length || m.recordHashes.length !== records.length) {
    reject('invalid_manifest');
  }
  const hashes = new Map();
  for (const record of records) {
    if (!object(record) || record.source !== SOURCE_ID || record.normalizationVersion !== NORMALIZATION_VERSION
      || typeof record.sourceId !== 'string' || !record.sourceId.trim()
      || !object(record.internalRecord) || !validateRecord(record.internalRecord).valid
      || record.internalRecord.id_cedula_busqueda !== record.sourceId
      || Object.keys(record).sort().join(',') !== 'internalRecord,normalizationVersion,source,sourceId'
      || hashes.has(record.sourceId)) reject('invalid_records');
    hashes.set(record.sourceId, hashNormalizedRecord(record));
  }
  const ids = [...hashes.keys()].sort();
  if (m.sourceIds.some((id, index) => id !== ids[index])
    || m.recordHashes.some((entry, index) => !object(entry)
      || entry.sourceId !== ids[index] || entry.sha256 !== hashes.get(ids[index]))) {
    reject('invalid_hashes');
  }
  return { records, manifest: m, endpoint };
}

function readValidatedSnapshot(directory) {
  let canonical;
  try {
    canonical = fs.realpathSync(directory);
    if (!fs.statSync(canonical).isDirectory()) reject('invalid_files');
  } catch (_) { reject('invalid_files'); }
  return validateSnapshot(readSnapshot(canonical));
}

function compareBaselines(beforeDirectory, afterDirectory, { suppressions } = {}) {
  let beforePath, afterPath;
  try {
    beforePath = fs.realpathSync(beforeDirectory);
    afterPath = fs.realpathSync(afterDirectory);
    if (!fs.statSync(beforePath).isDirectory() || !fs.statSync(afterPath).isDirectory()) reject('invalid_files');
  } catch (_) { reject('invalid_files'); }
  if (beforePath === afterPath) reject('same_directory');
  const before = validateSnapshot(readSnapshot(beforePath));
  const after = validateSnapshot(readSnapshot(afterPath));
  if (before.endpoint !== after.endpoint || before.manifest.baseline.pages.pageSize !== after.manifest.baseline.pages.pageSize) {
    reject('incompatible_snapshots');
  }
  if (after.manifest.observedAt <= before.manifest.observedAt) reject('invalid_time');
  const result = reconcileCedulas({
    previousRecords: before.records, currentRecords: after.records,
    previousRun: { scope: 'complete_within_scope', count: before.manifest.count },
    currentRun: { scope: 'complete_within_scope', count: after.manifest.count },
    suppressions,
  });
  // Complete observed absence remains source_missing even when the engine marks
  // anomalous-run events failed; the circuit breaker still blocks publication.
  const currentIds = new Set(after.records.map((record) => record.sourceId));
  const missing = before.records.filter((record) => !currentIds.has(record.sourceId)).length;
  const summary = { ...result.summary, source_missing: missing,
    failed: result.summary.failed - (missing - result.summary.source_missing) };
  // Never return event payloads, IDs, record hashes, URLs or private paths.
  return { ok: true, runStatus: result.runStatus, summary,
    anomalyCodes: result.anomalies.map(({ code }) => code),
    publicationMutationsBlocked: result.publicationMutationsBlocked,
    humanReviewRequired: result.humanReviewRequired };
}

module.exports = Object.freeze({ compareBaselines, readValidatedSnapshot });
