'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createAssetVersion,
  createCedula,
  createCedulaVersion,
  createSourceRecord,
  createSourceRun,
  createSuppression,
} = require('../src/jal-repd-ced/canonical.cjs');
const { reconcileCedulas } = require('../src/jal-repd-ced/reconcile.cjs');

function run(id, overrides = {}) {
  return createSourceRun({
    runId: id,
    observedAt: '2026-01-03T04:05:06.000Z',
    status: 'success',
    scope: 'complete_within_scope',
    complete: true,
    count: overrides.recordCount ?? overrides.count ?? 1,
    recordCount: overrides.recordCount ?? overrides.count ?? 1,
    ...overrides,
  });
}

function record(sourceId, recordHash = 'record-a', assetHash = 'asset-a', overrides = {}) {
  return createSourceRecord({
    sourceId,
    runId: overrides.runId || 'run',
    recordHash,
    assets: assetHash === null ? [] : [createAssetVersion({
      sourceId,
      assetId: `asset:${sourceId}`,
      contentHash: assetHash,
      runId: overrides.runId || 'run',
    })],
    ...overrides,
  });
}

function eventStatuses(result) {
  return result.events.map((event) => [event.sourceId, event.status]);
}

test('canonical constructors create DB-independent provenance objects', () => {
  const cedula = createCedula({ sourceId: 'SYN-001', firstObservedRunId: 'run-a' });
  const version = createCedulaVersion({ sourceId: 'SYN-001', runId: 'run-a', payload: { field: 'value' } });

  assert.equal(cedula.kind, 'Cedula');
  assert.equal(version.kind, 'CedulaVersion');
  assert.equal(version.sourceId, 'SYN-001');
  assert.match(version.recordHash, /^[a-f0-9]{64}$/);
});

test('reconciliation reports new records without database state', () => {
  const result = reconcileCedulas({
    previousRun: run('run-a', { count: 0, recordCount: 0 }),
    currentRun: run('run-b'),
    previousRecords: [],
    currentRecords: [record('SYN-001')],
  });

  assert.deepEqual(eventStatuses(result), [['SYN-001', 'new']]);
  assert.equal(result.events[0].publicationMutation, 'new');
  assert.equal(result.runStatus, 'success');
});

test('reconciliation reports unchanged records for identical record and asset hashes', () => {
  const previous = record('SYN-001', 'record-a', 'asset-a', { runId: 'run-a' });
  const current = record('SYN-001', 'record-a', 'asset-a', { runId: 'run-b' });

  const result = reconcileCedulas({
    previousRun: run('run-a'),
    currentRun: run('run-b'),
    previousRecords: [previous],
    currentRecords: [current],
  });

  assert.deepEqual(eventStatuses(result), [['SYN-001', 'unchanged']]);
  assert.equal(result.events[0].publicationMutation, 'none');
});

test('reconciliation reports changed when canonical record hash changes', () => {
  const result = reconcileCedulas({
    previousRun: run('run-a'),
    currentRun: run('run-b'),
    previousRecords: [record('SYN-001', 'record-a', 'asset-a')],
    currentRecords: [record('SYN-001', 'record-b', 'asset-a')],
  });

  assert.deepEqual(eventStatuses(result), [['SYN-001', 'changed']]);
  assert.equal(result.events[0].publicationMutation, 'changed');
});

test('reconciliation reports asset_changed when only asset bytes change', () => {
  const result = reconcileCedulas({
    previousRun: run('run-a'),
    currentRun: run('run-b'),
    previousRecords: [record('SYN-001', 'record-a', 'asset-a')],
    currentRecords: [record('SYN-001', 'record-a', 'asset-b')],
  });

  assert.deepEqual(eventStatuses(result), [['SYN-001', 'asset_changed']]);
  assert.equal(result.events[0].publicationMutation, 'asset_changed');
});

test('complete successful absence creates source_missing without implying localization', () => {
  const result = reconcileCedulas({
    previousRun: run('run-a'),
    currentRun: run('run-b', { count: 0, recordCount: 0 }),
    previousRecords: [record('SYN-001')],
    currentRecords: [],
  });

  assert.deepEqual(eventStatuses(result), [['SYN-001', 'source_missing']]);
  assert.equal(result.events[0].humanReviewRequired, true);
  assert.equal(result.events[0].reason, undefined);
});

