'use strict';

// Usage: node scripts/jal-repd-ced-compare.cjs --before /local/snapshot-A --after /local/snapshot-B [--suppressions LEDGER_DIR]
// Read-only, offline; stdout contains only aggregate status or a fixed reason code.
const { compareBaselines } = require('../src/jal-repd-ced/compare-baselines.cjs');
const { readLedger, toReconcileInput } = require('../src/jal-repd-ced/suppressions.cjs');
const REASONS = new Set(['invalid_arguments', 'invalid_files', 'same_directory', 'invalid_schema',
  'invalid_source', 'invalid_time', 'invalid_endpoint', 'invalid_pagination', 'incomplete_scope',
  'invalid_counts', 'incomplete_pages', 'invalid_bounds', 'incomplete_run', 'invalid_manifest',
  'invalid_records', 'invalid_hashes', 'incompatible_snapshots', 'invalid_ledger']);

function parseArgs(args) {
  if (args.length === 1 && args[0] === '--help') return { help: true };
  if (args.length !== 4 && args.length !== 6) return null;
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    if (!['--before', '--after', '--suppressions'].includes(key) || options[key] || typeof args[index + 1] !== 'string'
      || !args[index + 1] || args[index + 1].startsWith('--')
      || /^https?:\/\//i.test(args[index + 1])) return null;
    options[key] = args[index + 1];
  }
  return options['--before'] && options['--after'] ? options : null;
}

function runCli(args) {
  const options = parseArgs(args);
  if (options?.help) {
    process.stdout.write('Usage: node scripts/jal-repd-ced-compare.cjs --before LOCAL_SNAPSHOT_A --after LOCAL_SNAPSHOT_B\n');
    return 0;
  }
  if (!options) {
    process.stdout.write('{"ok":false,"reason":"invalid_arguments"}\n');
    return 1;
  }
  try {
    const suppressions = options['--suppressions'] ? toReconcileInput(readLedger(options['--suppressions'])) : undefined;
    process.stdout.write(`${JSON.stringify(compareBaselines(options['--before'], options['--after'], { suppressions }))}\n`);
    return 0;
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ ok: false, reason: REASONS.has(error.code) ? error.code : 'invalid_files' })}\n`);
    return 1;
  }
}

if (require.main === module) process.exitCode = runCli(process.argv.slice(2));
module.exports = Object.freeze({ runCli });
