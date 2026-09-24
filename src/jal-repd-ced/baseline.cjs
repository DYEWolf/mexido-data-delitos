'use strict';

const { createHash } = require('node:crypto');
const { validateResponse } = require('./schema.cjs');
const { normalizeRecord } = require('./normalize.cjs');
const { buildManifest, hashNormalizedRecord } = require('./manifest.cjs');
const { createStorage } = require('./storage.cjs');

const SOURCE_ENDPOINT = 'https://repd.jalisco.gob.mx/api/v1/version_publica/repd-version-publica-cedulas-busqueda/?estado=14';
const DEFAULT_PAGE_SIZE = 100;
const RECORDS_FILE = 'records.ndjson';
const MANIFEST_FILE = 'manifest.json';
const CHECKPOINT_FILE = 'checkpoint.json';
const FAILED_PAGES_FILE = 'failed-pages.ndjson';
const SCHEMA_ERRORS_FILE = 'schema-errors.ndjson';

function baselineError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}
function positiveInteger(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw baselineError('invalid_options');
  return value;
}
function validateSource(value, pageSize) {
  try {
    if (typeof value !== 'string' || value.includes('#')) throw Error();
    const url = new URL(value);
    const expected = new URL(SOURCE_ENDPOINT);
    if (url.origin !== expected.origin || url.pathname !== expected.pathname
      || url.username || url.password || url.hash) throw Error();
    const params = [...url.searchParams];
    if (params.length !== new Set(params.map(([key]) => key)).size
      || params.some(([key]) => !['estado', 'page', 'limit'].includes(key))
      || url.searchParams.get('estado') !== '14'
      || (url.searchParams.has('page') && url.searchParams.get('page') !== '1')
      || (url.searchParams.has('limit') && url.searchParams.get('limit') !== String(pageSize))) throw Error();
    return value;
  } catch (_) { throw baselineError('invalid_source'); }
}
function recordDigest(records) {
  return createHash('sha256').update(JSON.stringify(records)).digest('hex');
}
function checkpointFor(state) {
  return {
    schemaVersion: '1', sourceId: 'JAL-REPD-CED',
    sourceEndpoint: state.sourceEndpoint, pageSize: state.pageSize,
    startPage: state.startPage, assetPolicy: state.assetPolicy, observedAt: state.observedAt,
    nextPage: state.nextPage, discovered: state.discovered,
    completedPages: [...state.completedPages].sort((a, b) => a - b),
    recordCount: state.recordsById.size, recordDigest: recordDigest([...state.recordsById.values()]),
    duplicateCount: state.duplicateCount,
    failedPageCount: state.failedPages.length, schemaErrorCount: state.schemaErrors.length,
    dryRun: !!state.dryRun,
  };
}
function validateCheckpoint(checkpoint, state, records) {
  const valid = checkpoint && checkpoint.schemaVersion === '1' && checkpoint.sourceId === 'JAL-REPD-CED'
    && checkpoint.sourceEndpoint === state.sourceEndpoint && checkpoint.pageSize === state.pageSize
    && checkpoint.startPage === state.startPage && checkpoint.assetPolicy === state.assetPolicy
    && (state.requestedObservedAt === undefined || checkpoint.observedAt === state.requestedObservedAt)
    && typeof checkpoint.observedAt === 'string' && !Number.isNaN(Date.parse(checkpoint.observedAt))
    && checkpoint.discovered && Number.isSafeInteger(checkpoint.discovered.count)
    && checkpoint.discovered.count >= 0 && positiveBound(checkpoint.discovered.totalPages)
    && positiveBound(checkpoint.nextPage) && checkpoint.nextPage <= checkpoint.discovered.totalPages + 1
    && Array.isArray(checkpoint.completedPages)
    && checkpoint.completedPages.every((page, index) => page === state.startPage + index)
    && checkpoint.nextPage === state.startPage + checkpoint.completedPages.length
    && checkpoint.completedPages.every((page) => page <= checkpoint.discovered.totalPages)
    && checkpoint.recordCount === records.length && checkpoint.recordDigest === recordDigest(records)
    && Number.isSafeInteger(checkpoint.duplicateCount) && checkpoint.duplicateCount >= 0
    && checkpoint.failedPageCount === state.failedPages.length
    && checkpoint.schemaErrorCount === state.schemaErrors.length && checkpoint.dryRun === false
    && records.every((row) => row && typeof row.sourceId === 'string' && row.sourceId.length
      && row.source === 'JAL-REPD-CED' && row.internalRecord?.id_cedula_busqueda === row.sourceId)
    && new Set(records.map((row) => row.sourceId)).size === records.length;
  if (!valid) throw baselineError('invalid_checkpoint');
  if (state.failedPages.length || state.schemaErrors.length) throw baselineError('failed_resume_unsupported');
  state.observedAt = checkpoint.observedAt;
  state.discovered = checkpoint.discovered;
  state.nextPage = checkpoint.nextPage;
  state.completedPages = new Set(checkpoint.completedPages);
  state.recordsById = new Map(records.map((record) => [record.sourceId, record]));
  state.duplicateCount = checkpoint.duplicateCount;
}
function positiveBound(value) { return Number.isSafeInteger(value) && value >= 1; }
function compareHashes(left, right) {
  if (left.sourceId < right.sourceId) return -1;
  if (left.sourceId > right.sourceId) return 1;
  return left.sha256.localeCompare(right.sha256);
}
function buildBaselineManifest(state, pages, boundsCheck, scope) {
  const records = [...state.recordsById.values()].sort((a, b) => a.sourceId.localeCompare(b.sourceId));
  const manifest = buildManifest({
    response: { count: state.discovered.count, total_pages: state.discovered.totalPages },
    normalizedRecords: records, observedAt: state.observedAt, sourceEndpoint: state.sourceEndpoint, scope,
  });
  const recordHashes = records.map((record) => ({ sourceId: record.sourceId,
    sha256: hashNormalizedRecord(record) })).sort(compareHashes);
  return { records, manifest: { ...manifest,
    sourceIds: recordHashes.map((record) => record.sourceId), recordHashes,
    baseline: { assetPolicy: state.assetPolicy, pages,
      duplicateCount: state.duplicateCount, failedPageCount: state.failedPages.length,
      schemaErrorCount: state.schemaErrors.length, boundsCheck } } };
}
async function fetchAndValidatePage(fetchPage, request) {
  const response = await fetchPage(request);
  return { response, validation: validateResponse(response) };
}

