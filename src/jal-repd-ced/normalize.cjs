'use strict';

const { RECORD_FIELDS } = require('./schema.cjs');

const SOURCE_ID = 'JAL-REPD-CED';
const NORMALIZATION_VERSION = '1';

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]));
  }
  return value;
}

function copyObservedRecord(record) {
  return Object.fromEntries(RECORD_FIELDS.map((field) => [field, cloneValue(record[field])]));
}

function normalizeRecord(record) {
  return {
    source: SOURCE_ID,
    sourceId: record.id_cedula_busqueda,
    normalizationVersion: NORMALIZATION_VERSION,
    // This is restricted/internal data. `ruta_foto` remains metadata only; it is never fetched.
    internalRecord: copyObservedRecord(record),
  };
}

function redactForPublic(normalizedRecord) {
  return {
    source: normalizedRecord.source,
    sourceId: normalizedRecord.sourceId,
  };
}

module.exports = Object.freeze({
  NORMALIZATION_VERSION,
  SOURCE_ID,
  normalizeRecord,
  redactForPublic,
});
