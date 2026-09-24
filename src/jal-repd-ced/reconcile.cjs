'use strict';

const { hashNormalizedRecord, stableStringify } = require('./manifest.cjs');
const { createReconciliationEvent } = require('./canonical.cjs');

const MUTATING_STATUSES = new Set(['new', 'changed', 'asset_changed', 'source_missing']);
const TERMINAL_SUPPRESSION_STATUSES = new Set(['restored', 'inactive', 'expired', 'revoked']);

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function compareText(left, right) {
  return String(left).localeCompare(String(right));
}

function sourceIdOf(record) {
  return record?.sourceId || record?.id_cedula_busqueda || record?.internalRecord?.id_cedula_busqueda;
}

function mapBySourceId(records, name) {
  const map = new Map();
  for (const record of asArray(records)) {
    const sourceId = sourceIdOf(record);
    if (!sourceId) {
      throw reconcileError('invalid_reconcile_input', `${name} contains a record without sourceId.`);
    }
    map.set(sourceId, record);
  }
  return map;
}

function reconcileError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function stableHash(value) {
  const { createHash } = require('node:crypto');
  return createHash('sha256').update(stableStringify(value), 'utf8').digest('hex');
}

function recordHash(record) {
  if (!record) return null;
  if (record.recordHash) return record.recordHash;
  if (record.contentHash) return record.contentHash;
  if (record.sha256) return record.sha256;
  if (record.internalRecord) return hashNormalizedRecord(record);
  const comparable = { ...record };
  delete comparable.assets;
  delete comparable.assetVersions;
  delete comparable.provenance;
  delete comparable.runId;
  delete comparable.observedAt;
  return stableHash(comparable);
}

function assetFingerprint(asset) {
  if (typeof asset === 'string') return asset;
  if (!asset || typeof asset !== 'object') return null;
  return [
    asset.assetId || asset.url || asset.path || 'asset',
    asset.contentHash || asset.sha256 || asset.bytesHash || asset.hash || asset.versionId || asset.etag || 'unknown',
  ].join(':');
}

function assetHash(record) {
  if (!record) return null;
  if (record.assetHash) return record.assetHash;
  const assets = asArray(record.assetVersions || record.assets).map(assetFingerprint).filter(Boolean).sort(compareText);
  if (assets.length === 0) return null;
  return stableHash(assets);
}

