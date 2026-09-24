'use strict';

const SOURCE_ID = 'JAL-REPD-STATS';
const STATS_MODEL_VERSION = '1';

function modelError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function requireString(value, name) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw modelError('invalid_stats_model', `${name} must be a non-empty string.`);
  }
  return value.trim();
}

function requireNumber(value, name) {
  if (!Number.isFinite(value)) {
    throw modelError('invalid_stats_model', `${name} must be a finite number.`);
  }
  return value;
}

function normalizeGeoCode(value) {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
}

function createMetricDefinition(options = {}) {
  const metricId = requireString(options.metricId, 'metricId');
  return Object.freeze({
    kind: 'MetricDefinition',
    modelVersion: STATS_MODEL_VERSION,
    sourceId: options.sourceId || SOURCE_ID,
    metricId,
    sourceMetricName: requireString(options.sourceMetricName || metricId, 'sourceMetricName'),
    definition: requireString(options.definition, 'definition'),
    unit: requireString(options.unit || 'persons', 'unit'),
    geoLevel: requireString(options.geoLevel || 'unknown', 'geoLevel'),
  });
}

function createAggregateObservation(options = {}) {
  const value = requireNumber(options.value, 'value');
  return Object.freeze({
    kind: 'AggregateObservation',
    modelVersion: STATS_MODEL_VERSION,
    sourceId: options.sourceId || SOURCE_ID,
    metricId: requireString(options.metricId, 'metricId'),
    sourceMetricName: requireString(options.sourceMetricName || options.metricId, 'sourceMetricName'),
    definition: requireString(options.definition, 'definition'),
    cutoff: requireString(options.cutoff, 'cutoff'),
    geoLevel: requireString(options.geoLevel || 'unknown', 'geoLevel'),
    geoCode: normalizeGeoCode(options.geoCode),
    value,
    unit: requireString(options.unit || 'persons', 'unit'),
    runId: options.runId ? requireString(options.runId, 'runId') : undefined,
    bucketStatus: options.bucketStatus || 'mapped',
    bucketLabel: options.bucketLabel,
    evidenceStatus: options.evidenceStatus || 'observed',
  });
}

function sumObservations(observations, predicate = () => true) {
  if (!Array.isArray(observations)) throw modelError('invalid_stats_model', 'observations must be an array.');
  return observations.filter(predicate).reduce((sum, observation) => sum + requireNumber(observation.value, 'observation.value'), 0);
}

function reconcileAggregateBuckets(options = {}) {
  const totalObservation = options.totalObservation;
  const bucketObservations = options.bucketObservations || [];
  if (!totalObservation || !Array.isArray(bucketObservations)) {
    throw modelError('invalid_stats_model', 'totalObservation and bucketObservations are required.');
  }
  const mappedTotal = sumObservations(bucketObservations, (observation) => observation.bucketStatus !== 'unreconciled');
  const gap = totalObservation.value - mappedTotal;
  const observations = [...bucketObservations];
  let unreconciledObservation = null;

  if (gap !== 0) {
    unreconciledObservation = createAggregateObservation({
      sourceId: totalObservation.sourceId,
      metricId: `${totalObservation.metricId}:unreconciled_gap`,
      sourceMetricName: `${totalObservation.sourceMetricName} unreconciled gap`,
      definition: options.gapDefinition || 'Difference between the preserved source total and the sum of currently mappable buckets; not manually corrected.',
      cutoff: totalObservation.cutoff,
      geoLevel: options.gapGeoLevel || 'non_mappable',
      geoCode: null,
      value: gap,
      unit: totalObservation.unit,
      runId: totalObservation.runId,
      bucketStatus: 'unreconciled',
      bucketLabel: options.gapLabel || 'unreconciled_or_non_mappable_gap',
      evidenceStatus: options.evidenceStatus || 'unexplained',
    });
    observations.push(unreconciledObservation);
  }

  return Object.freeze({
    kind: 'AggregateReconciliation',
    modelVersion: STATS_MODEL_VERSION,
    sourceId: totalObservation.sourceId || SOURCE_ID,
    cutoff: totalObservation.cutoff,
    totalObservation,
    mappedTotal,
    sourceTotal: totalObservation.value,
    gap,
    status: gap === 0 ? 'reconciled' : 'unreconciled',
    observations,
    unreconciledObservation,
  });
}

function createKnownReputedStatsDiscrepancy(options = {}) {
  const cutoff = options.cutoff || '2026-08-31';
  const runId = options.runId || 'synthetic-known-discrepancy';
  const total = createAggregateObservation({
    metricId: 'total_disappearances',
    sourceMetricName: 'Total disappearances endpoint',
    definition: 'Source-preserved overall disappearance total from the observed REPD-STATS endpoint.',
    cutoff,
    geoLevel: 'state',
    geoCode: '14',
    value: options.sourceTotal ?? 16250,
    runId,
  });
  // Observed 2026-09-24 (cutoff 2026-08-31): the map's 16,203 = 16,117 in the 125 municipalities + 86 in
  // "SE IGNORA" (clave 0). The remaining 47 (38 HOMBRE, 9 MUJER) appear in the year/sex series but in no map key.
  const unknownMunicipality = options.unknownMunicipalityTotal ?? 86;
  const municipal = createAggregateObservation({
    metricId: 'municipality_disappeared_sum',
    sourceMetricName: 'Municipality disappeared map bucket sum',
    definition: 'Sum of the 125 Jalisco municipality buckets from the observed REPD-STATS map endpoint, excluding the SE IGNORA bucket.',
    cutoff,
    geoLevel: 'municipality_sum',
    geoCode: null,
    value: (options.mappedTotal ?? 16203) - unknownMunicipality,
    runId,
  });
  const unknown = createAggregateObservation({
    metricId: 'unknown_municipality_disappeared',
    sourceMetricName: 'Map bucket SE IGNORA (clave_geoestadistica_municipal 0)',
    definition: 'Disappeared persons the map endpoint files under SE IGNORA; not mappable and never a municipal rate numerator.',
    cutoff,
    geoLevel: 'non_municipal_bucket',
    geoCode: null,
    value: unknownMunicipality,
    runId,
  });
  return reconcileAggregateBuckets({ totalObservation: total, bucketObservations: [municipal, unknown] });
}

module.exports = Object.freeze({
  SOURCE_ID,
  STATS_MODEL_VERSION,
  createAggregateObservation,
  createKnownReputedStatsDiscrepancy,
  createMetricDefinition,
  reconcileAggregateBuckets,
  sumObservations,
});
