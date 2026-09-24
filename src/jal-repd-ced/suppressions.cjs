'use strict';
// Private, append-only suppression ledger. Entries hold only a sourceId, a fixed reason code and
// timestamps: never free text, names or URLs. Restores append a new entry; nothing is rewritten.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { assertNewDestination } = require('../private-output.cjs');

const LEDGER = 'suppressions.ndjson';
const BACKUP_MANIFEST = 'backup-manifest.json';
const REASONS = new Set(['takedown_request', 'family_request', 'correction', 'privacy', 'legal', 'other']);
const MAX_LEDGER = 16 * 1024 * 1024;

function fail(code) { const e = new Error(code); e.code = code; throw e; }
function sha(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function validSourceId(id) { return typeof id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(id); }

function checkPrivateDir(dir) {
  const s = fs.lstatSync(dir);
  if (!s.isDirectory() || s.uid !== process.getuid() || (s.mode & 0o777) !== 0o700 ||
    fs.realpathSync(dir) !== dir) fail('invalid_ledger');
}
function ledgerFile(dir) { return path.join(dir, LEDGER); }

function readBytes(dir) {
  checkPrivateDir(dir);
  const file = ledgerFile(dir);
  if (!fs.existsSync(file)) return Buffer.alloc(0);
  const s = fs.lstatSync(file);
  if (!s.isFile() || (s.mode & 0o777) !== 0o600 || s.size > MAX_LEDGER) fail('invalid_ledger');
  return fs.readFileSync(file);
}

function parse(bytes) {
  const text = bytes.toString('utf8');
  if (text && !text.endsWith('\n')) fail('invalid_ledger');
  const entries = text ? text.slice(0, -1).split('\n').map((line) => {
    let e;
    try { e = JSON.parse(line); } catch { fail('invalid_ledger'); }
    if (!['suppress', 'restore'].includes(e?.action) || !/^[a-f0-9]{32}$/.test(e.suppressionId) ||
      !validSourceId(e.sourceId) || Number.isNaN(Date.parse(e.at)) ||
      (e.action === 'suppress' && !REASONS.has(e.reason))) fail('invalid_ledger');
    return e;
  }) : [];
  const ids = new Map();
  for (const e of entries) {
    if (e.action === 'suppress') {
      if (ids.has(e.suppressionId)) fail('invalid_ledger');
      ids.set(e.suppressionId, e);
    } else if (ids.get(e.suppressionId)?.sourceId !== e.sourceId) fail('invalid_ledger');
  }
  return entries;
}

function readLedger(dir) { return parse(readBytes(dir)); }

// Shape consumed by reconcileCedulas: one row per suppression, restored rows carry restoredAt.
function toReconcileInput(entries) {
  const rows = new Map();
  for (const e of entries) {
    if (e.action === 'suppress') {
      rows.set(e.suppressionId, { suppressionId: e.suppressionId, sourceId: e.sourceId,
        status: 'active', reason: e.reason, createdAt: e.at });
    } else Object.assign(rows.get(e.suppressionId), { status: 'restored', restoredAt: e.at });
  }
  return [...rows.values()];
}

function append(dir, entry) {
  const current = readBytes(dir);
  parse(current);
  const fd = fs.openSync(ledgerFile(dir), fs.constants.O_WRONLY | fs.constants.O_APPEND |
    fs.constants.O_CREAT | fs.constants.O_NOFOLLOW, 0o600);
  try { fs.writeSync(fd, JSON.stringify(entry) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  return entry;
}

function initLedger(dir) {
  assertNewDestination(dir);
  fs.mkdirSync(dir, { mode: 0o700 });
  return dir;
}

function suppress(dir, sourceId, reason, now = new Date()) {
  if (!validSourceId(sourceId) || !REASONS.has(reason)) fail('invalid_arguments');
  const active = toReconcileInput(readLedger(dir)).find((r) => r.sourceId === sourceId && r.status === 'active');
  if (active) return { suppressionId: active.suppressionId, alreadyActive: true };
  return append(dir, { action: 'suppress', suppressionId: crypto.randomBytes(16).toString('hex'),
    sourceId, reason, at: now.toISOString() });
}

function restore(dir, sourceId, now = new Date()) {
  if (!validSourceId(sourceId)) fail('invalid_arguments');
  const active = toReconcileInput(readLedger(dir)).find((r) => r.sourceId === sourceId && r.status === 'active');
  if (!active) fail('not_suppressed');
  return append(dir, { action: 'restore', suppressionId: active.suppressionId, sourceId, at: now.toISOString() });
}

function summary(dir) {
  const rows = toReconcileInput(readLedger(dir));
  return { entries: readLedger(dir).length, active: rows.filter((r) => r.status === 'active').length,
    restored: rows.filter((r) => r.status === 'restored').length };
}

// Backups go to a new private directory with a hash manifest; restore writes a NEW ledger dir only.
function backup(dir, backupDir, now = new Date()) {
  const bytes = readBytes(dir);
  parse(bytes);
  assertNewDestination(backupDir);
  fs.mkdirSync(backupDir, { mode: 0o700 });
  fs.writeFileSync(path.join(backupDir, LEDGER), bytes, { mode: 0o600, flag: 'wx' });
  const manifest = { version: 1, file: LEDGER, bytes: bytes.length, sha256: sha(bytes), createdAt: now.toISOString() };
  fs.writeFileSync(path.join(backupDir, BACKUP_MANIFEST), JSON.stringify(manifest) + '\n', { mode: 0o600, flag: 'wx' });
  return manifest;
}

function restoreBackup(backupDir, newDir) {
  checkPrivateDir(backupDir);
  const manifest = JSON.parse(fs.readFileSync(path.join(backupDir, BACKUP_MANIFEST), 'utf8'));
  const bytes = readBytes(backupDir);
  if (manifest.file !== LEDGER || bytes.length !== manifest.bytes || sha(bytes) !== manifest.sha256) fail('backup_mismatch');
  parse(bytes);
  initLedger(newDir);
  fs.writeFileSync(ledgerFile(newDir), bytes, { mode: 0o600, flag: 'wx' });
  return { sha256: sha(readBytes(newDir)), bytes: bytes.length };
}

module.exports = Object.freeze({ REASONS, initLedger, readLedger, toReconcileInput, suppress, restore,
  summary, backup, restoreBackup });
