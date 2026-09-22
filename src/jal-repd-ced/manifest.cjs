'use strict';

const { createHash } = require('node:crypto');
const { SOURCE_ID } = require('./normalize.cjs');

const DEFAULT_SOURCE_ENDPOINT = 'https://version-publica-repd.jalisco.gob.mx/cedulas-de-busqueda';

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

  return `{${Object.keys(value).sort().map((key) => (
    `${JSON.stringify(key)}:${stableStringify(value[key])}`
  )).join(',')}}`;
}

function hashNormalizedRecord(normalizedRecord) {
  return createHash('sha256').update(stableStringify(normalizedRecord), 'utf8').digest('hex');
}

function warning(code, message) {
  return { code, message };
}

function buildWarnings({ scope, response, recordCount }) {
  const warnings = [];
  if (scope === 'sample') {
    warnings.push(warning('sample_scope', 'This manifest represents a declared sample, not complete source coverage.'));
  } else if (scope === 'partial') {
    warnings.push(warning('partial_scope', 'This manifest represents a declared partial source scope.'));
  } else if (scope === 'unknown') {
    warnings.push(warning('unknown_scope', 'Source coverage is unknown.'));
  }
  if (response.count !== recordCount) {
    warnings.push(warning('reported_count_differs', 'Reported count differs from records in this offline input.'));
  }
  if (response.total_pages > 1) {
    warnings.push(warning('multiple_pages_reported', 'The response reports multiple pages; this offline input may not represent all pages.'));
  }
  return warnings;
}

function compareRecordHashes(left, right) {
  if (left.sourceId < right.sourceId) return -1;
  if (left.sourceId > right.sourceId) return 1;
  if (left.sha256 < right.sha256) return -1;
  if (left.sha256 > right.sha256) return 1;
  return 0;
}

function buildManifest({
  response,
  normalizedRecords,
  observedAt,
  sourceEndpoint = DEFAULT_SOURCE_ENDPOINT,
  scope = 'sample',
}) {
  const recordHashes = normalizedRecords.map((record) => ({
    sourceId: record.sourceId,
    sha256: hashNormalizedRecord(record),
  })).sort(compareRecordHashes);

  return {
    schemaVersion: '1',
    sourceId: SOURCE_ID,
    sourceEndpoint,
    observedAt,
    count: response.count,
    totalPages: response.total_pages,
    recordCount: normalizedRecords.length,
    sourceIds: recordHashes.map((record) => record.sourceId),
    recordHashes,
    scope,
    warnings: buildWarnings({ scope, response, recordCount: normalizedRecords.length }),
  };
}

module.exports = Object.freeze({
  DEFAULT_SOURCE_ENDPOINT,
  buildManifest,
  hashNormalizedRecord,
  stableStringify,
});