function numberFromRun(run, names) {
  for (const name of names) {
    const value = name.split('.').reduce((cursor, segment) => cursor?.[segment], run);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function countRecords(run, records) {
  return numberFromRun(run || {}, ['count', 'recordCount', 'discovered.count', 'manifest.count', 'manifest.recordCount'])
    ?? records.length;
}

function hasAny(run, arrayNames, countNames) {
  if (!run) return false;
  for (const name of arrayNames) {
    const value = name.split('.').reduce((cursor, segment) => cursor?.[segment], run);
    if (Array.isArray(value) && value.length > 0) return true;
  }
  for (const name of countNames) {
    const value = name.split('.').reduce((cursor, segment) => cursor?.[segment], run);
    if (Number.isFinite(value) && value > 0) return true;
  }
  return false;
}

function isCompleteSuccessfulRun(run) {
  if (!run) return false;
  if (run.status && !['success', 'succeeded', 'complete'].includes(run.status)) return false;
  if (run.ok === false) return false;
  if (run.complete === false) return false;
  if (run.scope && !['complete', 'complete_within_scope', 'full'].includes(run.scope)) return false;
  if (hasAny(run, ['failedPages', 'schemaErrors'], ['failedPageCount', 'schemaErrorCount'])) return false;
  if (run.boundsCheck?.changed) return false;
  return run.complete === true || ['complete', 'complete_within_scope', 'full'].includes(run.scope || '') || run.ok === true;
}

function assetFailureRatio(run) {
  const assets = run?.assetSummary || run?.assets || {};
  const failed = assets.failed ?? assets.failedCount ?? assets.assetFailedCount ?? 0;
  const succeeded = assets.succeeded ?? assets.success ?? assets.successCount ?? assets.assetSuccessCount ?? 0;
  const total = failed + succeeded;
  return { failed, total, ratio: total === 0 ? 0 : failed / total };
}

function detectAnomalies({ previousRun, currentRun, previousRecords, currentRecords, options }) {
  const anomalies = [];
  if (hasAny(currentRun, ['failedPages'], ['failedPageCount'])) {
    anomalies.push({ code: 'failed_pages', message: 'Current run has failed pages.' });
  }
  if (hasAny(currentRun, ['schemaErrors'], ['schemaErrorCount']) || currentRun?.schemaUnexpected === true || currentRun?.unexpectedSchema === true) {
    anomalies.push({ code: 'schema_unexpected', message: 'Current run reported unexpected schema evidence.' });
  }
  if (currentRun?.loginLikeError === true || currentRun?.errorLikeJson === true || currentRun?.flags?.loginLikeError === true) {
    anomalies.push({ code: 'login_or_error_like_json', message: 'Current run looks like an authentication or application error response.' });
  }

  const previousCount = countRecords(previousRun, previousRecords);
  const currentCount = countRecords(currentRun, currentRecords);
  const dropRatio = options.dropRatio ?? 0.5;
  const dropMinimumPreviousCount = options.dropMinimumPreviousCount ?? 5;
  if (previousCount >= dropMinimumPreviousCount && currentCount < previousCount * (1 - dropRatio)) {
    anomalies.push({
      code: 'abrupt_count_drop',
      message: 'Current source count dropped beyond the configured circuit-breaker ratio.',
      previousCount,
      currentCount,
      dropRatio,
    });
  }

  const assets = assetFailureRatio(currentRun);
  const assetFailureRatioLimit = options.assetFailureRatio ?? 0.25;
  const assetFailureMinimum = options.assetFailureMinimum ?? 3;
  if (assets.failed >= assetFailureMinimum && assets.ratio >= assetFailureRatioLimit) {
    anomalies.push({
      code: 'widespread_asset_failures',
      message: 'Current run has widespread asset failures.',
      failed: assets.failed,
      total: assets.total,
      ratio: assets.ratio,
    });
  }

  return anomalies;
}

function latestSuppressionBySourceId(suppressions) {
  const map = new Map();
  for (const suppression of asArray(suppressions)) {
    if (!suppression?.sourceId) continue;
    const existing = map.get(suppression.sourceId);
    const existingTime = existing?.restoredAt || existing?.createdAt || '';
    const candidateTime = suppression.restoredAt || suppression.createdAt || '';
    if (!existing || candidateTime >= existingTime) map.set(suppression.sourceId, suppression);
  }
  return map;
}

function isActiveSuppression(suppression) {
  if (!suppression) return false;
  if (suppression.restoredAt) return false;
  if (TERMINAL_SUPPRESSION_STATUSES.has(suppression.status)) return false;
  return suppression.status === undefined || suppression.status === 'active';
}

function statusFor({ previous, current, currentRunComplete, runAnomalous }) {
  if (current?.status === 'failed') return 'failed';
  if (!previous && current) return 'new';
  if (previous && !current) return currentRunComplete && !runAnomalous ? 'source_missing' : 'failed';
  if (!previous && !current) return null;

  const previousHash = recordHash(previous);
  const currentHash = recordHash(current);
  if (previousHash !== currentHash) return 'changed';

  const previousAssetHash = assetHash(previous);
  const currentAssetHash = assetHash(current);
  if (previousAssetHash !== currentAssetHash) return 'asset_changed';

  return 'unchanged';
}

function publicationMutation(status, blocked) {
  if (!MUTATING_STATUSES.has(status)) return 'none';
  return blocked ? 'blocked' : status;
}

function reconcileCedulas(input = {}) {
  const previousRecords = asArray(input.previousRecords || input.previous || input.before);
  const currentRecords = asArray(input.currentRecords || input.current || input.after);
  const previousById = mapBySourceId(previousRecords, 'previousRecords');
  const currentById = mapBySourceId(currentRecords, 'currentRecords');
  const suppressionsById = latestSuppressionBySourceId(input.suppressions || input.suppressionLedger);
  const options = input.options || {};
  const previousRun = input.previousRun || {};
  const currentRun = input.currentRun || {};
  const anomalies = detectAnomalies({ previousRun, currentRun, previousRecords, currentRecords, options });
  const runAnomalous = anomalies.length > 0;
  const runStatus = runAnomalous ? 'anomalous' : (currentRun.status || 'success');
  const currentRunComplete = isCompleteSuccessfulRun(currentRun);
  const sourceIds = [...new Set([...previousById.keys(), ...currentById.keys(), ...suppressionsById.keys()])].sort(compareText);

  const events = [];
  for (const sourceId of sourceIds) {
    const previous = previousById.get(sourceId) || null;
    const current = currentById.get(sourceId) || null;
    const suppression = suppressionsById.get(sourceId) || null;
    const activeSuppression = isActiveSuppression(suppression);
    const status = activeSuppression
      ? 'suppressed'
      : statusFor({ previous, current, currentRunComplete, runAnomalous });
    if (!status) continue;

    const previousHash = recordHash(previous);
    const currentHash = recordHash(current);
    const blocked = runAnomalous || activeSuppression;
    events.push(createReconciliationEvent({
      sourceId,
      status,
      previousRunId: previousRun.runId || previousRun.id,
      currentRunId: currentRun.runId || currentRun.id,
      previousHash,
      currentHash,
      previousAssetHash: assetHash(previous),
      currentAssetHash: assetHash(current),
      publicationMutation: publicationMutation(status, blocked),
      humanReviewRequired: runAnomalous || status === 'source_missing' || status === 'failed' || status === 'suppressed',
      reason: status === 'failed' && previous && !current
        ? (runAnomalous ? 'current_run_anomalous' : 'current_run_incomplete')
        : undefined,
      suppression: suppression ? {
        suppressionId: suppression.suppressionId,
        status: suppression.status || 'active',
        active: activeSuppression,
        reason: suppression.reason,
        restoredAt: suppression.restoredAt,
      } : undefined,
      provenance: {
        previousRunId: previousRun.runId || previousRun.id,
        currentRunId: currentRun.runId || currentRun.id,
      },
    }));
  }

  return {
    schemaVersion: '1',
    source: currentRun.source || previousRun.source || 'JAL-REPD-CED',
    previousRunId: previousRun.runId || previousRun.id,
    currentRunId: currentRun.runId || currentRun.id,
    runStatus,
    anomalies,
    publicationMutationsBlocked: runAnomalous,
    humanReviewRequired: runAnomalous || events.some((event) => event.humanReviewRequired),
    events,
    summary: summarize(events),
  };
}

function summarize(events) {
  const summary = {
    new: 0,
    unchanged: 0,
    changed: 0,
    asset_changed: 0,
    source_missing: 0,
    failed: 0,
    suppressed: 0,
  };
  for (const event of events) summary[event.status] += 1;
  return summary;
}

module.exports = Object.freeze({
  reconcileCedulas,
});
