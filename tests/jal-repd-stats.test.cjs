'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createAggregateObservation,
  createKnownReputedStatsDiscrepancy,
  createMetricDefinition,
  reconcileAggregateBuckets,
} = require('../src/jal-repd-stats/model.cjs');

test('metric definitions remain separate from observations', () => {
  const definition = createMetricDefinition({
    metricId: 'total_disappearances',
    sourceMetricName: 'Total disappearances endpoint',
    definition: 'Overall disappearance total as published by the source endpoint.',
    geoLevel: 'state',
  });
  const observation = createAggregateObservation({
    metricId: definition.metricId,
    sourceMetricName: definition.sourceMetricName,
    definition: definition.definition,
    cutoff: '2026-08-31',
    geoLevel: 'state',
    geoCode: '14',
    value: 16250,
    runId: 'run-a',
  });

  assert.equal(definition.kind, 'MetricDefinition');
  assert.equal(observation.kind, 'AggregateObservation');
  assert.equal(observation.geoCode, '14');
});

test('known 16203 vs 16250 discrepancy is modeled as unreconciled gap of 47', () => {
  const reconciliation = createKnownReputedStatsDiscrepancy();

  assert.equal(reconciliation.status, 'unreconciled');
  assert.equal(reconciliation.mappedTotal, 16203);
  assert.equal(reconciliation.sourceTotal, 16250);
  assert.equal(reconciliation.gap, 47);
  assert.equal(reconciliation.unreconciledObservation.value, 47);
  assert.equal(reconciliation.unreconciledObservation.bucketStatus, 'unreconciled');
  assert.equal(reconciliation.unreconciledObservation.evidenceStatus, 'unexplained');
});

test('reconciled buckets do not invent a gap observation', () => {
  const total = createAggregateObservation({
    metricId: 'total',
    sourceMetricName: 'Total',
    definition: 'Synthetic total',
    cutoff: '2026-08-31',
    geoLevel: 'state',
    geoCode: '14',
    value: 3,
  });
  const buckets = [1, 2].map((value, index) => createAggregateObservation({
    metricId: `bucket-${index}`,
    sourceMetricName: `Bucket ${index}`,
    definition: 'Synthetic bucket',
    cutoff: '2026-08-31',
    geoLevel: 'municipality',
    geoCode: `14${String(index).padStart(3, '0')}`,
    value,
  }));

  const reconciliation = reconcileAggregateBuckets({ totalObservation: total, bucketObservations: buckets });
  assert.equal(reconciliation.status, 'reconciled');
  assert.equal(reconciliation.gap, 0);
  assert.equal(reconciliation.unreconciledObservation, null);
});
