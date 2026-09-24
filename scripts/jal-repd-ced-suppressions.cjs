'use strict';
// Usage:
//   node scripts/jal-repd-ced-suppressions.cjs init    --ledger DIR
//   node scripts/jal-repd-ced-suppressions.cjs suppress --ledger DIR --source-id ID --reason CODE
//   node scripts/jal-repd-ced-suppressions.cjs restore  --ledger DIR --source-id ID
//   node scripts/jal-repd-ced-suppressions.cjs summary  --ledger DIR
//   node scripts/jal-repd-ced-suppressions.cjs backup   --ledger DIR --to NEW_DIR
//   node scripts/jal-repd-ced-suppressions.cjs restore-backup --from BACKUP_DIR --to NEW_DIR
// stdout carries only counts, ids generated here, hashes or a fixed reason code.
const s = require('../src/jal-repd-ced/suppressions.cjs');

function parse(args) {
  const [command, ...rest] = args;
  const o = { command };
  for (let i = 0; i < rest.length; i += 2) {
    const key = { '--ledger': 'ledger', '--source-id': 'sourceId', '--reason': 'reason', '--to': 'to', '--from': 'from' }[rest[i]];
    if (!key || o[key] !== undefined || !rest[i + 1]) return null;
    o[key] = rest[i + 1];
  }
  return o;
}

function run(o) {
  switch (o?.command) {
    case 'init': return { ledger: s.initLedger(o.ledger) && 'created' };
    case 'suppress': { const e = s.suppress(o.ledger, o.sourceId, o.reason); return { suppressionId: e.suppressionId, alreadyActive: !!e.alreadyActive }; }
    case 'restore': return { suppressionId: s.restore(o.ledger, o.sourceId).suppressionId, restored: true };
    case 'summary': return s.summary(o.ledger);
    case 'backup': return s.backup(o.ledger, o.to);
    case 'restore-backup': return s.restoreBackup(o.from, o.to);
    default: { const e = new Error('invalid_arguments'); e.code = 'invalid_arguments'; throw e; }
  }
}

if (require.main === module) {
  process.umask(0o077);
  try {
    process.stdout.write(JSON.stringify({ ok: true, ...run(parse(process.argv.slice(2))) }) + '\n');
  } catch (e) {
    const known = ['invalid_arguments', 'invalid_ledger', 'not_suppressed', 'backup_mismatch', 'output_exists',
      'invalid_input', 'private_parent_required', 'repo_output_rejected'];
    process.stdout.write(JSON.stringify({ ok: false, reason: known.includes(e?.code || e?.message) ? (e.code || e.message) : 'invalid_ledger' }) + '\n');
    process.exitCode = 1;
  }
}
