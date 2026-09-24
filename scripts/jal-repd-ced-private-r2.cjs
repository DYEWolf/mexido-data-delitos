'use strict';
const { upload, ensureLedgerRoot } = require('../src/jal-repd-ced/private-r2-upload.cjs');
const { makeWrangler } = require('../src/jal-repd-ced/wrangler-r2.cjs');
const { inspectValidatedAssets } = require('../src/jal-repd-ced/assets.cjs');
const BASE = '/Users/chris/Documents/seguridad-mexico/';
const PATHS = Object.freeze({
  '--baseline-dir': `${BASE}s2-second-baseline-20260923T214140Z`,
  '--output-dir': `${BASE}s2-assets-subset-100-v1`,
  '--ledger-dir': `${BASE}s2-assets-r2-89-v1`,
});
const REASONS = new Set(['invalid_arguments', 'invalid_selection', 'invalid_ledger', 'invalid_state',
  'invalid_input', 'repo_output_rejected', 'private_parent_required', 'output_exists', 'local_changed',
  'remote_conflict', 'remote_uncertain', 'put_uncertain', 'unsafe_bucket', 'byte_budget_exceeded',
  'deadline_exceeded', 'process_timeout', 'process_oversize', 'process_failed']);
const sampleLedger = (n) => `${BASE}s2-assets-r2-sample-${n}-v1`;
function parse(args) {
  const fields = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--resume' && !fields.resume && !fields.preflight) fields.resume = true;
    else if (args[i] === '--preflight' && !fields.preflight && !fields.resume) fields.preflight = true;
    else if (args[i] === '--sample' && fields.sample === undefined && /^[1-9]\d?$/.test(args[i + 1] ?? '')) fields.sample = Number(args[++i]);
    else if (Object.hasOwn(PATHS, args[i]) && !fields[args[i]] && args[i + 1]) fields[args[i]] = args[++i];
    else return null;
  }
  // A sample gets its own ledger so it never mixes with the full 89-image ledger.
  const expected = { ...PATHS, ...(fields.sample ? { '--ledger-dir': sampleLedger(fields.sample) } : {}) };
  if (fields.sample > 89 || Object.entries(expected).some(([flag, value]) => fields[flag] !== value)) return null;
  return { baselineDir: fields['--baseline-dir'], outputDir: fields['--output-dir'],
    ledgerDir: fields['--ledger-dir'], sample: fields.sample, resume: !!fields.resume, preflightOnly: !!fields.preflight };
}
async function main(args) {
  const settings = parse(args);
  if (!settings) { process.stdout.write('{"ok":false,"reason":"invalid_arguments"}\n'); return 1; }
  process.umask(0o077);
  try {
    const inspected = inspectValidatedAssets(settings);
    if (inspected.descriptors.length !== 89 ||
      inspected.descriptors.reduce((sum, d) => sum + d.size, 0) !== 8250929) {
      const error = new Error('invalid_selection'); error.code = 'invalid_selection'; throw error;
    }
    if (settings.preflightOnly) {
      ensureLedgerRoot(settings.ledgerDir, 'preflight');
      if (await makeWrangler(settings.ledgerDir).preflight('seguridad-jalisco-private') !== true) throw Error('unsafe_bucket');
      process.stdout.write('{"ok":true,"preflight":"private_no_expiration"}\n');
      return 0;
    }
    const started = Date.now();
    const result = await upload({ ...settings, client: makeWrangler(settings.ledgerDir) });
    process.stdout.write(JSON.stringify({ ...result, elapsedMs: Date.now() - started }) + '\n');
    return 0;
  } catch (e) {
    process.stdout.write(JSON.stringify({ ok: false, reason: REASONS.has(e?.code) ? e.code : 'invalid_state' }) + '\n');
    return 2;
  }
}
if (require.main === module) main(process.argv.slice(2)).then((code) => { process.exitCode = code; });
module.exports = Object.freeze({ main });