test('failed or incomplete pages do not create source_missing', () => {
  const result = reconcileCedulas({
    previousRun: run('run-a'),
    currentRun: run('run-b', {
      complete: false,
      scope: 'partial',
      failedPages: [{ page: 2, code: 'synthetic_failure' }],
      failedPageCount: 1,
      count: 1,
      recordCount: 0,
    }),
    previousRecords: [record('SYN-001')],
    currentRecords: [],
  });

  assert.deepEqual(eventStatuses(result), [['SYN-001', 'failed']]);
  assert.equal(result.events[0].reason, 'current_run_anomalous');
  assert.equal(result.summary.source_missing, 0);
});

test('anomalous count drop trips circuit breaker and blocks publication mutations', () => {
  const previousRecords = Array.from({ length: 10 }, (_, index) => record(`SYN-${String(index).padStart(3, '0')}`));
  const currentRecords = [previousRecords[0]];
  const result = reconcileCedulas({
    previousRun: run('run-a', { count: 10, recordCount: 10 }),
    currentRun: run('run-b', { count: 1, recordCount: 1 }),
    previousRecords,
    currentRecords,
  });

  assert.equal(result.runStatus, 'anomalous');
  assert.equal(result.publicationMutationsBlocked, true);
  assert.equal(result.humanReviewRequired, true);
  assert.equal(result.anomalies[0].code, 'abrupt_count_drop');
  assert.equal(result.events.find((event) => event.status === 'failed').publicationMutation, 'none');
});

test('schema, login-like JSON, and widespread asset failures trip the circuit breaker', () => {
  const result = reconcileCedulas({
    previousRun: run('run-a'),
    currentRun: run('run-b', {
      schemaErrors: [{ path: 'response.results[0]' }],
      loginLikeError: true,
      assetSummary: { failed: 5, succeeded: 5 },
    }),
    previousRecords: [record('SYN-001', 'record-a', 'asset-a')],
    currentRecords: [record('SYN-001', 'record-b', 'asset-b')],
  });

  assert.equal(result.runStatus, 'anomalous');
  assert.deepEqual(result.anomalies.map((anomaly) => anomaly.code), [
    'schema_unexpected',
    'login_or_error_like_json',
    'widespread_asset_failures',
  ]);
  assert.equal(result.events[0].publicationMutation, 'blocked');
});

test('suppression ledger survives reimport and keeps records suppressed', () => {
  const result = reconcileCedulas({
    previousRun: run('run-a'),
    currentRun: run('run-b'),
    previousRecords: [],
    currentRecords: [record('SYN-001')],
    suppressions: [createSuppression({ sourceId: 'SYN-001', reason: 'takedown', createdAt: '2026-01-04T00:00:00.000Z' })],
  });

  assert.deepEqual(eventStatuses(result), [['SYN-001', 'suppressed']]);
  assert.equal(result.events[0].suppression.active, true);
  assert.equal(result.events[0].publicationMutation, 'none');
});

test('deliberate restoration makes the next reimport publishable again', () => {
  const restored = createSuppression({
    sourceId: 'SYN-001',
    reason: 'takedown',
    createdAt: '2026-01-04T00:00:00.000Z',
    restoredAt: '2026-01-05T00:00:00.000Z',
    restoredBy: 'synthetic-reviewer',
  });
  const result = reconcileCedulas({
    previousRun: run('run-a', { count: 0, recordCount: 0 }),
    currentRun: run('run-b'),
    previousRecords: [],
    currentRecords: [record('SYN-001')],
    suppressions: [restored],
  });

  assert.deepEqual(eventStatuses(result), [['SYN-001', 'new']]);
  assert.equal(result.events[0].suppression.active, false);
  assert.equal(result.events[0].publicationMutation, 'new');
});

test('same inputs produce idempotent reconciliation events', () => {
  const input = {
    previousRun: run('run-a', { count: 2, recordCount: 2 }),
    currentRun: run('run-b', { count: 2, recordCount: 2 }),
    previousRecords: [record('SYN-002', 'record-a', 'asset-a'), record('SYN-001', 'record-a', 'asset-a')],
    currentRecords: [record('SYN-001', 'record-b', 'asset-a'), record('SYN-002', 'record-a', 'asset-a')],
    suppressions: [createSuppression({ sourceId: 'SYN-003', reason: 'takedown' })],
  };

  assert.deepEqual(reconcileCedulas(input), reconcileCedulas(input));
});
