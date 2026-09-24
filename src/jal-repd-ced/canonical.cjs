'use strict';

const { createHash } = require('node:crypto');
const { SOURCE_ID } = require('./normalize.cjs');
const { stableStringify } = require('./manifest.cjs');

const CANONICAL_SCHEMA_VERSION = '1';

function sha256(value) {
  return createHash('sha256').update(stableStringify(value), 'utf8').digest('hex');
}

function omitUndefined(value) {
  if (Array.isArray(value)) return value.map(omitUndefined);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, omitUndefined(item)]),
    );
  }
  return value;
}

function modelError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function requireString(value, name) {
  if (typeof value !== 'string' || value.length === 0) {
    throw modelError('invalid_canonical_model', `${name} must be a non-empty string.`);
  }
  return value;
}

function optionalArray(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function createSourceRun(options = {}) {
  const runId = requireString(options.runId || options.id, 'runId');
  return omitUndefined({
    kind: 'SourceRun',
    schemaVersion: CANONICAL_SCHEMA_VERSION,
    source: options.source || SOURCE_ID,
    runId,
    observedAt: options.observedAt,
    status: options.status || 'success',
    scope: options.scope,
    complete: options.complete,
    discovered: options.discovered,
    count: options.count,
    recordCount: options.recordCount,
    failedPages: optionalArray(options.failedPages),
    schemaErrors: optionalArray(options.schemaErrors),
    assetSummary: options.assetSummary || options.assets,
    schemaUnexpected: options.schemaUnexpected,
    unexpectedSchema: options.unexpectedSchema,
    loginLikeError: options.loginLikeError,
    errorLikeJson: options.errorLikeJson,
    flags: options.flags,
    provenance: options.provenance,
  });
}

function createSourceRecord(options = {}) {
  const sourceId = requireString(options.sourceId, 'sourceId');
  return omitUndefined({
    kind: 'SourceRecord',
    schemaVersion: CANONICAL_SCHEMA_VERSION,
    source: options.source || SOURCE_ID,
    sourceId,
    runId: options.runId,
    recordHash: options.recordHash || options.contentHash,
    status: options.status || 'observed',
    payload: options.payload,
    assets: optionalArray(options.assets),
    provenance: options.provenance,
  });
}

function createCedula(options = {}) {
  const sourceId = requireString(options.sourceId, 'sourceId');
  return omitUndefined({
    kind: 'Cedula',
    schemaVersion: CANONICAL_SCHEMA_VERSION,
    source: options.source || SOURCE_ID,
    sourceId,
    currentVersionId: options.currentVersionId,
    firstObservedRunId: options.firstObservedRunId,
    latestObservedRunId: options.latestObservedRunId,
    publicationStatus: options.publicationStatus || 'pending',
    provenance: options.provenance,
  });
}

function createCedulaVersion(options = {}) {
  const sourceId = requireString(options.sourceId, 'sourceId');
  const versionId = options.versionId || `${sourceId}:${options.recordHash || options.contentHash || sha256(options.payload || {})}`;
  return omitUndefined({
    kind: 'CedulaVersion',
    schemaVersion: CANONICAL_SCHEMA_VERSION,
    source: options.source || SOURCE_ID,
    sourceId,
    versionId,
    runId: options.runId,
    recordHash: options.recordHash || options.contentHash || sha256(options.payload || {}),
    payload: options.payload,
    provenance: options.provenance,
  });
}

function createAsset(options = {}) {
  const assetId = requireString(options.assetId || options.url, 'assetId');
  return omitUndefined({
    kind: 'Asset',
    schemaVersion: CANONICAL_SCHEMA_VERSION,
    source: options.source || SOURCE_ID,
    assetId,
    sourceId: options.sourceId,
    url: options.url,
    currentVersionId: options.currentVersionId,
    provenance: options.provenance,
  });
}

function createAssetVersion(options = {}) {
  const assetId = requireString(options.assetId || options.url, 'assetId');
  const contentHash = requireString(options.contentHash || options.sha256 || options.bytesHash, 'contentHash');
  return omitUndefined({
    kind: 'AssetVersion',
    schemaVersion: CANONICAL_SCHEMA_VERSION,
    source: options.source || SOURCE_ID,
    assetId,
    sourceId: options.sourceId,
    versionId: options.versionId || `${assetId}:${contentHash}`,
    runId: options.runId,
    url: options.url,
    contentHash,
    mimeType: options.mimeType,
    byteLength: options.byteLength,
    status: options.status || 'fetched',
    provenance: options.provenance,
  });
}

function createSuppression(options = {}) {
  const sourceId = requireString(options.sourceId, 'sourceId');
  const suppressionId = options.suppressionId || `suppression:${sourceId}:${options.reason || 'unspecified'}`;
  return omitUndefined({
    kind: 'Suppression',
    schemaVersion: CANONICAL_SCHEMA_VERSION,
    source: options.source || SOURCE_ID,
    suppressionId,
    sourceId,
    status: options.status || (options.restoredAt ? 'restored' : 'active'),
    reason: options.reason || 'unspecified',
    createdAt: options.createdAt,
    restoredAt: options.restoredAt,
    restoredBy: options.restoredBy,
    provenance: options.provenance,
  });
}

function createReconciliationEvent(options = {}) {
  const sourceId = requireString(options.sourceId, 'sourceId');
  const status = requireString(options.status, 'status');
  return omitUndefined({
    kind: 'ReconciliationEvent',
    schemaVersion: CANONICAL_SCHEMA_VERSION,
    source: options.source || SOURCE_ID,
    eventId: options.eventId || `${sourceId}:${status}:${options.previousHash || 'none'}:${options.currentHash || 'none'}`,
    sourceId,
    status,
    previousRunId: options.previousRunId,
    currentRunId: options.currentRunId,
    previousHash: options.previousHash,
    currentHash: options.currentHash,
    previousAssetHash: options.previousAssetHash,
    currentAssetHash: options.currentAssetHash,
    publicationMutation: options.publicationMutation || 'none',
    humanReviewRequired: !!options.humanReviewRequired,
    reason: options.reason,
    suppression: options.suppression,
    provenance: options.provenance,
  });
}

module.exports = Object.freeze({
  CANONICAL_SCHEMA_VERSION,
  createAsset,
  createAssetVersion,
  createCedula,
  createCedulaVersion,
  createReconciliationEvent,
  createSourceRecord,
  createSourceRun,
  createSuppression,
  hashCanonical: sha256,
});
