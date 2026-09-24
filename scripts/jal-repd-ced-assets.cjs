'use strict';

// Local private subset only; no R2 operations, publishing or raw values on stdout.
const { runAssets, verifyAssets } = require('../src/jal-repd-ced/assets.cjs');
const REASONS = new Set(['invalid_arguments', 'invalid_files', 'invalid_schema', 'invalid_source',
  'invalid_time', 'invalid_endpoint', 'invalid_pagination', 'incomplete_scope', 'invalid_counts',
  'incomplete_pages', 'invalid_bounds', 'incomplete_run', 'invalid_manifest', 'invalid_records',
  'invalid_hashes', 'invalid_input', 'private_parent_required', 'repo_output_rejected',
  'output_exists', 'invalid_state']);
function parse(args) {
  if (args.length === 1 && args[0] === '--help') return { help: true };
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (['--resume', '--verify-only'].includes(args[i])) {
      if (options[args[i]]) return null;
      options[args[i]] = true;
    } else if (['--baseline-dir', '--output-dir', '--limit'].includes(args[i])) {
      if (options[args[i]] || !args[i + 1] || args[i + 1].startsWith('--')) return null;
      options[args[i]] = args[++i];
    } else return null;
  }
  if (!options['--baseline-dir'] || !options['--output-dir'] ||
    (options['--verify-only'] && !options['--resume']) ||
    (options['--limit'] && !/^(?:[1-9]|[1-9]\d|100)$/.test(options['--limit']))) return null;
  return { baselineDir: options['--baseline-dir'], outputDir: options['--output-dir'],
    limit: options['--limit'] ? Number(options['--limit']) : 100,
    resume: !!options['--resume'], verifyOnly: !!options['--verify-only'] };
}
async function runCli(args) {
  const options = parse(args);
  if (options?.help) {
    process.stdout.write('Usage: node scripts/jal-repd-ced-assets.cjs --baseline-dir LOCAL_COMPLETE_B --output-dir NEW_PRIVATE_DIR [--limit 1..100] [--resume [--verify-only]]\n');
    return 0;
  }
  if (!options) { process.stdout.write('{"ok":false,"reason":"invalid_arguments"}\n'); return 1; }
  try {
    process.umask(0o077);
    const { verifyOnly, ...settings } = options;
    const result = verifyOnly ? verifyAssets(settings) : await runAssets(settings);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return result.ok ? 0 : 2;
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ ok: false, reason: REASONS.has(error?.code) ? error.code : 'invalid_state' })}\n`);
    return 1;
  }
}
if (require.main === module) runCli(process.argv.slice(2)).then((status) => { process.exitCode = status; });
module.exports = Object.freeze({ runCli });