async function runBaseline(options) {
  if (!options || typeof options.fetchPage !== 'function' || typeof options.outputDirectory !== 'string'
    || !options.outputDirectory) throw baselineError('invalid_options');
  const pageSize = positiveInteger(options.pageSize === undefined ? DEFAULT_PAGE_SIZE : options.pageSize);
  const startPage = positiveInteger(options.startPage === undefined ? 1 : options.startPage);
  const maxPages = options.maxPages === undefined ? undefined : positiveInteger(options.maxPages);
  const assetPolicy = options.assets === undefined ? 'metadata_only' : options.assets;
  if (!['metadata_only', 'skip'].includes(assetPolicy)) throw baselineError('invalid_options');
  const sourceEndpoint = validateSource(options.sourceEndpoint === undefined ? SOURCE_ENDPOINT : options.sourceEndpoint, pageSize);
  if (options.observedAt !== undefined && (typeof options.observedAt !== 'string'
    || Number.isNaN(Date.parse(options.observedAt)))) throw baselineError('invalid_options');
  const storage = createStorage(options.outputDirectory, options.storageOptions || {});
  const state = { sourceEndpoint, pageSize, startPage, assetPolicy,
    requestedObservedAt: options.observedAt, observedAt: options.observedAt || new Date().toISOString(),
    nextPage: startPage, discovered: null, completedPages: new Set(), recordsById: new Map(),
    duplicateCount: 0, failedPages: storage.readNdjson(FAILED_PAGES_FILE),
    schemaErrors: storage.readNdjson(SCHEMA_ERRORS_FILE) };
  let checkpoint;
  let existingRecords;
  try {
    checkpoint = storage.readJson(CHECKPOINT_FILE);
    existingRecords = storage.readNdjson(RECORDS_FILE);
  } catch (_) { throw baselineError('invalid_checkpoint'); }
  if (options.resume === false) {
    if (checkpoint || existingRecords.length || state.failedPages.length || state.schemaErrors.length) {
      throw baselineError('existing_output');
    }
  } else if (checkpoint) {
    validateCheckpoint(checkpoint, state, existingRecords);
  } else if (existingRecords.length || state.failedPages.length || state.schemaErrors.length) {
    throw baselineError('invalid_checkpoint');
  }
  if (!state.discovered) {
    const { response, validation } = await fetchAndValidatePage(options.fetchPage,
      { page: startPage, pageSize, purpose: 'discover' });
    if (!validation.valid || !Number.isSafeInteger(response.count) || response.count < 0
      || !positiveBound(response.total_pages) || startPage > response.total_pages) {
      throw baselineError('discovery_validation_failed');
    }
    state.discovered = { count: response.count, totalPages: response.total_pages };
  }
  const lastDiscoveredPage = state.discovered.totalPages;
  const lastPage = Math.min(lastDiscoveredPage, maxPages === undefined
    ? lastDiscoveredPage : startPage + maxPages - 1);
  const pages = { startPage, lastPage, lastDiscoveredPage, pageSize, maxPages: maxPages || null };
  if (options.dryRun) return { ok: true, dryRun: true, discovered: state.discovered,
    plannedPages: { startPage: state.nextPage, lastPage, lastDiscoveredPage },
    outputDirectory: storage.outputDirectory, checkpoint: checkpoint || null };

  for (let page = state.nextPage; page <= lastPage; page += 1) {
    try {
      const { response, validation } = await fetchAndValidatePage(options.fetchPage,
        { page, pageSize, purpose: 'traverse' });
      if (!validation.valid || !Number.isSafeInteger(response.count)
        || !positiveBound(response.total_pages)
        || response.count !== state.discovered.count
        || response.total_pages !== state.discovered.totalPages) {
        state.schemaErrors.push({ page, code: 'invalid_page', phase: 'traverse' });
        storage.writeNdjson(SCHEMA_ERRORS_FILE, state.schemaErrors);
        break;
      }
      for (const rawRecord of response.results) {
        const normalized = normalizeRecord(rawRecord);
        if (state.recordsById.has(normalized.sourceId)) { state.duplicateCount += 1; continue; }
        state.recordsById.set(normalized.sourceId, normalized);
      }
      state.completedPages.add(page);
      state.nextPage = page + 1;
      storage.writeNdjson(RECORDS_FILE, [...state.recordsById.values()]);
      storage.writeJson(CHECKPOINT_FILE, checkpointFor(state));
    } catch (_) {
      state.failedPages.push({ page, code: 'fetch_failed' });
      storage.writeNdjson(FAILED_PAGES_FILE, state.failedPages);
      break;
    }
  }
  // Always require an end observation for completion; disabling it only yields a partial snapshot.
  let boundsCheck = { checked: false, changed: false };
  if (options.requeryBounds !== false && state.nextPage > lastDiscoveredPage
    && state.failedPages.length === 0 && state.schemaErrors.length === 0) {
    try {
      const { response, validation } = await fetchAndValidatePage(options.fetchPage,
        { page: startPage, pageSize, purpose: 'bounds-check' });
      if (validation.valid && response.count === state.discovered.count
        && response.total_pages === state.discovered.totalPages) {
        boundsCheck = { checked: true, changed: false, start: state.discovered,
          end: { count: response.count, totalPages: response.total_pages } };
      } else boundsCheck = { checked: true, changed: true };
    } catch (_) { boundsCheck = { checked: true, changed: true }; }
  }
  const coverage = startPage === 1 && lastPage === lastDiscoveredPage
    && state.nextPage === lastDiscoveredPage + 1
    && state.completedPages.size === lastDiscoveredPage
    && [...state.completedPages].every((page) => page >= 1 && page <= lastDiscoveredPage)
    && state.recordsById.size === state.discovered.count;
  const scope = coverage && boundsCheck.checked && !boundsCheck.changed
    && state.failedPages.length === 0 && state.schemaErrors.length === 0 && state.duplicateCount === 0
    ? 'complete_within_scope' : 'partial';
  const { records, manifest } = buildBaselineManifest(state, pages, boundsCheck, scope);
  storage.writeNdjson(RECORDS_FILE, [...state.recordsById.values()]);
  storage.writeNdjson(FAILED_PAGES_FILE, state.failedPages);
  storage.writeNdjson(SCHEMA_ERRORS_FILE, state.schemaErrors);
  storage.writeJson(MANIFEST_FILE, manifest);
  storage.writeJson(CHECKPOINT_FILE, checkpointFor(state));
  return { ok: scope === 'complete_within_scope', outputDirectory: storage.outputDirectory,
    discovered: state.discovered, records, duplicateCount: state.duplicateCount,
    failedPages: state.failedPages, schemaErrors: state.schemaErrors, boundsCheck, manifest };
}

module.exports = Object.freeze({ CHECKPOINT_FILE, FAILED_PAGES_FILE, MANIFEST_FILE,
  RECORDS_FILE, SCHEMA_ERRORS_FILE, SOURCE_ENDPOINT, validateSource, runBaseline });
